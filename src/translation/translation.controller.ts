import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TranslateRequestDto } from './dto/translate-request.dto';
import { TranslateResponseDto } from './dto/translate-response.dto';
import { TranslationService } from './translation.service';

@ApiTags('translation')
@Controller('translate')
export class TranslationController {
  constructor(private readonly translationService: TranslationService) {}

  @Post()
  @ApiOperation({ summary: 'Translate story content using Ollama' })
  @ApiBody({ type: TranslateRequestDto })
  @ApiOkResponse({ type: TranslateResponseDto })
  translate(@Body() body: TranslateRequestDto): Promise<TranslateResponseDto> {
    return this.translationService.translateStory(body);
  }

  @Get('models')
  @ApiOperation({ summary: 'Get available Ollama models' })
  @ApiOkResponse({
    schema: {
      type: 'array',
      items: { type: 'string' },
      example: ['qwen2.5:7b', 'llama3.1:8b'],
    },
  })
  getAvailableModels(): Promise<string[]> {
    return this.translationService.getAvailableModels();
  }
}
