import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const rawBaseUrl = env.VITE_AI_BASE_URL || env.VITE_AI_LAYOUT_BASE_URL || 'https://api.openai.com/v1';
  const aiBaseUrl = new URL(rawBaseUrl);
  const target = aiBaseUrl.origin;
  let apiBasePath = aiBaseUrl.pathname.replace(/\/$/, '');

  if (!apiBasePath || apiBasePath === '/') apiBasePath = '/v1';
  if (!apiBasePath.endsWith('/v1')) apiBasePath = `${apiBasePath}/v1`;

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/ai-api': {
          target,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => `${apiBasePath}${path.replace(/^\/ai-api/, '')}`,
        },
      },
    },
  };
});
