// Handler d'intégration d'image, indépendant du framework.
// Il reçoit la photo de la personne + le panorama équirectangulaire des locaux,
// puis demande à nanoBanana Pro (via fal.ai) de fondre la personne dans la
// scène, en conservant la projection 360° équirectangulaire (ratio 2:1).
//
// La clé API fal.ai est lue côté serveur uniquement : elle ne transite jamais
// par le navigateur.

// Endpoint synchrone fal.ai (attend le résultat). Modèle surchargeable via FAL_MODEL.
const FAL_RUN = 'https://fal.run';
export const DEFAULT_MODEL = 'fal-ai/nano-banana-pro/edit';

const DEFAULT_PROMPT = `Tu édites une image panoramique équirectangulaire 360° (ratio 2:1) d'un lieu de bureau.
Première image : la scène équirectangulaire (les locaux).
Deuxième image : la photo d'une personne (visage / tête).

Objectif : intègre cette personne dans la scène de façon réaliste, comme si elle
se tenait naturellement debout dans ces locaux. Respecte impérativement :
- la projection ÉQUIRECTANGULAIRE 360° et le ratio 2:1 de l'image de sortie ;
- l'échelle humaine (taille réaliste, pieds au niveau du sol) ;
- la perspective, l'éclairage, la balance des couleurs et les ombres portées de la scène ;
- le reste de la scène doit rester INCHANGÉ (n'ajoute rien d'autre).

Place la personne dans une zone dégagée au sol, bien visible. Rends une seule
image équirectangulaire finale.`;

// Récupère l'image générée (URL fal.media) et la renvoie en data URL, pour que
// le client reçoive une image same-origin (pas de souci CORS pour la texture).
async function fetchAsDataUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Téléchargement du résultat échoué (${res.status}).`);
  const buf = Buffer.from(await res.arrayBuffer());
  const mime = res.headers.get('content-type') || 'image/jpeg';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

// Appelle fal.ai (nanoBanana Pro edit) et renvoie une data URL de l'image générée.
export async function integrate({
  apiKey,
  model = DEFAULT_MODEL,
  personDataUrl,
  sceneDataUrl,
  prompt = DEFAULT_PROMPT,
}) {
  if (!apiKey) {
    const err = new Error(
      "Clé API manquante. Renseigne FAL_KEY dans un fichier .env (voir .env.example)."
    );
    err.status = 500;
    throw err;
  }
  if (!sceneDataUrl || !personDataUrl) {
    const err = new Error('Images manquantes (scène et/ou personne).');
    err.status = 400;
    throw err;
  }

  const body = {
    prompt,
    // Ordre attendu par le prompt : [scène, personne].
    image_urls: [sceneDataUrl, personDataUrl],
    num_images: 1,
    output_format: 'jpeg',
  };

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
export async function handleIntegrateRequest(req, res, { apiKey, model }) {
  try {
    const payload = await readJsonBody(req);
    const image = await integrate({
      apiKey,
      model,
      personDataUrl: payload.personDataUrl,
      sceneDataUrl: payload.sceneDataUrl,
      prompt: payload.prompt,
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
