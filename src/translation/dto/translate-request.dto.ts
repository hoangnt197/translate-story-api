import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TranslationProvider } from './translate-provider.enum';

export class TranslateRequestDto {
  @ApiProperty({ example: 'The moonlight spread across the old village.' })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiPropertyOptional({ example: 'English' })
  @IsOptional()
  @IsString()
  sourceLanguage?: string;

  @ApiPropertyOptional({ example: 'Vietnamese' })
  @IsOptional()
  @IsString()
  targetLanguage?: string;

  @ApiPropertyOptional({ example: 'gemini-2.0-flash' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({
    example: TranslationProvider.GEMINI,
    enum: TranslationProvider,
    description: 'Translation provider. Defaults to gemini when omitted.',
  })
  @IsOptional()
  @IsEnum(TranslationProvider)
  provider?: TranslationProvider;

  @ApiPropertyOptional({ example: 0.2, minimum: 0, maximum: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;
}
