import { handleIntegrateRequest } from './integrate.js';

// Plugin Vite : expose POST /api/integrate en développement, en gardant la
// clé API côté serveur (jamais dans le bundle client).
export function apiPlugin({ apiKey, model, options } = {}) {
  return {
    name: 'trombi-integrate-api',
    configureServer(server) {
      server.middlewares.use('/api/integrate', (req, res, next) => {
        if (req.method !== 'POST') return next();
        handleIntegrateRequest(req, res, { apiKey, model, options });
      });
    },
  };
}
