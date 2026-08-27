// Décors regroupés PAR ZONE. Chaque zone correspond à un point cliquable
// (hotspot) du hub 3D : le champ `zone` d'un hotspot (src/splat.js) pointe vers
// une clé de cet objet, et cliquer ce point propose les styles de la zone.
//
// Chaque style :
//  - id       : identifiant unique (sur TOUTES les zones).
//  - label    : texte affiché sous la miniature.
//  - src      : panorama ÉQUIRECTANGULAIRE (2:1). Extension FACULTATIVE (png, jpg,
//               webp, avif, gif essayés dans l'ordre) — voir resolveImage.
//  - thumb    : (optionnel) miniature dédiée ; par défaut = src.
//  - prompt   : (optionnel) prompt d'intégration SPÉCIFIQUE à ce style. S'il est
//               absent, le prompt par défaut du serveur (src/server/integrate.js)
//               est utilisé.
//  - styleRef : (optionnel) image de RÉFÉRENCE de style envoyée en plus au modèle.
//               Extension facultative. Ordre des images côté modèle :
//                 1) le décor,  2) la référence de style (si définie),  puis les visages.
export const PANORAMAS = {
  // Zone "bureau" : les panoramas déjà en place.
  bureau: [
    // Exemple avec prompt + référence de style dédiés :
    // {
    //   id: 'bureau-1', label: 'Style 1', src: '/panoramas/style-1',
    //   styleRef: '/panoramas/ref-style-1',
    //   prompt: 'The first image is the scene, the second is the style reference. Replace the face of a character with each provided face, matching the style reference.',
    // },
    { id: 'bureau-1', label: 'Felt', src: '/panoramas/style-felt' ,
      styleRef: '/panoramas/ref-style_felt' ,
      prompt : 'adapt the style of the face picture to the Felt style image, integrate the close up face on a character in the image respecting the characters Felt style, must respect Felt eyes style. Use the Felt image as style reference, character must set at the place of one of the characters in the office. Keep structure of the image' ,
    },
    { id: 'bureau-2', label: 'Comic', src: '/panoramas/style-2' },
    {
      id: 'bureau-3', label: 'Clay', src: '/panoramas/style-clay',
      styleRef: '/panoramas/ref-style-clay',
      prompt: 'adapt the style of the face picture to the clay style image, integrate the close up face on a character in the image respecting the characters clay style, must respect clay eyes style. Use the image with dog as style reference, character must set at the place of one of the characters in the office. Keep structure of the image',
    },
  ],

  // Zone "hall" : dépose tes panoramas du hall dans public/panoramas/
  // (ex. hall-1.png, hall-2.png) — l'extension est facultative.
  hall: [
    { id: 'hall-1', label: 'Style 1', src: '/panoramas/hall-1' },
    { id: 'hall-2', label: 'Style 2', src: '/panoramas/hall-2' },
  ],
};
