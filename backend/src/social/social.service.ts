import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { toPublicCharacter } from '../common/types';

@Injectable()
export class SocialService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async getFeed(
    characterId: string | undefined,
    mode: 'following' | 'explore' = 'explore',
    cursor?: string,
    limit = 20,
  ) {
    let where: { deletedAt: null; characterId?: { in: string[] } } = { deletedAt: null };

    if (mode === 'following' && characterId) {
      const follows = await this.prisma.follow.findMany({
        where: { followerId: characterId },
        select: { followingId: true },
      });
      const followingIds = [...follows.map((f) => f.followingId), characterId];
      where = { deletedAt: null, characterId: { in: followingIds } };
    }

    const posts = await this.prisma.post.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: { character: true },
    });

    const hasMore = posts.length > limit;
    const data = hasMore ? posts.slice(0, limit) : posts;

    const formatted = await Promise.all(
      data.map(async (post) => {
        let isLiked = false;
        if (characterId) {
          const like = await this.prisma.like.findUnique({
            where: { postId_characterId: { postId: post.id, characterId } },
          });
          isLiked = !!like;
        }
        return {
          id: post.id,
          content: post.content,
          mediaUrls: post.mediaUrls,
          likeCount: post.likeCount,
          commentCount: post.commentCount,
          isLiked,
          character: toPublicCharacter(post.character),
          createdAt: post.createdAt,
        };
      }),
    );

    return {
      data: formatted,
      nextCursor: hasMore ? data[data.length - 1].id : null,
    };
  }

  async toggleFollow(followerId: string, username: string) {
    const target = await this.prisma.character.findUnique({
      where: { username: username.toLowerCase() },
    });
    if (!target) throw new NotFoundException('Character not found');
    if (target.id === followerId) throw new BadRequestException('Cannot follow yourself');

    const existing = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId: target.id } },
    });

    if (existing) {
      await this.prisma.follow.delete({ where: { id: existing.id } });
      return { following: false };
    }

    await this.prisma.follow.create({
      data: { followerId, followingId: target.id },
    });

    const follower = await this.prisma.character.findUnique({ where: { id: followerId } });
    await this.notifications.create(target.id, 'follow', {
      actorId: followerId,
      actorUsername: follower?.username,
      actorDisplayName: follower?.displayName,
      actorAvatarUrl: follower?.avatarUrl,
    });

    return { following: true };
  }
}
