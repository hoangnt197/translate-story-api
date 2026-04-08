import { Module } from '@nestjs/common';
import { TranslationController } from './translation.controller';
import { OllamaClientService } from './providers/ollama-client.service';
import { TranslationService } from './translation.service';

@Module({
  controllers: [TranslationController],
  providers: [TranslationService, OllamaClientService],
})
export class TranslationModule {}
