import { Injectable, InternalServerErrorException } from '@nestjs/common';
import type { TranslateRequestDto } from './dto/translate-request.dto';
import type { TranslateResponseDto } from './dto/translate-response.dto';
import { TranslationProvider } from './dto/translate-provider.enum';
import type { GeminiGenerateContentResponse } from './interfaces/gemini-generate-content-response.interface';
import { OllamaClientService } from './providers/ollama-client.service';

@Injectable()
export class TranslationService {
  private readonly geminiBaseUrl = process.env.GEMINI_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta';
  private readonly defaultGeminiModel = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
  private readonly defaultOllamaModel = process.env.OLLAMA_MODEL ?? 'llama3.2';

  constructor(private readonly ollamaClientService: OllamaClientService) {}

  private getApiKey(): string {
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {
      throw new InternalServerErrorException('Missing GEMINI_API_KEY. Please configure it in your environment.');
    }

    return apiKey;
  }

  private normalizeModel(model: string): string {
    return model.startsWith('models/') ? model.slice('models/'.length) : model;
  }

  private resolveProvider(request: TranslateRequestDto): TranslationProvider {
    return request.provider ?? TranslationProvider.GEMINI;
  }

  private resolveModel(request: TranslateRequestDto, provider: TranslationProvider): string {
    const requestedModel = request.model;

    if (provider === TranslationProvider.OLLAMA) {
      return requestedModel ?? this.defaultOllamaModel;
    }

    return this.normalizeModel(requestedModel ?? this.defaultGeminiModel);
  }

  private buildPrompt(request: TranslateRequestDto): string {
    const sourceLanguage = request.sourceLanguage ?? 'auto-detect';
    const targetLanguage = request.targetLanguage ?? 'Vietnamese';

    return [
      `Source language: ${sourceLanguage}`,
      `Target language: ${targetLanguage}`,
      'Text to translate:',
      request.text,
    ].join('\n');
  }

  private buildGeminiRequestBody(request: TranslateRequestDto): string {
    const temperature = request.temperature ?? 0.2;

    return JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text: 'You are a professional novel translator. Keep tone, names, and formatting. Return translation only without explanations.',
          },
        ],
      },
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: this.buildPrompt(request),
            },
          ],
        },
      ],
      generationConfig: {
        temperature,
      },
    });
  }

  private extractTextFromResponse(data: GeminiGenerateContentResponse): string {
    return (
      data.candidates
        ?.flatMap((candidate) => candidate.content?.parts ?? [])
        .map((part) => part.text ?? '')
        .join('')
        .trim() ?? ''
    );
  }

  async translateStory(request: TranslateRequestDto): Promise<TranslateResponseDto> {
    const sourceLanguage = request.sourceLanguage ?? 'auto-detect';
    const targetLanguage = request.targetLanguage ?? 'Vietnamese';
    const provider = this.resolveProvider(request);
    const model = this.resolveModel(request, provider);
    const temperature = request.temperature ?? 0.2;

    if (provider === TranslationProvider.OLLAMA) {
      const result = await this.ollamaClientService.translate({
        model,
        prompt: this.buildPrompt(request),
        temperature,
      });

      return {
        translatedText: result.translatedText,
        sourceLanguage,
        targetLanguage,
        model: result.model,
        provider,
      };
    }

    const apiKey = this.getApiKey();

    const response = await fetch(
      `${this.geminiBaseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: this.buildGeminiRequestBody(request),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new InternalServerErrorException(`Gemini request failed (${response.status}): ${errorBody}`);
    }

    const data = (await response.json()) as GeminiGenerateContentResponse;
    const translatedText = this.extractTextFromResponse(data);

    if (!translatedText) {
      throw new InternalServerErrorException('Gemini returned an empty translation result.');
    }

    return {
      translatedText,
      sourceLanguage,
      targetLanguage,
      model,
      provider,
    };
  }

  async *translateStoryStream(request: TranslateRequestDto): AsyncGenerator<string, void, undefined> {
    const provider = this.resolveProvider(request);
    const model = this.resolveModel(request, provider);

    if (provider === TranslationProvider.OLLAMA) {
      const temperature = request.temperature ?? 0.2;
      for await (const chunk of this.ollamaClientService.streamTranslate({
        model,
        prompt: this.buildPrompt(request),
        temperature,
      })) {
        yield chunk;
      }

      return;
    }

    const apiKey = this.getApiKey();

    const response = await fetch(
      `${this.geminiBaseUrl}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: this.buildGeminiRequestBody(request),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new InternalServerErrorException(`Gemini request failed (${response.status}): ${errorBody}`);
    }

    if (!response.body) {
      throw new InternalServerErrorException('Gemini stream did not return a response body.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || !line.startsWith('data:')) {
          continue;
        }

        const payload = line.slice('data:'.length).trim();
        if (!payload || payload === '[DONE]') {
          continue;
        }

        const parsed = this.parseStreamLine(payload);
        if (!parsed) {
          continue;
        }

        const content = this.extractTextFromResponse(parsed);
        if (content) {
          yield content;
        }
      }
    }

    const finalLine = buffer.trim();
    if (!finalLine || !finalLine.startsWith('data:')) {
      return;
    }

    const payload = finalLine.slice('data:'.length).trim();
    if (!payload || payload === '[DONE]') {
      return;
    }

    const parsed = this.parseStreamLine(payload);
    if (parsed) {
      const content = this.extractTextFromResponse(parsed);
      if (content) {
        yield content;
      }
    }
  }

  private parseStreamLine(line: string): GeminiGenerateContentResponse | null {
    try {
      return JSON.parse(line) as GeminiGenerateContentResponse;
    } catch {
      return null;
    }
  }
}
