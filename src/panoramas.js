// Décors regroupés PAR ZONE. Chaque zone correspond à un point cliquable
// (hotspot) du hub 3D : le champ `zone` d'un hotspot (src/splat.js) pointe vers
// une clé de cet objet, et cliquer ce point propose les styles de la zone.
//
// Chaque style :
//  - id    : identifiant unique (sur TOUTES les zones).
//  - label : texte affiché sous la miniature.
//  - src   : panorama ÉQUIRECTANGULAIRE (2:1). Extension FACULTATIVE (png, jpg,
//            webp, avif, gif essayés dans l'ordre) — voir resolveImage.
//  - thumb : (optionnel) miniature dédiée ; par défaut = src.
export const PANORAMAS = {
  // Zone "bureau" : les panoramas déjà en place.
  bureau: [
    { id: 'bureau-1', label: 'Style 1', src: '/panoramas/style-1' },
    { id: 'bureau-2', label: 'Style 2', src: '/panoramas/style-2' },
  ],

  // Zone "hall" : dépose tes panoramas du hall dans public/panoramas/
  // (ex. hall-1.png, hall-2.png) — l'extension est facultative.
  hall: [
    { id: 'hall-1', label: 'Style 1', src: '/panoramas/hall-1' },
    { id: 'hall-2', label: 'Style 2', src: '/panoramas/hall-2' },
  ],
};
