import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsGateway } from '../events/events.gateway';
import { RedisService } from '../redis/redis.service';
import { toPublicCharacter } from '../common/types';

@Injectable()
export class MessagingService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private notifications: NotificationsService,
    @Inject(forwardRef(() => EventsGateway))
    private events: EventsGateway,
    private redis: RedisService,
  ) {}

  async getConversations(characterId: string) {
    const memberships = await this.prisma.conversationMember.findMany({
      where: { characterId },
      include: {
        conversation: {
          include: {
            members: { include: { character: true } },
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
      orderBy: { conversation: { updatedAt: 'desc' } },
    });

    return Promise.all(
      memberships.map(async (m) => {
        const otherMembers = m.conversation.members
          .filter((mem) => mem.characterId !== characterId)
          .map((mem) => toPublicCharacter(mem.character));

        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: m.conversationId,
            senderId: { not: characterId },
            isRead: false,
          },
        });

        const lastMessage = m.conversation.messages[0];

        return {
          id: m.conversation.id,
          participants: otherMembers,
          lastMessage: lastMessage
            ? {
                id: lastMessage.id,
                content: lastMessage.content,
                isRead: lastMessage.isRead,
                createdAt: lastMessage.createdAt,
              }
            : null,
          unreadCount,
        };
      }),
    );
  }

  async createConversation(characterId: string, username: string) {
    const target = await this.prisma.character.findUnique({
      where: { username: username.toLowerCase() },
    });
    if (!target) throw new NotFoundException('Character not found');
    if (target.id === characterId) throw new BadRequestException('Cannot message yourself');

    const myConversations = await this.prisma.conversationMember.findMany({
      where: { characterId },
      include: {
        conversation: {
          include: {
            members: { include: { character: true } },
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
    });

    const existing = myConversations.find((m) => {
      const memberIds = m.conversation.members.map((mem) => mem.characterId);
      return memberIds.length === 2 && memberIds.includes(target.id);
    })?.conversation;

    if (existing) {
      const otherMembers = existing.members
        .filter((m) => m.characterId !== characterId)
        .map((m) => toPublicCharacter(m.character));
      return {
        id: existing.id,
        participants: otherMembers,
        lastMessage: existing.messages[0] || null,
        unreadCount: 0,
      };
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        members: {
          create: [{ characterId }, { characterId: target.id }],
        },
      },
      include: { members: { include: { character: true } } },
    });

    const otherMembers = conversation.members
      .filter((m) => m.characterId !== characterId)
      .map((m) => toPublicCharacter(m.character));

    return { id: conversation.id, participants: otherMembers, lastMessage: null, unreadCount: 0 };
  }

  async getMessages(conversationId: string, characterId: string, cursor?: string, limit = 50) {
    await this.ensureMember(conversationId, characterId);

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: { sender: true },
    });

    const hasMore = messages.length > limit;
    const data = hasMore ? messages.slice(0, limit) : messages;

    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: characterId },
        isRead: false,
      },
      data: { isRead: true },
    });

    return {
      data: data.reverse().map((m) => ({
        id: m.id,
        content: m.content,
        sender: toPublicCharacter(m.sender),
        isRead: m.isRead,
        createdAt: m.createdAt,
      })),
      nextCursor: hasMore ? data[data.length - 1].id : null,
    };
  }

  async sendMessage(conversationId: string, senderId: string, content: string) {
    await this.ensureMember(conversationId, senderId);

    const message = await this.prisma.message.create({
      data: { conversationId, senderId, content },
      include: { sender: true },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    const formatted = {
      id: message.id,
      content: message.content,
      sender: toPublicCharacter(message.sender),
      isRead: message.isRead,
      createdAt: message.createdAt,
      conversationId,
    };

    const members = await this.prisma.conversationMember.findMany({
      where: { conversationId },
    });

    for (const member of members) {
      if (member.characterId !== senderId) {
        this.events.emitToCharacter(member.characterId, 'message:new', formatted);
        await this.notifications.create(member.characterId, 'message', {
          conversationId,
          actorId: senderId,
          actorUsername: message.sender.username,
          actorDisplayName: message.sender.displayName,
          actorAvatarUrl: message.sender.avatarUrl,
          content: content.substring(0, 100),
        });
      }
    }

    return formatted;
  }

  async setTyping(conversationId: string, characterId: string, isTyping: boolean) {
    await this.ensureMember(conversationId, characterId);
    const members = await this.prisma.conversationMember.findMany({
      where: { conversationId, characterId: { not: characterId } },
    });

    const event = isTyping ? 'typing:start' : 'typing:stop';
    for (const member of members) {
      this.events.emitToCharacter(member.characterId, event, { conversationId, characterId });
    }
  }

  async setOnline(characterId: string) {
    await this.redis.set(`presence:${characterId}`, 'online', 300);
    this.events.broadcastPresence(characterId, true);
  }

  async setOffline(characterId: string) {
    await this.redis.del(`presence:${characterId}`);
    this.events.broadcastPresence(characterId, false);
  }

  async isOnline(characterId: string): Promise<boolean> {
    const status = await this.redis.get(`presence:${characterId}`);
    return status === 'online';
  }

  private async ensureMember(conversationId: string, characterId: string) {
    const member = await this.prisma.conversationMember.findUnique({
      where: { conversationId_characterId: { conversationId, characterId } },
    });
    if (!member) throw new ForbiddenException('Not a member of this conversation');
  }
}
