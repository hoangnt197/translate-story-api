export interface OllamaModelListResponse {
  models?: Array<{
    model?: string;
    name: string;
  }>;
}
