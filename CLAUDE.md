# Coco's Sound Safari (speech therapy app)

## What this is

A fun speech-practice web app for Ash's daughter (**3 years old**: can't read, short attention, so
big pictures, everything spoken, 5-card rounds), used on an iPad in Safari (can be added to the
Home Screen). She swaps the first sound of words for D (cat → "dat", K/G fronting) and L for Y
(like → "yike", gliding). Two games plus rewards:
- **Say it!**: picture + word, Coco (a parrot, the iPad's built-in voice) says it, she copies,
  can record herself and play it back; a grown-up taps "Got it!" or "Try again" (3 tries then it
  moves on kindly). Words or "I see a ___" sentences (grown-up setting).
- **Silly or right?**: Coco says the word right ("cat") or with her mistake ("dat"); she decides.
  Trains hearing the difference.
- 6 cards per round, each finished round wins a sticker (30 in the sticker book).
- Grown-ups area (press and hold the gear 1.5 s): her name, which sounds (K, G, L on by default;
  S, F, SH optional), level, voice, speed, progress per sound, trickiest words, reset.

Plain HTML/CSS/JS, no build step, no server code. Progress is saved in the browser
(localStorage), so it lives on that iPad only.

## Build, run, test

- Install: nothing.
- Run locally: `python3 -m http.server 8642` in the project folder, open http://localhost:8642
  (`.claude/launch.json` has this as "app"). The server listens on IPv6 `::1`, so `curl 127.0.0.1`
  fails; use `localhost`.
- Check syntax: `node --check app.js`
- **Done means:** screenshots at iPad landscape (1180x740, Safari with address bar) and portrait
  (820x1180) checked, a full round played to the sticker, no console errors.

## Where it runs

- Hosting: **GitHub Pages**, live since 19 Nov 2026 at https://rorlabel-debug.github.io/speech-therapy-app/
- Deploy: commit + `git push` to main. Pages rebuilds automatically (~30-60 s). Check:
  `gh api repos/rorlabel-debug/speech-therapy-app/pages --jq .status` -> built.
- Repo: github.com/rorlabel-debug/speech-therapy-app (**public**, needed for free Pages; Ash OK'd
  this on 19 Nov 2026). Never commit anything personal or secret.
- Secrets: none in the app. Making voice clips uses the OpenAI key that lives in
  `../colourkraft/.env.local` (OPENAI_API_KEY), with Ash's OK (19 Nov 2026). It's passed in as an
  environment variable only; never copy it into this repo (it's public).

## Coco's voice (audio/)

- Every word, silly word, "I see a ___!" sentence and phrase is a recorded mp3 in `audio/`
  (226 clips, ~9 MB), made with OpenAI gpt-4o-mini-tts, voice "coral", British, slow, for a
  3-year-old. Names: `w-<sound>-<word>`, `x-` silly, `s-` sentence, `p-<key>` for PHRASES in words.js.
- Make missing clips: `OPENAI_API_KEY=... node tools/make-voice.mjs [id-prefix]` (skips existing
  files; delete a file to remake it). Check them: `node tools/check-voice.mjs [prefix] [--all]`
  (speech-to-text; flags clips that don't match. The checker is fussy: read the flagged list by hand).
- After remaking clips, bump `AUDIO_V` in app.js (and the usual ?v= / CACHE bumps).
- Her name can't be in recordings: only the "iPad voice" setting says it.

## Standing rules

- **When you change styles.css, app.js or words.js, bump `?v=N` on all three in index.html**,
  and bump `CACHE` in sw.js (now v3). Otherwise the iPad keeps showing the old version.
- Never show a button that can't work: the record button is hidden if the browser can't record,
  "Hear me" only appears after a recording.
- Silly words (`x` in words.js) are spelled for the voice, e.g. kite → "dyte". Check new ones
  with Settings → Test voice on the iPad.
- Avoid words whose "silly" version is rude (e.g. cookie → "dookie" was left out).

## Decisions

| Date | Decision | Why | Evidence |
| --- | --- | --- | --- |
| 19 Nov 2026 | Grown-up judges "Got it / Try again", no automatic speech recognition | iPad speech recognition guesses real words (hears "dat" as "that"/"cat"), sends audio to Apple, and isn't built for children's speech. SLTs judge by ear. | — |
| 19 Nov 2026 | Mic is released after every recording | On iOS, keeping the mic open switches audio to the quiet "call" mode, so Coco gets quiet | app.js `recorder.onstop` |
| 19 Nov 2026 | GitHub Pages, repo made public | Free, deploy = push, static site. Ash chose it over Railway | — |
| 19 Nov 2026 | Voice speed default 0.6 (was 0.8) | Ash: too fast. Old saved speeds are reset once via `rateV` in app.js; bump `rateV` again if the default changes | app.js defaults |
| 19 Nov 2026 | Built for age 3: 5 cards a round, 2 tries then move on, short familiar words by default (`h: 1` = longer words, only on "Longer words too"), Coco asks "Right or silly?" out loud | She's 3 and can't read | words.js, app.js |
| 19 Nov 2026 | Recorded natural voice instead of the iPad voice | Ash: the iPad voice was too hard for a 3-year-old to understand. iPad voice kept as an option in Grown-ups | audio/, tools/ |
| 19 Nov 2026 | No spoken grown-up tips | A voice reads "k, k, k" as the letter name "kay", which is the wrong model | — |
| 19 Nov 2026 | Emoji for all pictures | No image files to make or license; render sharply on iPad | words.js |

## Traps already paid for

- **19 Nov 2026 – screenshots look faded / half-size**: the Browser pane was hidden, so CSS
  animations froze on their first frame. Not a bug. Inject
  `*{animation:none!important;transition:none!important}` before screenshotting.
- **19 Nov 2026 – `[hidden]` didn't hide buttons**: `.round-btn {display:flex}` beat the hidden
  attribute. Fixed with a global `[hidden]{display:none!important}` in styles.css.
- **19 Nov 2026 – Swift icon script hung for 3+ minutes** (AppKit drawing from the command line).
  Made the icon with Quick Look instead: `qlmanage -t -s 512 -o <dir> icon.svg`.

- **19 Nov 2026 – silly words came out wrong** (dat → "dot", light → "yike", ghost → "joast",
  guitar spelled out as letters). Fix: the instructions tell the voice the silly word must RHYME
  with the real word, and some spellings changed (ditar, dammel, yai-un). Use check-voice.mjs.

## What doesn't live in this repo

- Nothing else. Her progress lives only in Safari on the iPad.
