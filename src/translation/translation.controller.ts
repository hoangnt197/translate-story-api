import { Body, Controller, Post, Res } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { TranslateRequestDto } from './dto/translate-request.dto';
import { TranslateResponseDto } from './dto/translate-response.dto';
import { TranslationService } from './translation.service';

@ApiTags('translation')
@Controller('translate')
export class TranslationController {
  constructor(private readonly translationService: TranslationService) {}

  @Post()
  @ApiOperation({ summary: 'Translate story content using Gemini or Ollama' })
  @ApiBody({ type: TranslateRequestDto })
  @ApiOkResponse({ type: TranslateResponseDto })
  translate(@Body() body: TranslateRequestDto): Promise<TranslateResponseDto> {
    return this.translationService.translateStory(body);
  }

  @Post('stream')
  @ApiOperation({ summary: 'Translate story content with streaming using Gemini or Ollama' })
  @ApiBody({ type: TranslateRequestDto })
  @ApiProduces('text/event-stream')
  async translateStream(@Body() body: TranslateRequestDto, @Res() res: Response): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      for await (const chunk of this.translationService.translateStoryStream(body)) {
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }

      res.write('event: done\n');
      res.write('data: [DONE]\n\n');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown streaming error';
      res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`);
    } finally {
      res.end();
    }
  }
}
