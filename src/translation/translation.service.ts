import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import type { TranslateRequestDto } from './dto/translate-request.dto';
import type { TranslateResponseDto } from './dto/translate-response.dto';
import type { OllamaChatResponse } from './interfaces/ollama-chat-response.interface';
import type { OllamaTagsResponse } from './interfaces/ollama-tags-response.interface';

@Injectable()
export class TranslationService {
  private readonly ollamaBaseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
  private readonly defaultModel = process.env.OLLAMA_MODEL ?? 'qwen2.5:7b';

  async translateStory(request: TranslateRequestDto): Promise<TranslateResponseDto> {
    if (!request?.text?.trim()) {
      throw new BadRequestException('The "text" field is required.');
    }

    const sourceLanguage = request.sourceLanguage ?? 'auto-detect';
    const targetLanguage = request.targetLanguage ?? 'Vietnamese';
    const model = request.model ?? this.defaultModel;

    const temperature = request.temperature ?? 0.2;

    if (temperature < 0 || temperature > 2) {
      throw new BadRequestException('"temperature" must be between 0 and 2.');
    }

    const response = await fetch(`${this.ollamaBaseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        stream: false,
        options: {
          temperature,
        },
        messages: [
          {
            role: 'system',
            content:
              'You are a professional novel translator. Keep tone, names, and formatting. Return translation only without explanations.',
          },
          {
            role: 'user',
            content: [
              `Source language: ${sourceLanguage}`,
              `Target language: ${targetLanguage}`,
              'Text to translate:',
              request.text,
            ].join('\n'),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new InternalServerErrorException(`Ollama request failed (${response.status}): ${errorBody}`);
    }

    const data = (await response.json()) as OllamaChatResponse;
    const translatedText = data.message?.content?.trim();

    if (!translatedText) {
      throw new InternalServerErrorException('Ollama returned an empty translation result.');
    }

    return {
      translatedText,
      sourceLanguage,
      targetLanguage,
      model: data.model ?? model,
    };
  }

  async getAvailableModels(): Promise<string[]> {
    const response = await fetch(`${this.ollamaBaseUrl}/api/tags`);

    if (!response.ok) {
      throw new InternalServerErrorException(`Could not fetch models from Ollama (${response.status}).`);
    }

    const data = (await response.json()) as OllamaTagsResponse;
    return (data.models ?? []).map((item) => item.name);
  }
}
