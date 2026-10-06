// Script interactif RodiumAI avec le SDK JavaScript : chat, image, vidéo.
import 'dotenv/config';
import fs from 'node:fs/promises';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import * as sdk from 'rodiumai';

// A ADAPTER : noms complets au format fournisseur/modèle
const CHAT_MODEL = 'openai/gpt-4o-mini';
const IMAGE_MODEL = 'google/gemini-3.1-flash-lite-image';
const VIDEO_MODEL = 'google/veo-3.1-lite';

const VIDEO_DURATION = 4; // secondes (courte : facturée à la seconde générée)
const VIDEO_TIMEOUT = 600_000; // la doc recommande 600 000 ms pour les vidéos

const RodiumAI = sdk.RodiumAI ?? sdk.default;
const rl = readline.createInterface({ input: stdin, output: stdout });

// Appelle une méthode du SDK en gardant `this` : client.videos(...) ou client.images.generate(...)
async function call(client, name, params) {
  if (typeof client[name] === 'function') return client[name](params);
  return client[name].generate(params);
}

function showError(e) {
  const code = e?.error_code ?? e?.code ?? 'inconnu';
  const status = e?.status ?? e?.statusCode ?? '?';
  console.log(`Erreur (HTTP ${status}) | error_code : ${code} | ${e?.message ?? e}`);
}

function printCost(res) {
  const cost = res?.cost_rodi ?? res?.usage?.cost_rodi;
  if (cost !== undefined) return console.log(`Coût : ${cost} RODI`);
  const u = res?.usage;
  if (u) {
    console.log(`Coût : cost_rodi non renvoyé (tokens entrée : ${u.prompt_tokens}, sortie : ${u.completion_tokens})`);
  } else {
    console.log("Coût : cost_rodi non renvoyé (voir les journaux d'usage)");
  }
}

async function saveMedia(item, filename) {
  if (item?.b64_json) {
    await fs.writeFile(filename, Buffer.from(item.b64_json, 'base64'));
    return true;
  }
  const url = item?.url ?? item?.video_url;
  if (url) {
    const r = await fetch(url);
    await fs.writeFile(filename, Buffer.from(await r.arrayBuffer()));
    return true;
  }
  return false;
}

const firstItem = (res) => (res?.data?.length ? res.data[0] : res);

async function stepChat(client) {
  const question = (await rl.question('Votre question : ')).trim();
  if (!question) return console.log('Question vide.');
  try {
    const res = await client.chat.completions.create({
      model: CHAT_MODEL,
      messages: [{ role: 'user', content: question }],
    });
    console.log(res.choices[0].message.content);
    printCost(res);
  } catch (e) {
    showError(e);
  }
}

async function stepImage(client) {
  const prompt = (await rl.question("Décrivez l'image : ")).trim();
  if (!prompt) return console.log('Description vide.');
  try {
    // A VÉRIFIER dans le README du SDK : nom de la méthode et des paramètres
    const res = await call(client, 'images', { model: IMAGE_MODEL, prompt });
    if (await saveMedia(firstItem(res), 'image.png')) {
      console.log('Image enregistrée : image.png');
      printCost(res);
    } else {
      console.log('Réponse sans image exploitable :', res);
    }
  } catch (e) {
    showError(e);
  }
}

async function stepVideo(client) {
  const prompt = (await rl.question('Décrivez la vidéo : ')).trim();
  if (!prompt) return console.log('Description vide.');
  try {
    const res = await call(client, 'videos', {
      model: VIDEO_MODEL,
      prompt,
      duration_seconds: VIDEO_DURATION,
      timeout: VIDEO_TIMEOUT,
    });
    if (await saveMedia(firstItem(res), 'video.mp4')) {
      console.log('Vidéo enregistrée : video.mp4');
      printCost(res);
    } else {
      console.log('Réponse sans vidéo exploitable :', res);
    }
  } catch (e) {
    showError(e);
  }
}

const STEPS = [
  ['Chat', stepChat],
  ['Image', stepImage],
  ['Vidéo', stepVideo],
];

async function askChoice(i) {
  const options = {};
  if (i > 0) options.b = 'Revenir en arrière (b)';
  options.r = 'rester (r)';
  if (i < STEPS.length - 1) options.s = 'passer à la suivante (s)';
  else options.q = 'quitter (q)';
  const label = Object.values(options).join(', ');
  while (true) {
    const c = (await rl.question(`${label} ? `)).trim().toLowerCase();
    if (c in options) return c;
    console.log('Choix invalide.');
  }
}

async function main() {
  const key = process.env.RODIUMAI_API_KEY;
  if (!key) {
    console.error("Erreur : RODIUMAI_API_KEY est introuvable (.env ou variable d'environnement).");
    process.exit(1);
  }
  const client = new RodiumAI({ apiKey: key });
  let i = 0;
  while (true) {
    const [name, func] = STEPS[i];
    console.log(`\n=== Étape ${i + 1} : ${name} ===`);
    await func(client);
    const c = await askChoice(i);
    if (c === 'b') i -= 1;
    else if (c === 's') i += 1;
    else if (c === 'q') {
      console.log('Au revoir.');
      break;
    }
  }
  rl.close();
}

main();