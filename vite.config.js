import { defineConfig, loadEnv } from 'vite';
import { apiPlugin } from './server/vite-api-plugin.js';
import { DEFAULT_MODEL, DEFAULT_IMAGE_SIZE, parseImageSize } from './server/integrate.js';

export default defineConfig(({ mode }) => {
  // Charge .env (toutes les clés, y compris sans préfixe VITE_) côté serveur dev.
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      apiPlugin({
        apiKey: env.FAL_KEY,
        model: env.FAL_MODEL || DEFAULT_MODEL,
        options: {
          imageSize: parseImageSize(env.FAL_IMAGE_SIZE) || DEFAULT_IMAGE_SIZE,
          quality: env.FAL_QUALITY || undefined,
          outputFormat: env.FAL_OUTPUT_FORMAT || 'jpeg',
        },
      }),
    ],
    server: { host: true, port: 5173 },
    build: {
      target: 'es2020',
      rollupOptions: {
        // Deux versions du projet, deux points d'entrée.
        input: {
          main: 'index.html', // version 1 personnage
          duo: 'duo.html', // version 2 personnages
        },
      },
    },
  };
});
