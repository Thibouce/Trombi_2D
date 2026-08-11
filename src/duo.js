import { initApp } from './app.js';

// Version "deux personnages" : on ajoute jusqu'à 2 visages, puis intégration
// en un seul appel (deux références pour gpt-image-2).
initApp({ maxPeople: 2 });
