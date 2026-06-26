import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { toPublicCharacter } from '../common/types';

export interface CreateStoryInput {
  mediaType: 'image' | 'video' | 'text';
  mediaUrl?: string;
  textContent?: string;
  backgroundColor?: string;
  duration?: number;
}

function formatStory(story: {
  id: string;
  mediaUrl: string | null;
  mediaType: string;
  textContent: string | null;
  backgroundColor: string | null;
  duration: number | null;
  expiresAt: Date;
  createdAt: Date;
}) {
  return {
    id: story.id,
    mediaUrl: story.mediaUrl,
    mediaType: story.mediaType,
    textContent: story.textContent,
    backgroundColor: story.backgroundColor,
    duration: story.duration,
    expiresAt: story.expiresAt,
    createdAt: story.createdAt,
  };
}

@Injectable()
export class StoriesService {
  constructor(private prisma: PrismaService) {}

  async create(characterId: string, dto: CreateStoryInput) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const story = await this.prisma.story.create({
      data: {
        characterId,
        mediaUrl: dto.mediaUrl || null,
        mediaType: dto.mediaType,
        textContent: dto.textContent?.trim() || null,
        backgroundColor: dto.backgroundColor || null,
        duration: dto.mediaType === 'video' ? dto.duration || null : null,
        expiresAt,
      },
      include: { character: true },
    });

    return {
      ...formatStory(story),
      character: toPublicCharacter(story.character),
    };
  }

  async getFeed(characterId: string) {
    const follows = await this.prisma.follow.findMany({
      where: { followerId: characterId },
      select: { followingId: true },
    });
    const characterIds = [...follows.map((f) => f.followingId), characterId];
    const now = new Date();

    const stories = await this.prisma.story.findMany({
      where: {
        characterId: { in: characterIds },
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'asc' },
      include: { character: true },
    });

    const grouped = new Map<string, { character: ReturnType<typeof toPublicCharacter>; stories: typeof stories }>();

    for (const story of stories) {
      const key = story.characterId;
      if (!grouped.has(key)) {
        grouped.set(key, {
          character: toPublicCharacter(story.character),
          stories: [],
        });
      }
      grouped.get(key)!.stories.push(story);
    }

    return Array.from(grouped.values()).map((g) => ({
      character: g.character,
      stories: g.stories.map(formatStory),
    }));
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpired() {
    await this.prisma.story.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }
}
