// Handler d'intégration d'image, indépendant du framework.
// Il reçoit la photo de la personne + le panorama équirectangulaire des locaux,
// puis demande à nanoBanana Pro (Gemini image) de fondre la personne dans la
// scène, en conservant la projection 360° équirectangulaire (ratio 2:1).
//
// La clé API est lue côté serveur uniquement : elle ne transite jamais par le
// navigateur.

const API_ROOT = 'https://generativelanguage.googleapis.com/v1beta/models';

// "nanoBanana Pro" = Gemini 3 Pro Image. (Le "nano banana" standard est
// gemini-2.5-flash-image.) Surchargable via la variable d'env GEMINI_MODEL.
export const DEFAULT_MODEL = 'gemini-3-pro-image-preview';

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

function parseDataUrl(dataUrl) {
  const m = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl || '');
  if (!m) throw new Error('Image invalide (data URL base64 attendue).');
  return { mimeType: m[1], data: m[2] };
}

// Appelle l'API Gemini et renvoie une data URL de l'image générée.
export async function integrate({
  apiKey,
  model = DEFAULT_MODEL,
  personDataUrl,
  sceneDataUrl,
  prompt = DEFAULT_PROMPT,
}) {
  if (!apiKey) {
    const err = new Error(
      "Clé API manquante. Renseigne GEMINI_API_KEY dans un fichier .env (voir .env.example)."
    );
    err.status = 500;
    throw err;
  }

  const scene = parseDataUrl(sceneDataUrl);
  const person = parseDataUrl(personDataUrl);

  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { inline_data: { mime_type: scene.mimeType, data: scene.data } },
          { inline_data: { mime_type: person.mimeType, data: person.data } },
        ],
      },
    ],
    generationConfig: { responseModalities: ['IMAGE'] },
  };

  const res = await fetch(`${API_ROOT}/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`Gemini API ${res.status} : ${text.slice(0, 500)}`);
    err.status = res.status;
    throw err;
  }

  const json = await res.json();
  const parts = json?.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inline_data || p.inlineData);
  const inline = imagePart?.inline_data || imagePart?.inlineData;

  if (!inline?.data) {
    const reason =
      json?.candidates?.[0]?.finishReason ||
      parts.find((p) => p.text)?.text ||
      'aucune image renvoyée';
    throw new Error(`Le modèle n'a pas renvoyé d'image (${reason}).`);
  }

  const mime = inline.mime_type || inline.mimeType || 'image/png';
  return `data:${mime};base64,${inline.data}`;
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
