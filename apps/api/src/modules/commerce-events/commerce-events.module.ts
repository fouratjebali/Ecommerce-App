import { Module } from '@nestjs/common';
import { CommerceEventsListener } from './commerce-events.listener';

@Module({
  providers: [CommerceEventsListener],
})
export class CommerceEventsModule {}
