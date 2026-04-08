import { ApiProperty } from '@nestjs/swagger';
import { TranslationProvider } from './translate-provider.enum';

export class TranslateResponseDto {
  @ApiProperty({ example: 'Anh trang trai dai tren ngoi lang cu.' })
  translatedText: string;

  @ApiProperty({ example: 'English' })
  sourceLanguage: string;

  @ApiProperty({ example: 'Vietnamese' })
  targetLanguage: string;

  @ApiProperty({ example: 'gemini-2.0-flash' })
  model: string;

  @ApiProperty({ enum: TranslationProvider, example: TranslationProvider.GEMINI })
  provider: TranslationProvider;
}
