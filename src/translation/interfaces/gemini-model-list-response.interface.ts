export interface GeminiModelListResponse {
  models?: Array<{
    name: string;
    supportedGenerationMethods?: string[];
  }>;
}
