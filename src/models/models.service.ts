import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { TranslationProvider } from '../translation/dto/translate-provider.enum';
import type { GeminiModelListResponse } from './interfaces/gemini-model-list-response.interface';
import type { OllamaModelListResponse } from './interfaces/ollama-model-list-response.interface';
import type { ModelResponseDto } from './dto/model-response.dto';

@Injectable()
export class ModelsService {
  private readonly geminiBaseUrl = process.env.GEMINI_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta';
  private readonly ollamaBaseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';

  async getAvailableModels(provider?: TranslationProvider): Promise<ModelResponseDto[]> {
    if (provider === TranslationProvider.GEMINI) {
      return this.getGeminiModels();
    }

    if (provider === TranslationProvider.OLLAMA) {
      return this.getOllamaModels();
    }

    const [geminiModels, ollamaModels] = await Promise.all([this.getGeminiModels(), this.getOllamaModels()]);
    return [...geminiModels, ...ollamaModels];
  }

  private async getGeminiModels(): Promise<ModelResponseDto[]> {
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {
      return [];
    }

    const response = await fetch(`${this.geminiBaseUrl}/models?key=${apiKey}`);

    if (!response.ok) {
      throw new InternalServerErrorException(`Could not fetch models from Gemini (${response.status}).`);
    }

    const data = (await response.json()) as GeminiModelListResponse;

    return (data.models ?? [])
      .filter((item) => item.supportedGenerationMethods?.includes('generateContent'))
      .map((item) => {
        const id = this.normalizeGeminiModel(item.name);
        return {
          id,
          name: item.displayName ?? id,
          provider: TranslationProvider.GEMINI,
          type: 'text-generation',
        };
      });
  }

  private async getOllamaModels(): Promise<ModelResponseDto[]> {
    const response = await fetch(`${this.ollamaBaseUrl}/api/tags`);

    if (!response.ok) {
      throw new InternalServerErrorException(`Could not fetch models from Ollama (${response.status}).`);
    }

    const data = (await response.json()) as OllamaModelListResponse;

    return (data.models ?? []).map((item) => {
      const id = item.model ?? item.name;
      return {
        id,
        name: item.name,
        provider: TranslationProvider.OLLAMA,
        type: 'text-generation',
      };
    });
  }

  private normalizeGeminiModel(model: string): string {
    return model.startsWith('models/') ? model.slice('models/'.length) : model;
  }
}
