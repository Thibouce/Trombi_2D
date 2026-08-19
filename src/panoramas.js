// Décors disponibles dans le sélecteur de styles (miniatures cliquables).
// Pour ajouter / modifier un style : édite ce tableau et dépose l'image
// correspondante dans public/panoramas/ (référencée par /panoramas/<fichier>).
//
//  - src   : le panorama ÉQUIRECTANGULAIRE (projection 360°, ratio 2:1) dans
//            lequel on se projette au clic. L'EXTENSION EST FACULTATIVE : si tu
//            l'omets, l'app essaie png, jpg, jpeg, webp, avif, gif et garde
//            celle qui existe. Tu peux la forcer en la précisant (ex. .webp).
//  - thumb : (optionnel) image affichée en miniature ; par défaut = src.
//  - label : texte affiché sous la miniature.
export const STYLES = [
  { id: 'style-1', label: 'Style 1', src: '/panoramas/style-1' },
  { id: 'style-2', label: 'Style 2', src: '/panoramas/style-2' },
];
