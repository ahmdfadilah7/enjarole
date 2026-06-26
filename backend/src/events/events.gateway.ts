import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { MessagingService } from '../messaging/messaging.service';
import { resolveCorsOrigin } from '../common/cors-origin';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: resolveCorsOrigin(),
    credentials: true,
  },
  namespace: '/events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private characterSockets = new Map<string, Set<string>>();

  constructor(
    private jwt: JwtService,
    private config: ConfigService,
    @Inject(forwardRef(() => MessagingService))
    private messaging: MessagingService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwt.verify(token, {
        secret: this.config.get<string>('JWT_SECRET'),
      });

      const characterId = payload.sub as string;
      client.data.characterId = characterId;

      if (!this.characterSockets.has(characterId)) {
        this.characterSockets.set(characterId, new Set());
      }
      this.characterSockets.get(characterId)!.add(client.id);

      await this.messaging.setOnline(characterId);
      client.join(`character:${characterId}`);
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const characterId = client.data.characterId as string | undefined;
    if (!characterId) return;

    const sockets = this.characterSockets.get(characterId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.characterSockets.delete(characterId);
        await this.messaging.setOffline(characterId);
      }
    }
  }

  emitToCharacter(characterId: string, event: string, data: unknown) {
    this.server.to(`character:${characterId}`).emit(event, data);
  }

  broadcastPresence(characterId: string, online: boolean) {
    this.server.emit(online ? 'presence:online' : 'presence:offline', { characterId });
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const characterId = client.data.characterId as string;
    if (characterId && data.conversationId) {
      this.messaging.setTyping(data.conversationId, characterId, true);
    }
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const characterId = client.data.characterId as string;
    if (characterId && data.conversationId) {
      this.messaging.setTyping(data.conversationId, characterId, false);
    }
  }

  @SubscribeMessage('message:read')
  handleMessageRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const characterId = client.data.characterId as string;
    if (characterId && data.conversationId) {
      this.emitToCharacter(characterId, 'message:read', {
        conversationId: data.conversationId,
        characterId,
      });
    }
  }
}
