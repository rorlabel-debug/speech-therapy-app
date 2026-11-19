(() => {
  'use strict';

  const SOUNDS = window.SOUNDS;
  const STICKERS = window.STICKERS;
  const ROUND = 5;          // cards per round (short: she's 3)
  const MAX_TRIES = 2;      // "Try again" this many times, then move on kindly
  const KEY = 'soundSafari.v1';

  const $ = (id) => document.getElementById(id);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  const today = () => new Date().toISOString().slice(0, 10);

  // ---------------- saved state ----------------
  const defaults = () => ({
    name: '',
    sounds: Object.fromEntries(Object.entries(SOUNDS).map(([k, s]) => [k, s.defaultOn])),
    level: 'word',
    voice: '',
    rate: 0.6,
    rateV: 2,    // bumped when the default speed changes, so old saved speeds get reset
    stars: 0,
    stickers: 0,
    stats: {},   // stats[soundKey] = { sayTries, sayGot, listenTries, listenRight }
    words: {},   // words['k:cat'] = { tries, got }
    days: [],    // dates she earned a star
  });

  let S = defaults();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved) S = Object.assign(defaults(), saved, { sounds: Object.assign(defaults().sounds, saved.sounds || {}) });
    // 19 Nov 2026: 0.8 was too fast for her. Move anyone on the old default to the new slower one.
    if (!saved || saved.rateV !== 2) { S.rate = 0.6; S.rateV = 2; }
    if (!['word', 'long', 'sentence'].includes(S.level)) S.level = 'word';
  } catch (e) { /* private mode etc: run with defaults */ }

  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } };
  const stat = (k) => (S.stats[k] ||= { sayTries: 0, sayGot: 0, listenTries: 0, listenRight: 0 });
  const wstat = (k, w) => (S.words[k + ':' + w] ||= { tries: 0, got: 0 });
  const markDay = () => { const d = today(); if (!S.days.includes(d)) S.days.push(d); };

  // ---------------- sound effects (made in code, no files) ----------------
  let ctx;
  const audio = () => {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  const tone = (freq, start, dur, type = 'sine', vol = 0.18) => {
    const c = audio(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, c.currentTime + start);
    g.gain.exponentialRampToValueAtTime(vol, c.currentTime + start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
    o.connect(g).connect(c.destination);
    o.start(c.currentTime + start); o.stop(c.currentTime + start + dur + 0.05);
  };
  const sfx = {
    yay: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.3, 'triangle')),
    boop: () => { tone(392, 0, 0.18, 'sine', 0.12); tone(330, 0.12, 0.25, 'sine', 0.12); },
    tap: () => tone(880, 0, 0.08, 'sine', 0.08),
    fanfare: () => [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.13, 0.35, 'square', 0.07)),
  };

  // ---------------- Coco's voice (the iPad's own text-to-speech) ----------------
  const synth = window.speechSynthesis;
  let voices = [];
  const loadVoices = () => {
    if (!synth) return;
    voices = synth.getVoices().filter((v) => /^en/i.test(v.lang));
    voices.sort((a, b) => (b.lang === 'en-GB') - (a.lang === 'en-GB') || a.name.localeCompare(b.name));
    fillVoiceSelect();
  };
  if (synth) { loadVoices(); synth.onvoiceschanged = loadVoices; }
  function chosenVoice() { return voices.find((v) => v.voiceURI === S.voice) || voices.find((v) => v.lang === 'en-GB') || voices[0]; }

  // speak(text) -> Promise that resolves when Coco has finished (or after a safety timeout)
  const speak = (text, opts = {}) => new Promise((resolve) => {
    if (!synth) return resolve();
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = chosenVoice();
    if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = 'en-GB'; }
    u.rate = opts.rate || S.rate;
    u.pitch = opts.pitch || 1.15;
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    u.onend = finish; u.onerror = finish;
    setTimeout(finish, 1500 + text.length * 140);
    synth.speak(u);
  });

  // ---------------- recording her voice ----------------
  const canRecord = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  let recorder = null, recChunks = [], recUrl = null, recTimer = null;
  const player = new Audio();

  const startRecording = async () => {
    synth && synth.cancel();
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } });
    } catch (e) {
      toast('The microphone is blocked. In iPad Settings → Safari → Microphone, choose "Allow" or "Ask".');
      return;
    }
    recChunks = [];
    const type = ['audio/mp4', 'audio/webm', ''].find((t) => t === '' || MediaRecorder.isTypeSupported(t));
    recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    recorder.ondataavailable = (e) => { if (e.data.size) recChunks.push(e.data); };
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop()); // let go of the mic so Coco's voice stays loud
      if (recUrl) URL.revokeObjectURL(recUrl);
      recUrl = URL.createObjectURL(new Blob(recChunks, { type: recorder.mimeType || 'audio/mp4' }));
      $('recBtn').classList.remove('recording');
      $('recBtn').querySelector('small').textContent = 'Record me';
      $('playBtn').hidden = false;
      playRecording();
    };
    recorder.start();
    $('recBtn').classList.add('recording');
    $('recBtn').querySelector('small').textContent = 'Stop';
    recTimer = setTimeout(stopRecording, 4000);
  };
  const stopRecording = () => {
    clearTimeout(recTimer);
    if (recorder && recorder.state === 'recording') recorder.stop();
  };
  const playRecording = () => {
    if (!recUrl) return;
    player.src = recUrl;
    player.play().catch(() => {});
  };
  const clearRecording = () => {
    stopRecording();
    if (recUrl) { URL.revokeObjectURL(recUrl); recUrl = null; }
    $('playBtn').hidden = true;
  };

  // ---------------- helpers ----------------
  let toastTimer;
  const toast = (msg) => {
    const t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 4000);
  };
  const confetti = () => {
    const box = $('confetti');
    const bits = ['⭐', '🎉', '🌟', '🎈', '💖', '✨'];
    for (let i = 0; i < 40; i++) {
      const s = document.createElement('div');
      s.className = 'confetto';
      s.textContent = pick(bits);
      s.style.left = Math.random() * 100 + 'vw';
      s.style.animationDuration = 1.8 + Math.random() * 1.8 + 's';
      s.style.animationDelay = Math.random() * 0.6 + 's';
      box.appendChild(s);
      setTimeout(() => s.remove(), 4500);
    }
  };
  const enabledSounds = () => Object.keys(SOUNDS).filter((k) => S.sounds[k]);
  const highlight = (word, k) => {
    const n = k === 'sh' ? 2 : 1;
    return `<span class="t">${word.slice(0, n)}</span>${word.slice(n)}`;
  };
  const article = (item) => (item.a !== undefined ? item.a : /^[aeiou]/i.test(item.w) ? 'an' : 'a');
  const sentenceText = (item) => `I see ${article(item)} ${item.w}!`.replace(/\s+/g, ' ');
  const sentenceHTML = (item, k) => `I see ${article(item)} ${highlight(item.w, k)}!`.replace(/\s+/g, ' ');
  const praise = () => {
    const p = ['Brilliant!', 'Super saying!', 'Wow, great talking!', 'You did it!', 'Fantastic!', 'Amazing!'];
    const msg = pick(p);
    return S.name && Math.random() < 0.5 ? `${msg} Well done, ${S.name}!` : msg;
  };

  // ---------------- screens ----------------
  let current = 'home';
  const go = (id) => {
    if (current === 'say') clearRecording();
    synth && synth.cancel();
    $('celebrate').hidden = true;
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
    current = id;
    if (id === 'home') renderHome();
    if (id === 'stickers') renderStickers();
    if (id === 'grownups') renderGrownups();
    window.scrollTo(0, 0);
  };

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-go]');
    if (!b) return;
    sfx.tap();
    const to = b.dataset.go;
    if (to === 'pick-say' || to === 'pick-listen') { openPicker(to.slice(5)); return; }
    go(to);
  });

  // Wake up audio + speech on the first touch (iPad needs a tap before it will make sound)
  const unlock = () => {
    audio();
    if (synth) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; synth.speak(u); }
    document.removeEventListener('pointerdown', unlock);
  };
  document.addEventListener('pointerdown', unlock);

  // ---------------- HOME ----------------
  const renderHome = () => {
    $('homeStars').textContent = `⭐ ${S.stars}`;
    $('hello').textContent = S.name ? `Hello ${S.name}! Let's play with sounds!` : "Let's play with sounds!";
  };
  $('homeCoco').addEventListener('click', () => {
    speak(S.name ? `Hello ${S.name}! I'm Coco!` : "Hello! I'm Coco!");
  });

  // Grown-ups button: press and hold so little fingers don't wander in
  (() => {
    const btn = $('grownupBtn'); let raf, t0;
    const step = () => {
      const p = Math.min(1, (performance.now() - t0) / 1500);
      btn.style.setProperty('--p', p);
      if (p >= 1) { cancel(); go('grownups'); return; }
      raf = requestAnimationFrame(step);
    };
    const cancel = (e) => {
      cancelAnimationFrame(raf);
      if (e && e.type === 'pointerup' && performance.now() - t0 < 400) toast('Grown-ups: press and hold the ⚙️');
      btn.style.setProperty('--p', 0);
    };
    btn.addEventListener('pointerdown', (e) => { e.preventDefault(); t0 = performance.now(); raf = requestAnimationFrame(step); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => btn.addEventListener(ev, cancel));
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  })();

  // ---------------- SOUND PICKER ----------------
  let mode = 'say';
  const openPicker = (m) => {
    mode = m;
    const grid = $('soundGrid');
    grid.innerHTML = '';
    const on = enabledSounds();
    on.forEach((k) => {
      const s = SOUNDS[k];
      const b = document.createElement('button');
      b.className = 'sound-btn';
      b.style.setProperty('--c', s.colour);
      b.innerHTML = `<span class="letter">${s.label}</span><span class="eg">${s.words.slice(0, 3).map((w) => w.e).join('')}</span><span class="lbl">${s.words[0].w}, ${s.words[1].w}…</span>`;
      b.onclick = () => { sfx.tap(); start([k]); };
      grid.appendChild(b);
    });
    if (on.length > 1) {
      const b = document.createElement('button');
      b.className = 'sound-btn mix';
      b.innerHTML = `<span class="letter">🎲</span><span class="eg">${on.map((k) => SOUNDS[k].words[0].e).join('')}</span><span class="lbl">Mix them all!</span>`;
      b.onclick = () => { sfx.tap(); start(on); };
      grid.appendChild(b);
    }
    grid.style.setProperty('--cols', grid.children.length <= 4 ? 2 : 3);
    go('picker');
  };

  // Build a round: ROUND cards from the chosen sounds, spread across them
  const buildDeck = (keys) => {
    const pools = keys.map((k) => shuffle(SOUNDS[k].words.filter((w) => S.level === 'long' || !w.h)).map((item) => ({ k, item })));
    const deck = [];
    for (let i = 0; deck.length < ROUND && i < 50; i++) {
      const pool = pools[i % pools.length];
      if (pool.length) deck.push(pool.shift());
    }
    return shuffle(deck);
  };

  let lastKeys = [];
  const start = (keys) => {
    lastKeys = keys;
    if (mode === 'say') startSay(keys); else startListen(keys);
  };

  const renderProgress = (el, results, idx) => {
    el.innerHTML = '';
    for (let i = 0; i < ROUND; i++) {
      const d = document.createElement('span');
      if (results[i]) { d.className = 'done'; d.textContent = results[i]; }
      else if (i === idx) d.className = 'now';
      el.appendChild(d);
    }
  };

  // ---------------- SAY IT ----------------
  let say = null;
  const startSay = (keys) => {
    say = { deck: buildDeck(keys), idx: 0, tries: 0, results: [], busy: false };
    go('say');
    $('recBtn').hidden = !canRecord;
    showSayCard();
  };
  const sayTarget = (c) => (S.level === 'sentence' ? sentenceText(c.item) : c.item.w);
  const showSayCard = () => {
    const c = say.deck[say.idx];
    const s = SOUNDS[c.k];
    say.tries = 0; say.busy = false;
    clearRecording();
    const card = $('sayCard');
    card.style.setProperty('--hl', s.colour);
    $('sayPic').textContent = c.item.e;
    $('sayWord').innerHTML = highlight(c.item.w, c.k);
    $('saySentence').innerHTML = S.level === 'sentence' ? sentenceHTML(c.item, c.k) : '';
    $('saySentence').hidden = S.level !== 'sentence';
    $('sayTip').innerHTML = `<b>Grown-up tip (${s.label}):</b> ${s.tip}`;
    renderProgress($('sayProgress'), say.results, say.idx);
    card.classList.remove('bounce'); void card.offsetWidth; card.classList.add('bounce');
    setTimeout(() => current === 'say' && speak(sayTarget(c)), 450);
  };
  $('hearBtn').onclick = () => { if (say) speak(sayTarget(say.deck[say.idx])); };
  $('sayCard').onclick = () => { if (say) speak(sayTarget(say.deck[say.idx])); };
  $('sayTip').onclick = () => { if (say) speak(SOUNDS[say.deck[say.idx].k].tip); };
  $('recBtn').onclick = () => {
    if (recorder && recorder.state === 'recording') stopRecording(); else startRecording();
  };
  $('playBtn').onclick = playRecording;

  $('yesBtn').onclick = async () => {
    if (!say || say.busy) return;
    say.busy = true;
    const c = say.deck[say.idx];
    const st = stat(c.k), ws = wstat(c.k, c.item.w);
    st.sayTries++; st.sayGot++; ws.tries++; ws.got++;
    S.stars++; markDay(); save();
    say.results[say.idx] = '⭐';
    renderProgress($('sayProgress'), say.results, -1);
    sfx.yay();
    $('sayCard').classList.remove('bounce'); void $('sayCard').offsetWidth; $('sayCard').classList.add('bounce');
    await speak(praise());
    nextSay();
  };
  $('againBtn').onclick = async () => {
    if (!say || say.busy) return;
    const c = say.deck[say.idx];
    const st = stat(c.k), ws = wstat(c.k, c.item.w);
    st.sayTries++; ws.tries++; save();
    say.tries++;
    sfx.boop();
    const card = $('sayCard');
    card.classList.remove('wiggle'); void card.offsetWidth; card.classList.add('wiggle');
    if (say.tries >= MAX_TRIES) {
      say.busy = true;
      say.results[say.idx] = '💪';
      renderProgress($('sayProgress'), say.results, -1);
      await speak('Good trying! Let\'s do a new one.');
      nextSay();
      return;
    }
    await speak(pick(['Nearly! Listen again.', 'Good try! Listen to Coco.', 'Let\'s try again!']));
    speak(sayTarget(c));
  };
  const nextSay = () => {
    say.idx++;
    if (say.idx >= say.deck.length) { roundDone(); return; }
    showSayCard();
  };

  // ---------------- SILLY OR RIGHT ----------------
  let lis = null;
  const startListen = (keys) => {
    const deck = buildDeck(keys);
    const silly = shuffle(deck.map((_, i) => i < Math.ceil(deck.length / 2)));
    deck.forEach((d, i) => (d.silly = silly[i]));
    lis = { deck, idx: 0, results: [], busy: false };
    go('listen');
    showListenCard();
  };
  const cocoSays = async (text) => {
    $('listenCoco').classList.add('speaking');
    await speak(text);
    $('listenCoco').classList.remove('speaking');
  };
  const showListenCard = async () => {
    const c = lis.deck[lis.idx];
    lis.busy = true;
    $('listenPic').textContent = c.item.e;
    $('listenSpeech').textContent = '👂 Listen…';
    $('rightBtn').disabled = $('sillyBtn').disabled = true;
    $('rightBtn').classList.remove('picked'); $('sillyBtn').classList.remove('picked');
    renderProgress($('listenProgress'), lis.results, lis.idx);
    await new Promise((r) => setTimeout(r, 500));
    if (current !== 'listen') return;
    await cocoSays(c.silly ? c.item.x : c.item.w);
    if (current !== 'listen') return;
    $('listenSpeech').textContent = 'Right, or silly?';
    await new Promise((r) => setTimeout(r, 350));
    await cocoSays('Was that right? Or silly?');
    $('rightBtn').disabled = $('sillyBtn').disabled = false;
    lis.busy = false;
  };
  $('listenReplay').onclick = async () => {
    if (!lis || lis.busy) return;
    const c = lis.deck[lis.idx];
    lis.busy = true;
    await cocoSays(c.silly ? c.item.x : c.item.w);
    lis.busy = false;
  };
  const answer = async (saidSilly) => {
    if (!lis || lis.busy) return;
    lis.busy = true;
    const c = lis.deck[lis.idx];
    const ok = saidSilly === c.silly;
    const st = stat(c.k);
    st.listenTries++; if (ok) st.listenRight++;
    (saidSilly ? $('sillyBtn') : $('rightBtn')).classList.add('picked');
    $('rightBtn').disabled = $('sillyBtn').disabled = true;
    lis.results[lis.idx] = ok ? '⭐' : '👂';
    if (ok) { S.stars++; markDay(); }
    save();
    renderProgress($('listenProgress'), lis.results, -1);
    const w = c.item.w, x = c.item.x;
    if (ok) {
      sfx.yay();
      if (c.silly) { $('listenSpeech').innerHTML = `Yes! <s>${x}</s> is silly! It's <b>${w}</b>`; await cocoSays(`Yes! Silly me! It's ${w}!`); }
      else { $('listenSpeech').innerHTML = `Yes! <b>${w}</b> was right!`; await cocoSays(`Yes! I said ${w}. ${praise()}`); }
    } else {
      sfx.boop();
      if (c.silly) { $('listenSpeech').innerHTML = `I said <s>${x}</s>. It should be <b>${w}</b>`; await cocoSays(`Hmm, I said ${x}. That's silly! It should be ${w}.`); }
      else { $('listenSpeech').innerHTML = `I said <b>${w}</b>. That was right!`; await cocoSays(`Listen. I said ${w}. That was right!`); }
    }
    await new Promise((r) => setTimeout(r, 600));
    lis.idx++;
    if (lis.idx >= lis.deck.length) { roundDone(); return; }
    showListenCard();
  };
  $('rightBtn').onclick = () => answer(false);
  $('sillyBtn').onclick = () => answer(true);

  // ---------------- end of round: win a sticker ----------------
  const roundDone = () => {
    let title = 'Hooray!', text;
    if (S.stickers < STICKERS.length) {
      const st = STICKERS[S.stickers];
      S.stickers++;
      $('burstSticker').textContent = st;
      text = 'You won a new sticker!';
    } else {
      $('burstSticker').textContent = '🏆';
      text = 'You have ALL the stickers! You\'re a superstar!';
    }
    save();
    $('celebrateTitle').textContent = S.name ? `Hooray, ${S.name}!` : title;
    $('celebrateText').textContent = text;
    $('celebrate').hidden = false;
    sfx.fanfare(); confetti();
    speak(`${S.name ? 'Hooray ' + S.name : 'Hooray'}! ${text}`);
    lastWon = S.stickers - 1;
  };
  let lastWon = -1;
  $('playAgainBtn').onclick = () => { sfx.tap(); $('celebrate').hidden = true; start(lastKeys); };

  // ---------------- STICKER BOOK ----------------
  const renderStickers = () => {
    const grid = $('stickerGrid'); grid.innerHTML = '';
    STICKERS.forEach((s, i) => {
      const d = document.createElement('div');
      const got = i < S.stickers;
      d.className = 'sticker' + (got ? '' : ' locked') + (i === lastWon ? ' new' : '');
      d.textContent = got ? s : '?';
      if (got) d.onclick = () => { sfx.tap(); d.classList.remove('new'); void d.offsetWidth; d.classList.add('new'); };
      grid.appendChild(d);
    });
    lastWon = -1;
    const left = STICKERS.length - S.stickers;
    $('stickerNote').textContent = S.stickers === 0
      ? 'Finish a game to win your first sticker!'
      : left > 0 ? `You have ${S.stickers} sticker${S.stickers === 1 ? '' : 's'}! ${left} more to find.` : 'You found every sticker! 🏆';
  };

  // ---------------- GROWN-UPS ----------------
  function fillVoiceSelect() {
    const sel = $('voiceSelect');
    if (!sel) return;
    sel.innerHTML = '';
    if (!voices.length) { sel.innerHTML = '<option>Default voice</option>'; return; }
    const cur = chosenVoice();
    voices.forEach((v) => {
      const o = document.createElement('option');
      o.value = v.voiceURI; o.textContent = `${v.name} (${v.lang})`;
      if (cur && v.voiceURI === cur.voiceURI) o.selected = true;
      sel.appendChild(o);
    });
  }

  const pct = (a, b) => (b ? Math.round((a / b) * 100) : null);
  const renderGrownups = () => {
    $('nameInput').value = S.name;
    $('rateInput').value = S.rate;
    fillVoiceSelect();

    const tg = $('soundToggles'); tg.innerHTML = '';
    Object.entries(SOUNDS).forEach(([k, s]) => {
      const b = document.createElement('button');
      b.textContent = `${s.label} (${s.words[0].w})`;
      b.style.setProperty('--c', s.colour);
      b.classList.toggle('on', !!S.sounds[k]);
      b.onclick = () => {
        if (S.sounds[k] && enabledSounds().length === 1) { toast('Keep at least one sound switched on.'); return; }
        S.sounds[k] = !S.sounds[k]; save(); b.classList.toggle('on', S.sounds[k]);
      };
      tg.appendChild(b);
    });
    document.querySelectorAll('#levelSeg button').forEach((b) => b.classList.toggle('on', b.dataset.level === S.level));

    // progress report
    const rep = $('progressReport');
    const rows = Object.entries(SOUNDS).filter(([k]) => S.sounds[k] || S.stats[k]).map(([k, s]) => {
      const st = S.stats[k] || { sayTries: 0, sayGot: 0, listenTries: 0, listenRight: 0 };
      const sp = pct(st.sayGot, st.sayTries), lp = pct(st.listenRight, st.listenTries);
      return `<div class="report-row">
        <div class="badge" style="background:${s.colour}">${s.label}</div>
        <div>
          <div>Saying: ${st.sayTries ? `${st.sayGot} good out of ${st.sayTries} tries` : 'not tried yet'}</div>
          <div class="bar-bg"><div class="bar-fill" style="width:${sp || 0}%;background:${s.colour}"></div></div>
          <div class="report-sub">Hearing the difference: ${st.listenTries ? `${st.listenRight} of ${st.listenTries} right (${lp}%)` : 'not tried yet'}</div>
        </div>
        <div class="pct">${sp === null ? '–' : sp + '%'}</div>
      </div>`;
    }).join('');
    const tricky = Object.entries(S.words)
      .filter(([, v]) => v.tries >= 2 && v.got / v.tries < 0.6)
      .sort((a, b) => a[1].got / a[1].tries - b[1].got / b[1].tries)
      .slice(0, 6).map(([key]) => key.split(':')[1]);
    const days = S.days.length;
    rep.innerHTML = rows +
      `<div class="report-days">⭐ ${S.stars} stars · 📒 ${Math.min(S.stickers, STICKERS.length)} stickers · practised on ${days} day${days === 1 ? '' : 's'}${days ? ` (last: ${S.days[days - 1] === today() ? 'today' : S.days[days - 1]})` : ''}</div>` +
      (tricky.length ? `<div class="tricky"><b>Trickiest words so far:</b> ${tricky.join(', ')}</div>` : '');
    $('resetConfirm').hidden = true;
    $('resetBtn').hidden = false;
  };

  $('nameInput').addEventListener('input', (e) => { S.name = e.target.value.trim(); save(); });
  $('rateInput').addEventListener('change', (e) => { S.rate = parseFloat(e.target.value); save(); speak('Hello! I\'m Coco!'); });
  $('voiceSelect').addEventListener('change', (e) => { S.voice = e.target.value; save(); speak('Hello! I\'m Coco!'); });
  $('testVoice').onclick = () => speak('Cat. Dat. Like. Yike. Can you hear the difference?');
  document.querySelectorAll('#levelSeg button').forEach((b) => (b.onclick = () => {
    S.level = b.dataset.level; save();
    document.querySelectorAll('#levelSeg button').forEach((x) => x.classList.toggle('on', x === b));
  }));
  $('resetBtn').onclick = () => { $('resetConfirm').hidden = false; $('resetBtn').hidden = true; };
  $('resetNo').onclick = () => { $('resetConfirm').hidden = true; $('resetBtn').hidden = false; };
  $('resetYes').onclick = () => {
    Object.assign(S, { stars: 0, stickers: 0, stats: {}, words: {}, days: [] });
    save(); renderGrownups(); toast('Progress and stickers cleared.');
  };

  // ---------------- start ----------------
  if (!synth) toast('This browser can\'t speak, so Coco will be quiet. Use Safari on the iPad.');
  renderHome();

  // Works offline once opened (and as a Home Screen app)
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
