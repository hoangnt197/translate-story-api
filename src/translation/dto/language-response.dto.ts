import { ApiProperty } from '@nestjs/swagger';

export class LanguageResponseDto {
  @ApiProperty({ example: 'en' })
  code: string;

  @ApiProperty({ example: 'English' })
  name: string;

  @ApiProperty({ example: 'English' })
  nativeName: string;
}
