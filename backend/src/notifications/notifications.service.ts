import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => EventsGateway))
    private events: EventsGateway,
  ) {}

  async create(recipientId: string, type: string, payload: Record<string, unknown>) {
    const notification = await this.prisma.notification.create({
      data: { recipientId, type, payload: payload as Prisma.InputJsonValue },
    });

    const unreadCount = await this.prisma.notification.count({
      where: { recipientId, isRead: false },
    });

    this.events.emitToCharacter(recipientId, 'notification:new', {
      ...notification,
      unreadCount,
    });

    return notification;
  }

  async getAll(characterId: string, cursor?: string, limit = 20) {
    const notifications = await this.prisma.notification.findMany({
      where: { recipientId: characterId },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = notifications.length > limit;
    const data = hasMore ? notifications.slice(0, limit) : notifications;

    const unreadCount = await this.prisma.notification.count({
      where: { recipientId: characterId, isRead: false },
    });

    return {
      data,
      nextCursor: hasMore ? data[data.length - 1].id : null,
      unreadCount,
    };
  }

  async markAllRead(characterId: string) {
    await this.prisma.notification.updateMany({
      where: { recipientId: characterId, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }

  async markRead(notificationId: string, characterId: string) {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, recipientId: characterId },
      data: { isRead: true },
    });
    return { success: true };
  }
}
