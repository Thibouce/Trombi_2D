// Handler d'intégration d'image, indépendant du framework.
// Il reçoit la photo de la personne + le panorama équirectangulaire des locaux,
// puis demande à GPT Image 2 (via fal.ai) de fondre la personne dans la scène,
// en conservant la projection 360° équirectangulaire (ratio 2:1).
//
// La clé API fal.ai est lue côté serveur uniquement : elle ne transite jamais
// par le navigateur.

// Endpoint synchrone fal.ai (attend le résultat). Modèle surchargeable via FAL_MODEL.
const FAL_RUN = 'https://fal.run';
export const DEFAULT_MODEL = 'openai/gpt-image-2/edit';

// Taille de sortie par défaut : 3840×1920 (4K, ratio 2:1) — résolution maximale
// pour préserver l'équirectangulaire. gpt-image-2/edit accepte soit un objet
// {width,height}, soit un enum (ex. "landscape_16_9"). Surchargeable via FAL_IMAGE_SIZE.
export const DEFAULT_IMAGE_SIZE = { width: 3840, height: 1920 };

// Convertit une valeur d'env en image_size : "1536x768" -> {width,height},
// sinon renvoie la chaîne telle quelle (enum), ou undefined si vide.
export function parseImageSize(value) {
  if (!value) return undefined;
  if (typeof value !== 'string') return value;
  const m = /^(\d+)\s*[x×]\s*(\d+)$/i.exec(value.trim());
  if (m) return { width: Number(m[1]), height: Number(m[2]) };
  return value.trim(); // enum
}

const DEFAULT_PROMPT = `Tu édites une image panoramique équirectangulaire 360° (ratio 2:1) d'un lieu de bureau.
La PREMIÈRE image est la scène équirectangulaire (les locaux).
Les images SUIVANTES sont des personnes différentes (une personne par image).

Objectif : intègre CHACUNE de ces personnes dans la scène de façon réaliste,
comme si elles se tenaient naturellement debout dans ces locaux. Respecte impérativement :
- la projection ÉQUIRECTANGULAIRE 360° et le ratio 2:1 de l'image de sortie ;
- l'échelle humaine (taille réaliste, pieds au niveau du sol) ;
- la perspective, l'éclairage, la balance des couleurs et les ombres portées de la scène ;
- répartis les personnes dans des zones dégagées, sans qu'elles se chevauchent ;
- le reste du décor doit rester INCHANGÉ (n'ajoute rien d'autre que ces personnes).

Rends une seule image équirectangulaire finale contenant toutes les personnes.`;

// Récupère l'image générée (URL fal.media) et la renvoie en data URL, pour que
// le client reçoive une image same-origin (pas de souci CORS pour la texture).
async function fetchAsDataUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Téléchargement du résultat échoué (${res.status}).`);
  const buf = Buffer.from(await res.arrayBuffer());
  const mime = res.headers.get('content-type') || 'image/jpeg';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

// Appelle fal.ai (GPT Image 2 edit) et renvoie une data URL de l'image générée.
export async function integrate({
  apiKey,
  model = DEFAULT_MODEL,
  personDataUrl, // rétrocompat : une seule personne
  personDataUrls, // plusieurs personnes (références supplémentaires)
  sceneDataUrl,
  prompt = DEFAULT_PROMPT,
  imageSize = DEFAULT_IMAGE_SIZE,
  quality, // "low" | "medium" | "high" | "auto" (optionnel)
  outputFormat = 'jpeg',
}) {
  if (!apiKey) {
    const err = new Error(
      "Clé API manquante. Renseigne FAL_KEY dans un fichier .env (voir .env.example)."
    );
    err.status = 500;
    throw err;
  }

  const persons = (personDataUrls?.length ? personDataUrls : [personDataUrl]).filter(Boolean);
  if (!sceneDataUrl || persons.length === 0) {
    const err = new Error('Images manquantes (scène et/ou au moins une personne).');
    err.status = 400;
    throw err;
  }
  // gpt-image-2/edit accepte au maximum 16 images d'entrée (scène incluse).
  if (persons.length > 15) {
    const err = new Error('Trop de personnes (maximum 15 par intégration).');
    err.status = 400;
    throw err;
  }

  const body = {
    prompt,
    // Ordre attendu par le prompt : [scène, personne1, personne2, ...].
    image_urls: [sceneDataUrl, ...persons],
    num_images: 1,
  };
  // N.B. : ne PAS envoyer input_fidelity — gpt-image-2 le refuse (toujours haute fidélité).
  if (imageSize) body.image_size = imageSize;
  if (quality) body.quality = quality;
  if (outputFormat) body.output_format = outputFormat;

  const res = await fetch(`${FAL_RUN}/${model}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Key ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`fal.ai ${res.status} : ${text.slice(0, 600)}`);
    err.status = res.status;
    throw err;
  }

  const json = await res.json();
  const imageUrl = json?.images?.[0]?.url;
  if (!imageUrl) {
    throw new Error(
      `Aucune image renvoyée par fal.ai (${JSON.stringify(json).slice(0, 300)}).`
    );
  }

  return fetchAsDataUrl(imageUrl);
}

// Lit un corps de requête JSON (Node http) avec une limite de taille.
export function readJsonBody(req, limitBytes = 40 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limitBytes) {
        reject(new Error('Requête trop volumineuse.'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// Middleware générique (compatible Node http et Connect/Vite).
// `options` (issu de la config serveur) : { imageSize, quality, outputFormat }.
// Le corps de la requête peut surcharger prompt / imageSize / quality au cas par cas.
export async function handleIntegrateRequest(req, res, { apiKey, model, options = {} }) {
  try {
    const payload = await readJsonBody(req);
    const image = await integrate({
      apiKey,
      model,
      personDataUrl: payload.personDataUrl,
      personDataUrls: payload.personDataUrls,
      sceneDataUrl: payload.sceneDataUrl,
      prompt: payload.prompt,
      imageSize: payload.imageSize ?? options.imageSize,
      quality: payload.quality ?? options.quality,
      outputFormat: payload.outputFormat ?? options.outputFormat,
    });
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ imageDataUrl: image }));
  } catch (err) {
    console.error('[integrate]', err);
    res.statusCode = err.status && err.status >= 400 ? err.status : 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err.message }));
  }
}
