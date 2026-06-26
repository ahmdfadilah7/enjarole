import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCharacterDto } from './dto/update-character.dto';
import { toPublicCharacter } from '../common/types';

@Injectable()
export class CharactersService {
  constructor(private prisma: PrismaService) {}

  async getMe(characterId: string) {
    const character = await this.prisma.character.findUnique({ where: { id: characterId } });
    if (!character) throw new NotFoundException('Character not found');

    const [postCount, followerCount, followingCount] = await Promise.all([
      this.prisma.post.count({ where: { characterId: character.id, deletedAt: null } }),
      this.prisma.follow.count({ where: { followingId: character.id } }),
      this.prisma.follow.count({ where: { followerId: character.id } }),
    ]);

    return {
      ...toPublicCharacter(character),
      postCount,
      followerCount,
      followingCount,
    };
  }

  async updateMe(characterId: string, dto: UpdateCharacterDto) {
    const current = await this.prisma.character.findUnique({ where: { id: characterId } });
    if (!current) throw new NotFoundException('Character not found');

    const data: {
      username?: string;
      displayName?: string;
      bio?: string;
      backstory?: string;
      avatarUrl?: string;
      personalityTraits?: string[];
    } = {};

    if (dto.displayName !== undefined) data.displayName = dto.displayName;
    if (dto.bio !== undefined) data.bio = dto.bio;
    if (dto.backstory !== undefined) data.backstory = dto.backstory;
    if (dto.avatarUrl !== undefined) data.avatarUrl = dto.avatarUrl;
    if (dto.personalityTraits !== undefined) data.personalityTraits = dto.personalityTraits;

    if (dto.username !== undefined) {
      const normalized = dto.username.toLowerCase();
      if (normalized !== current.username) {
        const taken = await this.prisma.character.findUnique({
          where: { username: normalized },
        });
        if (taken) {
          throw new ConflictException('Username sudah digunakan');
        }
        data.username = normalized;
      }
    }

    const character = await this.prisma.character.update({
      where: { id: characterId },
      data,
    });
    return toPublicCharacter(character);
  }

  async checkUsernameAvailable(username: string, currentCharacterId: string) {
    const normalized = username?.trim().toLowerCase();
    if (!normalized || normalized.length < 3 || !/^[a-zA-Z0-9_]+$/.test(normalized)) {
      return { available: false };
    }

    const existing = await this.prisma.character.findUnique({
      where: { username: normalized },
    });

    return { available: !existing || existing.id === currentCharacterId };
  }

  async getByUsername(username: string, viewerId?: string) {
    const character = await this.prisma.character.findUnique({
      where: { username: username.toLowerCase() },
    });
    if (!character || !character.isActive) {
      throw new NotFoundException('Character not found');
    }

    const [postCount, followerCount, followingCount, isFollowing] = await Promise.all([
      this.prisma.post.count({ where: { characterId: character.id, deletedAt: null } }),
      this.prisma.follow.count({ where: { followingId: character.id } }),
      this.prisma.follow.count({ where: { followerId: character.id } }),
      viewerId
        ? this.prisma.follow
            .findUnique({
              where: { followerId_followingId: { followerId: viewerId, followingId: character.id } },
            })
            .then((f) => !!f)
        : Promise.resolve(false),
    ]);

    return {
      ...toPublicCharacter(character),
      postCount,
      followerCount,
      followingCount,
      isFollowing,
    };
  }

  async getPostsByUsername(username: string, cursor?: string, limit = 20, viewerId?: string) {
    const character = await this.prisma.character.findUnique({
      where: { username: username.toLowerCase() },
    });
    if (!character) throw new NotFoundException('Character not found');

    const posts = await this.prisma.post.findMany({
      where: { characterId: character.id, deletedAt: null },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: { character: true },
    });

    const hasMore = posts.length > limit;
    const data = hasMore ? posts.slice(0, limit) : posts;

    const likedIds = viewerId && data.length
      ? new Set(
          (
            await this.prisma.like.findMany({
              where: {
                characterId: viewerId,
                postId: { in: data.map((p) => p.id) },
              },
              select: { postId: true },
            })
          ).map((l) => l.postId),
        )
      : new Set<string>();

    return {
      data: data.map((p) => ({
        id: p.id,
        content: p.content,
        mediaUrls: p.mediaUrls,
        likeCount: p.likeCount,
        commentCount: p.commentCount,
        isLiked: likedIds.has(p.id),
        createdAt: p.createdAt,
        character: toPublicCharacter(p.character),
      })),
      nextCursor: hasMore ? data[data.length - 1].id : null,
    };
  }

  async getFollowers(username: string, viewerId?: string) {
    const character = await this.findByUsername(username);
    const follows = await this.prisma.follow.findMany({
      where: { followingId: character.id },
      include: { follower: true },
      orderBy: { createdAt: 'desc' },
    });
    const followers = follows.map((f) => toPublicCharacter(f.follower));
    return this.withFollowingStatus(followers, viewerId);
  }

  async getFollowing(username: string, viewerId?: string) {
    const character = await this.findByUsername(username);
    const follows = await this.prisma.follow.findMany({
      where: { followerId: character.id },
      include: { following: true },
      orderBy: { createdAt: 'desc' },
    });
    const following = follows.map((f) => toPublicCharacter(f.following));
    return this.withFollowingStatus(following, viewerId);
  }

  async getSuggested(viewerId?: string, limit = 3) {
    const excludeIds: string[] = [];
    if (viewerId) {
      excludeIds.push(viewerId);
      const following = await this.prisma.follow.findMany({
        where: { followerId: viewerId },
        select: { followingId: true },
      });
      excludeIds.push(...following.map((f) => f.followingId));
    }

    const candidates = await this.prisma.character.findMany({
      where: {
        isActive: true,
        ...(excludeIds.length ? { id: { notIn: excludeIds } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    const shuffled = candidates.sort(() => Math.random() - 0.5).slice(0, limit);
    const withCounts = await Promise.all(
      shuffled.map(async (c) => {
        const followerCount = await this.prisma.follow.count({ where: { followingId: c.id } });
        return { ...toPublicCharacter(c), followerCount };
      }),
    );

    return this.withFollowingStatus(withCounts, viewerId);
  }

  async search(query: string, viewerId?: string, limit = 8) {
    const q = query?.trim();
    if (!q) return [];

    const characters = await this.prisma.character.findMany({
      where: {
        isActive: true,
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { displayName: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { displayName: 'asc' },
    });

    return this.withFollowingStatus(characters.map((c) => toPublicCharacter(c)), viewerId);
  }

  private async withFollowingStatus<T extends { id: string }>(characters: T[], viewerId?: string) {
    if (!viewerId || !characters.length) {
      return characters.map((c) => ({ ...c, isFollowing: false }));
    }

    const followed = await this.prisma.follow.findMany({
      where: {
        followerId: viewerId,
        followingId: { in: characters.map((c) => c.id) },
      },
      select: { followingId: true },
    });
    const followedIds = new Set(followed.map((f) => f.followingId));

    return characters.map((c) => ({
      ...c,
      isFollowing: followedIds.has(c.id),
    }));
  }

  private async findByUsername(username: string) {
    const character = await this.prisma.character.findUnique({
      where: { username: username.toLowerCase() },
    });
    if (!character) throw new NotFoundException('Character not found');
    return character;
  }
}
