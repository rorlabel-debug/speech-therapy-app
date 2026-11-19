// Practice words, grouped by the sound being practised.
// Each word: w = the word, e = picture (emoji), x = how the "silly" version is said
// (the mistake swapped in, spelled so the iPad voice says it right), a = article for the sentence.
// `say` on a sound = the usual swap (K -> D, L -> Y, ...). `tip` = how to make the sound.

window.SOUNDS = {
  k: {
    label: 'K', name: 'K sound', colour: '#ff7a59', swap: 'd', defaultOn: true,
    tip: 'Keep your tongue tip down behind your bottom teeth, then push the back of your tongue up like a little cough: k, k, k!',
    words: [
      { w: 'cat', e: '🐱', x: 'dat' },
      { w: 'car', e: '🚗', x: 'dar' },
      { w: 'cake', e: '🎂', x: 'dake' },
      { w: 'cup', e: '🥤', x: 'dup' },
      { w: 'cow', e: '🐄', x: 'dow' },
      { w: 'key', e: '🔑', x: 'dee' },
      { w: 'kite', e: '🪁', x: 'dyte' },
      { w: 'king', e: '🤴', x: 'ding' },
      { w: 'corn', e: '🌽', x: 'dorn', a: 'some' },
      { w: 'coat', e: '🧥', x: 'dote' },
      { w: 'cap', e: '🧢', x: 'dap' },
      { w: 'carrot', e: '🥕', x: 'darrot' },
      { w: 'camel', e: '🐫', x: 'damel' },
      { w: 'castle', e: '🏰', x: 'dassle' },
      { w: 'cupcake', e: '🧁', x: 'dupcake' },
      { w: 'kangaroo', e: '🦘', x: 'dangaroo' },
      { w: 'koala', e: '🐨', x: 'doala' },
      { w: 'candle', e: '🕯️', x: 'dandle' },
    ],
  },
  g: {
    label: 'G', name: 'G sound', colour: '#9b5de5', swap: 'd', defaultOn: true,
    tip: 'Tongue tip down, back of your tongue up, and turn your voice on, like a gulp: g, g, g!',
    words: [
      { w: 'goat', e: '🐐', x: 'dote' },
      { w: 'gift', e: '🎁', x: 'dift' },
      { w: 'girl', e: '👧', x: 'durl' },
      { w: 'game', e: '🎮', x: 'dame' },
      { w: 'guitar', e: '🎸', x: 'dih-tar' },
      { w: 'gorilla', e: '🦍', x: 'dorilla' },
      { w: 'ghost', e: '👻', x: 'dohst' },
      { w: 'gold', e: '🥇', x: 'dold', a: 'some' },
      { w: 'goal', e: '🥅', x: 'dole' },
      { w: 'garden', e: '🏡', x: 'darden' },
    ],
  },
  l: {
    label: 'L', name: 'L sound', colour: '#00b4d8', swap: 'y', defaultOn: true,
    tip: 'Lift your tongue tip up to the bumpy bit behind your top teeth and sing: la, la, la!',
    words: [
      { w: 'leg', e: '🦵', x: 'yeg' },
      { w: 'lion', e: '🦁', x: 'yion' },
      { w: 'lemon', e: '🍋', x: 'yemon' },
      { w: 'leaf', e: '🍃', x: 'yeef' },
      { w: 'light', e: '💡', x: 'yight' },
      { w: 'lollipop', e: '🍭', x: 'yollipop' },
      { w: 'lock', e: '🔒', x: 'yock' },
      { w: 'lips', e: '👄', x: 'yips', a: 'some' },
      { w: 'lizard', e: '🦎', x: 'yizard' },
      { w: 'ladybird', e: '🐞', x: 'yadybird' },
      { w: 'lettuce', e: '🥬', x: 'yettuce', a: 'some' },
      { w: 'lamb', e: '🐑', x: 'yam' },
      { w: 'ladder', e: '🪜', x: 'yadder' },
      { w: 'letter', e: '✉️', x: 'yetter' },
      { w: 'log', e: '🪵', x: 'yog' },
      { w: 'lunch', e: '🥪', x: 'yunch', a: 'my' },
    ],
  },
  s: {
    label: 'S', name: 'S sound', colour: '#f15bb5', swap: 'd', defaultOn: false,
    tip: 'Teeth together, smile, and let the air hiss like a snake: sssss!',
    words: [
      { w: 'sun', e: '☀️', x: 'dun', a: 'the' },
      { w: 'sock', e: '🧦', x: 'dock' },
      { w: 'sea', e: '🌊', x: 'dee', a: 'the' },
      { w: 'soup', e: '🍲', x: 'doop', a: 'some' },
      { w: 'sofa', e: '🛋️', x: 'dofa' },
      { w: 'sandwich', e: '🥪', x: 'dandwich' },
      { w: 'salad', e: '🥗', x: 'dalad', a: 'some' },
      { w: 'Santa', e: '🎅', x: 'Danta', a: '' },
      { w: 'sausage', e: '🌭', x: 'dossidge' },
    ],
  },
  f: {
    label: 'F', name: 'F sound', colour: '#f8961e', swap: 'd', defaultOn: false,
    tip: 'Put your top teeth gently on your bottom lip and blow: fffff!',
    words: [
      { w: 'fish', e: '🐟', x: 'dish' },
      { w: 'fox', e: '🦊', x: 'docks' },
      { w: 'fire', e: '🔥', x: 'dire', a: 'a big' },
      { w: 'foot', e: '🦶', x: 'doot' },
      { w: 'feather', e: '🪶', x: 'deather' },
      { w: 'five', e: '5️⃣', x: 'dive', a: 'number' },
      { w: 'football', e: '🏈', x: 'dootball' },
      { w: 'fairy', e: '🧚', x: 'dairy' },
      { w: 'farm', e: '🚜', x: 'darm', a: 'the' },
    ],
  },
  sh: {
    label: 'SH', name: 'SH sound', colour: '#43aa8b', swap: 'd', defaultOn: false,
    tip: 'Push your lips out round like a kiss and blow quietly: shhh, the baby is sleeping!',
    words: [
      { w: 'shoe', e: '👟', x: 'doo' },
      { w: 'sheep', e: '🐑', x: 'deep' },
      { w: 'ship', e: '🚢', x: 'dip' },
      { w: 'shell', e: '🐚', x: 'dell' },
      { w: 'shark', e: '🦈', x: 'dark' },
      { w: 'shirt', e: '👕', x: 'dirt' },
      { w: 'shower', e: '🚿', x: 'dower' },
    ],
  },
};

// Stickers she can win: one per finished round, in this order.
window.STICKERS = [
  '🐶', '🐱', '🐰', '🦄', '🐼', '🐸', '🐵', '🦋', '🐢', '🐬', '🦒', '🐘',
  '🐧', '🦉', '🐙', '🦖', '🐝', '🦩', '🐯', '🐻', '🐳', '🦔', '🐞', '🐲',
  '🌈', '🚀', '🍦', '🎈', '🌟', '🏆',
];
