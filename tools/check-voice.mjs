// Plays every clip in ../audio through OpenAI speech-to-text and flags any that don't match.
// Real words and sentences must come back as the right word. Silly words must NOT come back as
// the real word, and should start with the swapped sound (d / y).
// Run:  OPENAI_API_KEY=... node tools/check-voice.mjs [id-prefix]
import fs from 'node:fs';
import path from 'node:path';
import { clips } from './make-voice.mjs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const key = process.env.OPENAI_API_KEY;
if (!key) { console.error('Set OPENAI_API_KEY'); process.exit(1); }
const norm = (t) => t.toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();

const transcribe = async (file) => {
  const fd = new FormData();
  fd.append('file', new Blob([fs.readFileSync(file)], { type: 'audio/mpeg' }), path.basename(file));
  fd.append('model', 'whisper-1');
  fd.append('language', 'en');
  fd.append('temperature', '0');
  const r = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: fd });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${(await r.text()).slice(0, 150)}`);
  return (await r.json()).text;
};

const list = clips().filter((c) => !process.argv[2] || c.id.startsWith(process.argv[2]))
  .filter((c) => fs.existsSync(path.join(root, 'audio', `${c.id}.mp3`)));
const rows = []; let i = 0;
const worker = async () => {
  while (i < list.length) {
    const c = list[i++];
    let heard;
    try { heard = await transcribe(path.join(root, 'audio', `${c.id}.mp3`)); } catch (e) { rows.push([c.id, 'ERROR', e.message]); continue; }
    const h = norm(heard), real = c.real ? norm(c.real) : '';
    let ok;
    // silly: starts with the swapped sound, isn't the real word, and keeps the real word's ending
    const tail = (t) => t.replace(/^(sh|ch|gh|[^aeiouy]+)/, '');
    if (c.silly) ok = !h.split(' ').includes(real) && h.startsWith(c.swap) &&
      (h === norm(c.silly) || tail(h).slice(0, 2) === tail(real).slice(0, 2));
    else if (c.real) ok = h.split(' ').includes(real) || h.replace(/ /g, '').includes(real.replace(/ /g, ''));
    else ok = norm(c.text).split(' ').filter((w) => h.includes(w)).length >= norm(c.text).split(' ').length * 0.6;
    rows.push([c.id, ok ? 'ok' : 'CHECK', heard]);
  }
};
await Promise.all([1, 2, 3, 4].map(worker));
rows.sort((a, b) => a[0].localeCompare(b[0]));
const bad = rows.filter((r) => r[1] !== 'ok');
for (const r of (process.argv.includes('--all') ? rows : bad)) console.log(r.join(' | '));
console.log(`checked ${rows.length}, ok ${rows.length - bad.length}, to look at ${bad.length}`);
