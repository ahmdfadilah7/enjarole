import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePostDto, CreateCommentDto } from './dto/post.dto';
import { toPublicCharacter } from '../common/types';
import { hasTextContent } from '../common/utils/text';

@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async create(characterId: string, dto: CreatePostDto) {
    const content = dto.content ?? '';
    const mediaUrls = dto.mediaUrls ?? [];

    if (!hasTextContent(content) && mediaUrls.length === 0) {
      throw new BadRequestException('Posting harus berisi teks, emoticon, gambar, atau video');
    }

    const post = await this.prisma.post.create({
      data: {
        characterId,
        content,
        mediaUrls,
      },
      include: { character: true },
    });
    return this.formatPost(post, characterId);
  }

  async getById(postId: string, viewerId?: string) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      include: { character: true },
    });
    if (!post) throw new NotFoundException('Post not found');
    return this.formatPost(post, viewerId);
  }

  async toggleLike(postId: string, characterId: string) {
    const post = await this.prisma.post.findFirst({ where: { id: postId, deletedAt: null } });
    if (!post) throw new NotFoundException('Post not found');

    const existing = await this.prisma.like.findUnique({
      where: { postId_characterId: { postId, characterId } },
    });

    if (existing) {
      await this.prisma.$transaction([
        this.prisma.like.delete({ where: { id: existing.id } }),
        this.prisma.post.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } }),
      ]);
      const updated = await this.prisma.post.findUnique({ where: { id: postId } });
      return { liked: false, likeCount: updated?.likeCount || 0 };
    }

    await this.prisma.$transaction([
      this.prisma.like.create({ data: { postId, characterId } }),
      this.prisma.post.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } }),
    ]);

    if (post.characterId !== characterId) {
      const liker = await this.prisma.character.findUnique({ where: { id: characterId } });
      await this.notifications.create(post.characterId, 'like', {
        postId,
        actorId: characterId,
        actorUsername: liker?.username,
        actorDisplayName: liker?.displayName,
        actorAvatarUrl: liker?.avatarUrl,
      });
    }

    const updated = await this.prisma.post.findUnique({ where: { id: postId } });
    return { liked: true, likeCount: updated?.likeCount || 0 };
  }

  async addComment(postId: string, characterId: string, dto: CreateCommentDto) {
    const post = await this.prisma.post.findFirst({ where: { id: postId, deletedAt: null } });
    if (!post) throw new NotFoundException('Post not found');

    const [comment] = await this.prisma.$transaction([
      this.prisma.comment.create({
        data: { postId, characterId, content: dto.content },
        include: { character: true },
      }),
      this.prisma.post.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } }),
    ]);

    if (post.characterId !== characterId) {
      const commenter = await this.prisma.character.findUnique({ where: { id: characterId } });
      await this.notifications.create(post.characterId, 'comment', {
        postId,
        commentId: comment.id,
        actorId: characterId,
        actorUsername: commenter?.username,
        actorDisplayName: commenter?.displayName,
        actorAvatarUrl: commenter?.avatarUrl,
        content: dto.content,
      });
    }

    return {
      id: comment.id,
      content: comment.content,
      character: toPublicCharacter(comment.character),
      createdAt: comment.createdAt,
    };
  }

  async getComments(postId: string, cursor?: string, limit = 20) {
    const comments = await this.prisma.comment.findMany({
      where: { postId, deletedAt: null },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'asc' },
      include: { character: true },
    });

    const hasMore = comments.length > limit;
    const data = hasMore ? comments.slice(0, limit) : comments;

    return {
      data: data.map((c) => ({
        id: c.id,
        content: c.content,
        character: toPublicCharacter(c.character),
        createdAt: c.createdAt,
      })),
      nextCursor: hasMore ? data[data.length - 1].id : null,
    };
  }

  async deletePost(postId: string, characterId: string) {
    const post = await this.prisma.post.findFirst({ where: { id: postId, deletedAt: null } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.characterId !== characterId) throw new ForbiddenException('Not your post');

    await this.prisma.post.update({ where: { id: postId }, data: { deletedAt: new Date() } });
    return { success: true };
  }

  private async formatPost(
    post: {
      id: string;
      content: string;
      mediaUrls: unknown;
      likeCount: number;
      commentCount: number;
      createdAt: Date;
      character: Parameters<typeof toPublicCharacter>[0];
    },
    viewerId?: string,
  ) {
    let isLiked = false;
    if (viewerId) {
      const like = await this.prisma.like.findUnique({
        where: { postId_characterId: { postId: post.id, characterId: viewerId } },
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
  }
}
