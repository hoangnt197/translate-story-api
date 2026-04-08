import { Controller, Get, ParseEnumPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { TranslationProvider } from '../translation/dto/translate-provider.enum';
import { ModelResponseDto } from './dto/model-response.dto';
import { ModelsService } from './models.service';

@ApiTags('models')
@Controller('models')
export class ModelsController {
  constructor(private readonly modelsService: ModelsService) {}

  @Get()
  @ApiOperation({ summary: 'Get available models from Gemini and Ollama' })
  @ApiQuery({
    name: 'provider',
    enum: TranslationProvider,
    required: false,
    description: 'Filter models by provider',
  })
  @ApiOkResponse({ type: ModelResponseDto, isArray: true })
  getAvailableModels(
    @Query('provider', new ParseEnumPipe(TranslationProvider, { optional: true })) provider?: TranslationProvider,
  ): Promise<ModelResponseDto[]> {
    return this.modelsService.getAvailableModels(provider);
  }
}
