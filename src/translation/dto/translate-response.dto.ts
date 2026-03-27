import { ApiProperty } from '@nestjs/swagger';

export class TranslateResponseDto {
  @ApiProperty({ example: 'Anh trang trai dai tren ngoi lang cu.' })
  translatedText: string;

  @ApiProperty({ example: 'English' })
  sourceLanguage: string;

  @ApiProperty({ example: 'Vietnamese' })
  targetLanguage: string;

  @ApiProperty({ example: 'qwen2.5:7b' })
  model: string;
}
