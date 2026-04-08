import { ApiProperty } from '@nestjs/swagger';
import { TranslationProvider } from '../../translation/dto/translate-provider.enum';

export class ModelResponseDto {
  @ApiProperty({ example: 'gemini-2.0-flash' })
  id: string;

  @ApiProperty({ example: 'Gemini 2.0 Flash' })
  name: string;

  @ApiProperty({ enum: TranslationProvider, example: TranslationProvider.GEMINI })
  provider: TranslationProvider;

  @ApiProperty({ example: 'text-generation' })
  type: string;
}
