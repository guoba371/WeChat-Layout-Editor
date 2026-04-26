export type AiLayoutMode = 'smooth' | 'faithful';

export type AiLayoutRuntimeConfig = {
  provider: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  temperature: number;
};

const env = import.meta.env;

export const aiLayoutConfig: AiLayoutRuntimeConfig = {
  provider: env.VITE_AI_PROVIDER || env.VITE_AI_LAYOUT_PROVIDER || 'openai-compatible',
  baseUrl: env.VITE_AI_BASE_URL || env.VITE_AI_LAYOUT_BASE_URL || 'https://api.openai.com/v1',
  model: env.VITE_AI_MODEL || env.VITE_AI_LAYOUT_MODEL || 'gpt-5.5',
  apiKey: env.VITE_AI_API_KEY || env.VITE_AI_LAYOUT_API_KEY || '',
  temperature: Number(env.VITE_AI_TEMPERATURE || env.VITE_AI_LAYOUT_TEMPERATURE || 0.25),
};

export function hasRemoteAiConfig() {
  return Boolean(aiLayoutConfig.baseUrl && aiLayoutConfig.model && aiLayoutConfig.apiKey);
}
