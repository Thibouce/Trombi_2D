import { defineConfig, loadEnv } from 'vite';
import { apiPlugin } from './server/vite-api-plugin.js';
import { DEFAULT_MODEL } from './server/integrate.js';

export default defineConfig(({ mode }) => {
  // Charge .env (toutes les clés, y compris sans préfixe VITE_) côté serveur dev.
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      apiPlugin({
        apiKey: env.GEMINI_API_KEY,
        model: env.GEMINI_MODEL || DEFAULT_MODEL,
      }),
    ],
    server: { host: true, port: 5173 },
    build: { target: 'es2020' },
  };
});
