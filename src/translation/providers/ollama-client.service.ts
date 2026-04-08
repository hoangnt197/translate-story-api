import { Injectable, InternalServerErrorException } from '@nestjs/common';
import type { OllamaGenerateResponse } from '../interfaces/ollama-generate-response.interface';

export interface OllamaTranslateRequest {
  model: string;
  prompt: string;
  temperature: number;
}

@Injectable()
export class OllamaClientService {
  private readonly ollamaBaseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';

  async translate(request: OllamaTranslateRequest): Promise<{ translatedText: string; model: string }> {
    const response = await fetch(`${this.ollamaBaseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model,
        prompt: request.prompt,
        stream: false,
        options: {
          temperature: request.temperature,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new InternalServerErrorException(`Ollama request failed (${response.status}): ${errorBody}`);
    }

    const data = (await response.json()) as OllamaGenerateResponse;
    const translatedText = data.response?.trim() ?? '';

    if (!translatedText) {
      throw new InternalServerErrorException('Ollama returned an empty translation result.');
    }

    return {
      translatedText,
      model: data.model ?? request.model,
    };
  }

  async *streamTranslate(request: OllamaTranslateRequest): AsyncGenerator<string, void, undefined> {
    const response = await fetch(`${this.ollamaBaseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model,
        prompt: request.prompt,
        stream: true,
        options: {
          temperature: request.temperature,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new InternalServerErrorException(`Ollama stream request failed (${response.status}): ${errorBody}`);
    }

    if (!response.body) {
      throw new InternalServerErrorException('Ollama stream did not return a response body.');
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
        if (!line) {
          continue;
        }

        const parsed = this.parseLine(line);
        if (!parsed?.response) {
          continue;
        }

        const chunk = parsed.response.trim();
        if (chunk) {
          yield chunk;
        }
      }
    }

    const finalLine = buffer.trim();
    if (!finalLine) {
      return;
    }

    const parsed = this.parseLine(finalLine);
    const chunk = parsed?.response?.trim() ?? '';
    if (chunk) {
      yield chunk;
    }
  }

  private parseLine(line: string): OllamaGenerateResponse | null {
    try {
      return JSON.parse(line) as OllamaGenerateResponse;
    } catch {
      return null;
    }
  }
}
