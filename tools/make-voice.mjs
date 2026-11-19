// Makes Coco's voice clips with OpenAI text-to-speech, into ../audio/.
// Run from the project folder:  OPENAI_API_KEY=... node tools/make-voice.mjs
// Skips clips that already exist (delete a file to remake it). The key is only read from the
// environment, never stored in this project.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const win = {};
vm.runInNewContext(fs.readFileSync(path.join(root, 'words.js'), 'utf8'), { window: win });
const { SOUNDS, PHRASES } = win;

export const VOICE = 'coral';
export const MODEL = 'gpt-4o-mini-tts';
const BASE = 'You are Coco, a warm, gentle, cheerful grown-up woman with a clear standard British accent, ' +
  'talking to a 3-year-old child. Speak slowly and very clearly, with a soft, happy, encouraging tone. ' +
  'Leave a tiny pause before the end. Never add any words.';

const article = (it) => (it.a !== undefined ? it.a : /^[aeiou]/i.test(it.w) ? 'an' : 'a');
export const clips = () => {
  const out = [];
  for (const [k, s] of Object.entries(SOUNDS)) {
    for (const it of s.words) {
      const w = it.w.toLowerCase();
      out.push({ id: `w-${k}-${w}`, text: `${it.w}.`, real: it.w,
        extra: `Say just this one word, slowly and clearly, making the very first sound crisp and easy to hear.` });
      out.push({ id: `x-${k}-${w}`, text: `${it.x}.`, silly: it.x, real: it.w, swap: s.swap,
        extra: `This is a deliberately silly made-up word, said the way a little child might mispronounce "${it.w}". ` +
          `Say it exactly as written: "${it.x}". It must RHYME with "${it.w}": say "${it.w}" with exactly the same vowel and ending, ` +
          `but change only the very first sound to a "${s.swap}" sound. ` +
          `Do NOT say "${it.w}". Say just this one made-up word, slowly and clearly.` });
      out.push({ id: `s-${k}-${w}`, text: `I see ${article(it)} ${it.w}!`.replace(/\s+/g, ' '), real: it.w,
        extra: `Say this short sentence slowly and clearly, making the first sound of "${it.w}" crisp.` });
    }
  }
  for (const [key, text] of Object.entries(PHRASES)) out.push({ id: `p-${key}`, text, extra: '' });
  return out;
};

const make = async (c, key) => {
  const file = path.join(root, 'audio', `${c.id}.mp3`);
  if (fs.existsSync(file)) return 'skip';
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, voice: VOICE, input: c.text, instructions: `${BASE} ${c.extra}`, response_format: 'mp3', speed: 0.9 }),
    });
    if (r.ok) { fs.writeFileSync(file, Buffer.from(await r.arrayBuffer())); return 'made'; }
    const msg = (await r.text()).slice(0, 200);
    if (attempt === 3 || r.status < 500 && r.status !== 429) throw new Error(`${c.id}: HTTP ${r.status} ${msg}`);
    await new Promise((res) => setTimeout(res, 2000 * attempt));
  }
};

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) { console.error('Set OPENAI_API_KEY'); process.exit(1); }
  fs.mkdirSync(path.join(root, 'audio'), { recursive: true });
  const list = clips().filter((c) => !process.argv[2] || c.id.startsWith(process.argv[2]));
  let made = 0, skipped = 0, failed = 0, i = 0;
  const worker = async () => {
    while (i < list.length) {
      const c = list[i++];
      try { (await make(c, key)) === 'made' ? made++ : skipped++; }
      catch (e) { failed++; console.error(e.message); }
    }
  };
  await Promise.all([1, 2, 3, 4].map(worker));
  console.log(`clips: ${list.length}, made ${made}, already there ${skipped}, failed ${failed}`);
}
