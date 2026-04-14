import { Module } from '@nestjs/common';
import { CraftmindController } from './craftmind.controller';
import { CraftmindProviderService } from './craftmind-provider.service';
import { CraftmindRetrievalService } from './craftmind-retrieval.service';
import { CraftmindService } from './craftmind.service';

@Module({
  controllers: [CraftmindController],
  providers: [
    CraftmindService,
    CraftmindRetrievalService,
    CraftmindProviderService,
  ],
})
export class CraftmindModule {}
