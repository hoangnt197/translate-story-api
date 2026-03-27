export interface OllamaChatResponse {
  model: string;
  message?: {
    role: string;
    content: string;
  };
}
