# Coco's Sound Safari (speech therapy app)

## What this is

A fun speech-practice web app for Ash's daughter, used on an iPad in Safari (can be added to the
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
- Secrets: none. The app has no keys or accounts.

## Standing rules

- **When you change styles.css, app.js or words.js, bump `?v=N` on all three in index.html**,
  and bump `CACHE` in sw.js. Otherwise the iPad keeps showing the old version.
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
| 19 Nov 2026 | Emoji for all pictures | No image files to make or license; render sharply on iPad | words.js |

## Traps already paid for

- **19 Nov 2026 – screenshots look faded / half-size**: the Browser pane was hidden, so CSS
  animations froze on their first frame. Not a bug. Inject
  `*{animation:none!important;transition:none!important}` before screenshotting.
- **19 Nov 2026 – `[hidden]` didn't hide buttons**: `.round-btn {display:flex}` beat the hidden
  attribute. Fixed with a global `[hidden]{display:none!important}` in styles.css.
- **19 Nov 2026 – Swift icon script hung for 3+ minutes** (AppKit drawing from the command line).
  Made the icon with Quick Look instead: `qlmanage -t -s 512 -o <dir> icon.svg`.

## What doesn't live in this repo

- Nothing else. Her progress lives only in Safari on the iPad.
