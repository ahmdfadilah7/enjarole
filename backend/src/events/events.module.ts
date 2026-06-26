import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EventsGateway } from './events.gateway';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [JwtModule.register({}), forwardRef(() => MessagingModule)],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
