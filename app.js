// === Dansk Fugleviden — Quiz App ===

(function () {
  'use strict';

  // --- Image fetching via Wikipedia + Commons ---
  const imageCache = new Map();
  const failedSpecies = new Set();

  // Bad filename keywords — these are never good bird photos
  const BAD_TITLE_WORDS = [
    'icon', 'logo', 'map', 'range', 'distribution', 'egg', 'eggs',
    'skull', 'skeleton', 'specimen', 'skin', 'museum', 'mwnh',
    'dead', 'taxiderm', 'feather', 'stamp', 'drawing', 'illustration',
    'diagram', 'chart', 'track', 'footprint', 'nest', 'call', 'song',
    'mhnt', 'mnhn', 'naturalis', 'clutch', 'oolog',
  ];

  function isBadImageTitle(title) {
    const t = (title || '').toLowerCase();
    if (!t.endsWith('.jpg') && !t.endsWith('.jpeg') && !t.endsWith('.png')) return true;
    return BAD_TITLE_WORDS.some(w => t.includes(w));
  }

  // Species whose Wikipedia page image is badly framed — skip to Commons
  const SKIP_WIKIPEDIA_IMAGE = new Set([
    'Falco subbuteo',       // Lærkefalk — portrait crop, head cut off
    'Milvus migrans',       // Sort glente — body only
    'Uria aalge',           // Lomvie — head cut off
    'Tringa glareola',      // Mudderklire — head cut off
  ]);

  async function fetchBirdImage(scientificName) {
    if (imageCache.has(scientificName)) return imageCache.get(scientificName);
    if (failedSpecies.has(scientificName)) return null;

    // Check manual overrides first
    if (typeof IMAGE_OVERRIDES !== 'undefined' && IMAGE_OVERRIDES[scientificName]) {
      const url = IMAGE_OVERRIDES[scientificName];
      imageCache.set(scientificName, url);
      return url;
    }

    // Strategy 1: Wikipedia page image — gets the main article photo (best quality)
    if (SKIP_WIKIPEDIA_IMAGE.has(scientificName)) {
      // Skip — known bad Wikipedia image, go straight to Commons
    } else try {
      const wpUrl = `https://en.wikipedia.org/w/api.php?` +
        `action=query&titles=${encodeURIComponent(scientificName)}` +
        `&prop=pageimages&piprop=thumbnail&pithumbsize=800` +
        `&format=json&origin=*&redirects=1`;

      const resp = await fetch(wpUrl);
      if (resp.ok) {
        const data = await resp.json();
        if (data.query && data.query.pages) {
          const page = Object.values(data.query.pages)[0];
          if (page && page.thumbnail && page.thumbnail.source) {
            const src = page.thumbnail.source;
            const fname = decodeURIComponent(src.split('/').pop()).toLowerCase();
            if (!BAD_TITLE_WORDS.some(w => fname.includes(w))) {
              imageCache.set(scientificName, src);
              return src;
            }
          }
        }
      }
    } catch (e) {
      // fall through to Commons search
    }

    // Strategy 2: Wikimedia Commons search with strict filtering
    const searchQueries = [
      scientificName,
      `${scientificName} bird`,
    ];

    for (const query of searchQueries) {
      try {
        const url = `https://commons.wikimedia.org/w/api.php?` +
          `action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query)}` +
          `&gsrlimit=8&prop=imageinfo&iiprop=url&iiurlwidth=800` +
          `&format=json&origin=*`;

        const resp = await fetch(url);
        if (!resp.ok) continue;
        const data = await resp.json();
        if (!data.query || !data.query.pages) continue;

        const pages = Object.values(data.query.pages)
          .filter(p => !isBadImageTitle(p.title))
          .sort((a, b) => (a.index || 0) - (b.index || 0));

        if (pages.length > 0 && pages[0].imageinfo && pages[0].imageinfo[0]) {
          const imgUrl = pages[0].imageinfo[0].thumburl || pages[0].imageinfo[0].url;
          imageCache.set(scientificName, imgUrl);
          return imgUrl;
        }
      } catch (e) {
        // continue to next query
      }
    }

    failedSpecies.add(scientificName);
    return null;
  }

  // Preload an image and return a promise
  function preloadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(url);
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = url;
    });
  }

  // --- Spaced Repetition ---
  // Store weights in localStorage; birds answered wrong get higher weight
  const STORAGE_KEY = 'dansk_fugleviden_weights';

  function loadWeights() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function saveWeights(weights) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(weights));
    } catch {
      // storage full or unavailable
    }
  }

  function getWeight(sci, weights) {
    return weights[sci] || 1;
  }

  function recordCorrect(sci, weights) {
    weights[sci] = Math.max(0.5, (weights[sci] || 1) - 0.3);
    saveWeights(weights);
  }

  function recordWrong(sci, weights) {
    weights[sci] = Math.min(5, (weights[sci] || 1) + 1.2);
    saveWeights(weights);
  }

  // --- Weighted random selection ---
  function weightedPick(arr, weights, count, exclude) {
    const pool = arr.filter(b => !exclude.has(b.sci));
    if (pool.length <= count) return [...pool];

    const totalWeight = pool.reduce((sum, b) => sum + getWeight(b.sci, weights), 0);
    const picked = [];
    const usedIndices = new Set();

    while (picked.length < count) {
      let r = Math.random() * totalWeight;
      for (let i = 0; i < pool.length; i++) {
        if (usedIndices.has(i)) continue;
        r -= getWeight(pool[i].sci, weights);
        if (r <= 0) {
          picked.push(pool[i]);
          usedIndices.add(i);
          break;
        }
      }
      // Safety: if we didn't pick (rounding), pick random remaining
      if (picked.length < usedIndices.size) {
        for (let i = 0; i < pool.length; i++) {
          if (!usedIndices.has(i)) {
            picked.push(pool[i]);
            usedIndices.add(i);
            break;
          }
        }
      }
    }
    return picked;
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // --- Easy mode: the most visually distinctive, unmistakable birds ---
  const EASY_BIRDS = new Set([
    'Turdus merula',              // Solsort — jet black, orange beak
    'Passer domesticus',          // Gråspurv — ubiquitous
    'Parus major',                // Musvit — yellow belly, black stripe
    'Cyanistes caeruleus',        // Blåmejse — blue cap
    'Erithacus rubecula',         // Rødkælk — red breast
    'Columba palumbus',           // Ringdue — large, white neck patch
    'Pica pica',                  // Husskade — black/white, long tail
    'Corvus cornix',              // Gråkrage — grey and black
    'Cygnus olor',                // Knopsvane — white swan
    'Anas platyrhynchos',         // Gråand — green head
    'Ardea cinerea',              // Fiskehejre — tall grey
    'Phalacrocorax carbo',        // Skarv — black waterbird
    'Buteo buteo',                // Musvåge — common raptor
    'Larus argentatus',           // Sølvmåge — typical seagull
    'Chroicocephalus ridibundus', // Hættemåge — dark-headed gull
    'Haematopus ostralegus',      // Strandskade — black/white, orange beak
    'Vanellus vanellus',          // Vibe — distinctive crest
    'Dendrocopos major',          // Stor flagspætte — red/black/white
    'Sturnus vulgaris',           // Stær — iridescent
    'Hirundo rustica',            // Landsvale — forked tail
    'Phasianus colchicus',        // Fasan — colourful
    'Anser anser',                // Grågås — common goose
    'Somateria mollissima',       // Ederfugl — distinctive sea duck
    'Fulica atra',                // Blishøne — black, white forehead
    'Fringilla coelebs',          // Bogfinke — colourful finch
  ]);

  // --- App State ---
  let state = {
    difficulty: 'common',
    mode: 'photo',
    totalQuestions: 20,
    currentQuestion: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    questions: [],
    missed: [],
    weights: loadWeights(),
    answered: false,
  };

  // --- DOM references ---
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const screens = {
    start: $('#start-screen'),
    quiz: $('#quiz-screen'),
    results: $('#results-screen'),
  };

  // --- Toggle buttons ---
  function initToggles() {
    document.querySelectorAll('.toggle-group').forEach(group => {
      group.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          group.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });
    });
  }

  function getToggleValue(groupId) {
    const active = document.querySelector(`#${groupId} .toggle-btn.active`);
    return active ? active.dataset.value : null;
  }

  // --- Screen management ---
  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
  }

  // --- Similarity groups for plausible distractors ---
  // Birds in the same group look similar, making the quiz challenging
  const SIMILARITY_GROUPS = {
    tits:       ['Parus major', 'Cyanistes caeruleus', 'Periparus ater', 'Lophophanes cristatus', 'Aegithalos caudatus', 'Sitta europaea'],
    sparrows:   ['Passer domesticus', 'Passer montanus', 'Prunella modularis', 'Emberiza citrinella', 'Emberiza calandra', 'Emberiza schoeniclus', 'Fringilla coelebs', 'Fringilla montifringilla'],
    finches:    ['Chloris chloris', 'Carduelis carduelis', 'Spinus spinus', 'Linaria cannabina', 'Pyrrhula pyrrhula', 'Coccothraustes coccothraustes', 'Loxia curvirostra', 'Loxia leucoptera', 'Loxia pytyopsittacus'],
    thrushes:   ['Turdus merula', 'Turdus philomelos', 'Turdus viscivorus', 'Turdus iliacus', 'Turdus pilaris', 'Sturnus vulgaris'],
    warblers:   ['Phylloscopus trochilus', 'Phylloscopus collybita', 'Phylloscopus sibilatrix', 'Sylvia atricapilla', 'Sylvia borin', 'Curruca communis', 'Curruca curruca', 'Acrocephalus scirpaceus', 'Acrocephalus palustris', 'Acrocephalus schoenobaenus', 'Hippolais icterina', 'Regulus regulus', 'Regulus ignicapilla'],
    corvids:    ['Pica pica', 'Corvus cornix', 'Corvus corone', 'Corvus frugilegus', 'Coloeus monedula', 'Corvus corax', 'Garrulus glandarius', 'Nucifraga caryocatactes'],
    raptors:    ['Buteo buteo', 'Buteo lagopus', 'Accipiter nisus', 'Accipiter gentilis', 'Milvus milvus', 'Milvus migrans', 'Circus aeruginosus', 'Circus cyaneus', 'Circus macrourus', 'Pernis apivorus', 'Haliaeetus albicilla', 'Pandion haliaetus', 'Aquila chrysaetos'],
    falcons:    ['Falco tinnunculus', 'Falco columbarius', 'Falco peregrinus', 'Falco subbuteo', 'Falco vespertinus'],
    owls:       ['Tyto alba', 'Strix aluco', 'Asio otus', 'Asio flammeus'],
    gulls:      ['Larus argentatus', 'Larus canus', 'Chroicocephalus ridibundus', 'Larus marinus', 'Larus fuscus', 'Rissa tridactyla', 'Hydrocoloeus minutus', 'Ichthyaetus melanocephalus', 'Xema sabini'],
    terns:      ['Sterna hirundo', 'Sterna paradisaea', 'Sternula albifrons', 'Thalasseus sandvicensis', 'Hydroprogne caspia', 'Chlidonias niger'],
    ducks:      ['Anas platyrhynchos', 'Anas crecca', 'Mareca penelope', 'Anas acuta', 'Spatula clypeata', 'Spatula querquedula', 'Aythya fuligula', 'Aythya ferina', 'Aythya marila', 'Bucephala clangula'],
    seaducks:   ['Somateria mollissima', 'Melanitta nigra', 'Melanitta fusca', 'Clangula hyemalis', 'Mergus serrator', 'Mergus merganser', 'Mergellus albellus'],
    geese:      ['Anser anser', 'Branta leucopsis', 'Branta canadensis', 'Anser brachyrhynchus', 'Anser albifrons', 'Branta bernicla'],
    swans:      ['Cygnus olor', 'Cygnus cygnus', 'Cygnus columbianus'],
    waders:     ['Haematopus ostralegus', 'Vanellus vanellus', 'Tringa totanus', 'Tringa nebularia', 'Tringa ochropus', 'Tringa glareola', 'Actitis hypoleucos', 'Numenius arquata', 'Numenius phaeopus', 'Limosa lapponica', 'Limosa limosa', 'Recurvirostra avosetta'],
    sandpipers: ['Calidris pugnax', 'Calidris alpina', 'Calidris alba', 'Calidris canutus', 'Calidris maritima', 'Calidris minuta', 'Gallinago gallinago', 'Lymnocryptes minimus', 'Scolopax rusticola'],
    plovers:    ['Charadrius hiaticula', 'Charadrius dubius', 'Pluvialis apricaria', 'Pluvialis squatarola', 'Arenaria interpres', 'Anarhynchus alexandrinus'],
    grebes:     ['Podiceps cristatus', 'Tachybaptus ruficollis', 'Podiceps grisegena', 'Podiceps nigricollis'],
    swallows:   ['Hirundo rustica', 'Delichon urbicum', 'Riparia riparia', 'Apus apus'],
    wagtails:   ['Motacilla alba', 'Motacilla flava', 'Motacilla cinerea', 'Anthus trivialis', 'Anthus pratensis', 'Anthus petrosus'],
    woodpeckers:['Dendrocopos major', 'Dryobates minor', 'Picus viridis', 'Dryocopus martius', 'Jynx torquilla'],
    pigeons:    ['Columba palumbus', 'Streptopelia decaocto', 'Columba oenas'],
    flycatchers:['Ficedula hypoleuca', 'Ficedula parva', 'Muscicapa striata', 'Erithacus rubecula', 'Phoenicurus phoenicurus', 'Phoenicurus ochruros', 'Saxicola rubicola', 'Oenanthe oenanthe', 'Luscinia luscinia'],
    herons:     ['Ardea cinerea', 'Botaurus stellaris', 'Ardea alba', 'Egretta garzetta', 'Platalea leucorodia', 'Ciconia ciconia', 'Ciconia nigra'],
    auks:       ['Uria aalge', 'Alca torda', 'Alle alle', 'Fratercula arctica', 'Cepphus grylle'],
    gamebirds:  ['Phasianus colchicus', 'Perdix perdix', 'Coturnix coturnix'],
  };

  // Build a reverse lookup: scientific name → list of group keys
  const speciesGroups = {};
  for (const [group, members] of Object.entries(SIMILARITY_GROUPS)) {
    for (const sci of members) {
      if (!speciesGroups[sci]) speciesGroups[sci] = [];
      speciesGroups[sci].push(group);
    }
  }

  function getSimilarBirds(bird, pool) {
    const groups = speciesGroups[bird.sci] || [];
    if (groups.length === 0) return [];
    const memberScis = new Set();
    for (const g of groups) {
      for (const sci of SIMILARITY_GROUPS[g]) {
        if (sci !== bird.sci) memberScis.add(sci);
      }
    }
    return pool.filter(b => memberScis.has(b.sci));
  }

  // --- Generate quiz questions ---
  function generateQuestions() {
    const pool = state.difficulty === 'easy'
      ? BIRDS.filter(b => EASY_BIRDS.has(b.sci))
      : state.difficulty === 'common'
      ? BIRDS.filter(b => b.common)
      : [...BIRDS];

    const numQ = Math.min(state.totalQuestions, pool.length);
    const picked = weightedPick(pool, state.weights, numQ, new Set());

    // For each question, pick distractors — prefer similar-looking birds
    return picked.map(bird => {
      const used = new Set([bird.sci]);
      const distractors = [];

      // First: pick from similar birds (same visual group)
      const similar = shuffle(getSimilarBirds(bird, pool));
      for (const s of similar) {
        if (distractors.length >= 3) break;
        if (!used.has(s.sci)) {
          used.add(s.sci);
          distractors.push(s);
        }
      }

      // Second: pick from same genus (taxonomically related)
      if (distractors.length < 3) {
        const genus = bird.sci.split(' ')[0];
        const genusBirds = shuffle(pool.filter(b => b.sci.startsWith(genus + ' ') && !used.has(b.sci)));
        for (const g of genusBirds) {
          if (distractors.length >= 3) break;
          used.add(g.sci);
          distractors.push(g);
        }
      }

      // Fill remaining slots with random birds from pool
      if (distractors.length < 3) {
        const remaining = shuffle(pool.filter(b => !used.has(b.sci)));
        for (const r of remaining) {
          if (distractors.length >= 3) break;
          used.add(r.sci);
          distractors.push(r);
        }
      }

      // Determine mode for this question
      let qMode = state.mode;
      if (qMode === 'mixed') {
        qMode = Math.random() < 0.5 ? 'photo' : 'name';
      }

      return {
        bird,
        distractors,
        options: shuffle([bird, ...distractors]),
        mode: qMode,
      };
    });
  }

  // --- Render quiz question ---
  async function renderQuestion() {
    const q = state.questions[state.currentQuestion];
    if (!q) return;

    state.answered = false;

    // Update header
    $('#score-text').textContent = `${state.score} rigtige`;
    $('#question-counter-text').textContent = `${state.currentQuestion + 1} / ${state.questions.length}`;
    $('#progress-bar').style.width = `${((state.currentQuestion) / state.questions.length) * 100}%`;

    if (q.mode === 'photo') {
      $('#photo-mode').style.display = 'flex';
      $('#name-mode').style.display = 'none';
      await renderPhotoMode(q);
    } else {
      $('#photo-mode').style.display = 'none';
      $('#name-mode').style.display = 'flex';
      await renderNameMode(q);
    }
  }

  async function renderPhotoMode(q) {
    const photo = $('#bird-photo');
    const loading = $('#photo-loading');
    const overlay = $('#photo-overlay');

    // Reset
    photo.classList.remove('loaded');
    loading.classList.remove('hidden');
    overlay.className = 'photo-overlay';

    // Fetch and display image
    const imgUrl = await fetchBirdImage(q.bird.sci);
    if (imgUrl) {
      photo.src = imgUrl;
      photo.onload = () => {
        photo.classList.add('loaded');
        loading.classList.add('hidden');
      };
      photo.onerror = () => {
        loading.innerHTML = '<span style="color:var(--text-muted)">Billede ikke tilgængeligt</span>';
      };
    } else {
      loading.innerHTML = '<span style="color:var(--text-muted)">Billede ikke tilgængeligt</span>';
    }

    // Render text options
    const grid = $('#photo-options');
    grid.innerHTML = '';
    q.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.textContent = opt.da;
      btn.addEventListener('click', () => handleAnswer(q, opt, btn, 'photo'));
      grid.appendChild(btn);
    });
  }

  async function renderNameMode(q) {
    // Show bird name
    $('#bird-name-display').textContent = q.bird.da;
    $('#bird-sci-display').textContent = q.bird.sci;

    // Render photo options
    const grid = $('#name-options');
    grid.innerHTML = '';

    // Start loading all 4 images in parallel
    const imagePromises = q.options.map(async (opt) => {
      const url = await fetchBirdImage(opt.sci);
      return { opt, url };
    });

    const results = await Promise.all(imagePromises);

    results.forEach(({ opt, url }) => {
      const card = document.createElement('div');
      card.className = 'photo-option';

      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'photo-option-loading';
      const spinner = document.createElement('div');
      spinner.className = 'spinner';
      loadingDiv.appendChild(spinner);

      const img = document.createElement('img');
      img.alt = opt.da;
      if (url) {
        img.src = url;
        img.onload = () => {
          img.classList.add('loaded');
          loadingDiv.classList.add('hidden');
        };
      } else {
        loadingDiv.innerHTML = '<span style="color:var(--text-muted);font-size:0.75rem">Intet foto</span>';
      }

      const label = document.createElement('div');
      label.className = 'photo-option-label';
      label.textContent = opt.da;

      card.appendChild(loadingDiv);
      card.appendChild(img);
      card.appendChild(label);

      card.addEventListener('click', () => handleAnswer(q, opt, card, 'name'));
      grid.appendChild(card);
    });
  }

  // --- Handle answer ---
  function handleAnswer(q, chosen, element, mode) {
    if (state.answered) return;
    state.answered = true;

    const isCorrect = chosen.sci === q.bird.sci;

    if (isCorrect) {
      state.score++;
      state.streak++;
      state.bestStreak = Math.max(state.bestStreak, state.streak);
      recordCorrect(q.bird.sci, state.weights);
    } else {
      state.streak = 0;
      recordWrong(q.bird.sci, state.weights);
      state.missed.push(q.bird);
    }

    // Update score display immediately
    $('#score-text').textContent = `${state.score} rigtige`;

    if (mode === 'photo') {
      // Mark all buttons
      const buttons = $('#photo-options').querySelectorAll('.option-btn');
      buttons.forEach(btn => {
        btn.classList.add('disabled');
        if (btn.textContent === q.bird.da) {
          btn.classList.add('correct');
        } else if (btn === element && !isCorrect) {
          btn.classList.add('wrong');
        } else {
          btn.classList.add('dimmed');
        }
      });

      // Photo overlay
      const overlay = $('#photo-overlay');
      overlay.classList.add(isCorrect ? 'correct' : 'wrong');
    } else {
      // Name mode — mark photo cards
      const cards = $('#name-options').querySelectorAll('.photo-option');
      cards.forEach(card => {
        card.classList.add('disabled', 'answered');
        const label = card.querySelector('.photo-option-label');
        const img = card.querySelector('img');
        if (img && img.alt === q.bird.da) {
          card.classList.add('correct');
        } else if (card === element && !isCorrect) {
          card.classList.add('wrong');
        } else {
          card.classList.add('dimmed');
        }
      });
    }

    // Advance after delay
    setTimeout(() => {
      state.currentQuestion++;
      if (state.currentQuestion >= state.questions.length) {
        showResults();
      } else {
        renderQuestion();
      }
    }, 1400);
  }

  // --- Results screen ---
  function showResults() {
    // Update progress bar to full
    $('#progress-bar').style.width = '100%';

    const pct = Math.round((state.score / state.questions.length) * 100);
    const total = state.questions.length;

    // Icon and title based on score
    let icon, title, subtitle;
    if (pct >= 90) {
      icon = '🏆';
      title = 'Fantastisk!';
      subtitle = 'Du er en sand fugleekspert!';
    } else if (pct >= 70) {
      icon = '🌟';
      title = 'Flot klaret!';
      subtitle = 'Du kender dine fugle godt.';
    } else if (pct >= 50) {
      icon = '👍';
      title = 'Godt gået!';
      subtitle = 'Der er stadig lidt at lære.';
    } else {
      icon = '🌱';
      title = 'Øvelse gør mester';
      subtitle = 'Prøv igen og bliv bedre!';
    }

    $('#results-icon').textContent = icon;
    $('#results-title').textContent = title;
    $('#results-subtitle').textContent = subtitle;
    $('#score-pct').textContent = `${pct}%`;
    $('#stat-correct').textContent = state.score;
    $('#stat-wrong').textContent = total - state.score;
    $('#stat-streak').textContent = state.bestStreak;

    // Animate ring
    const circumference = 2 * Math.PI * 52;
    const ring = $('#score-ring-fill');
    ring.style.strokeDasharray = circumference;
    ring.style.strokeDashoffset = circumference;
    requestAnimationFrame(() => {
      ring.style.strokeDashoffset = circumference - (pct / 100) * circumference;
    });

    // Color ring based on score
    if (pct >= 70) {
      ring.style.stroke = 'var(--correct)';
    } else if (pct >= 40) {
      ring.style.stroke = 'var(--warning)';
    } else {
      ring.style.stroke = 'var(--wrong)';
    }

    // Missed birds
    const missedContainer = $('#results-missed');
    const missedList = $('#missed-list');
    missedList.innerHTML = '';

    if (state.missed.length > 0) {
      missedContainer.style.display = 'block';
      // Deduplicate
      const unique = [...new Map(state.missed.map(b => [b.sci, b])).values()];
      unique.forEach(bird => {
        const item = document.createElement('div');
        item.className = 'missed-item';

        const img = document.createElement('img');
        img.className = 'missed-item-thumb';
        img.alt = bird.da;
        const cached = imageCache.get(bird.sci);
        if (cached) img.src = cached;

        const info = document.createElement('div');
        info.className = 'missed-item-info';
        info.innerHTML = `<div class="missed-item-da">${bird.da}</div><div class="missed-item-en">${bird.en}</div>`;

        item.appendChild(img);
        item.appendChild(info);
        missedList.appendChild(item);
      });
    } else {
      missedContainer.style.display = 'none';
    }

    showScreen('results');
  }

  // --- Start quiz ---
  function startQuiz() {
    state.difficulty = getToggleValue('difficulty-toggle') || 'common';
    state.mode = getToggleValue('mode-toggle') || 'photo';
    state.totalQuestions = parseInt(getToggleValue('count-toggle') || '20', 10);
    state.currentQuestion = 0;
    state.score = 0;
    state.streak = 0;
    state.bestStreak = 0;
    state.missed = [];
    state.answered = false;

    state.questions = generateQuestions();

    showScreen('quiz');
    renderQuestion();
  }

  // --- Event Listeners ---
  function init() {
    initToggles();

    $('#start-btn').addEventListener('click', startQuiz);
    $('#retry-btn').addEventListener('click', startQuiz);
    $('#home-btn').addEventListener('click', () => showScreen('start'));
    $('#quit-btn').addEventListener('click', () => {
      if (state.currentQuestion > 0) {
        showResults();
      } else {
        showScreen('start');
      }
    });
  }

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
