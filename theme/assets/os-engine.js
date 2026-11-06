/* os-engine.js: from the old web/pages/_engine.html (OScreenplay's engine, unchanged). Structures, Spark, reactions, doctor, script, SVG drawings, popovers. */
(function () {
  'use strict';
  var OS = window.OS = window.OS || {};
  var esc = function (s) { return UI.esc(s); };

  /* this app's extra icons live in app-kit.js (UI.ICONS), so icons.css has them too */

  /* ======================================================================== small utilities */
  OS.uid = function (p) { return (p || 'x') + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 6); };
  OS.rnd = Math.random;
  OS.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  OS.pickN = function (arr, n) { return OS.shuffle(arr.slice()).slice(0, n); };
  OS.shuffle = function (a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  OS.cap = function (s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); };
  OS.lower1 = function (s) { s = String(s || ''); return s.charAt(0).toLowerCase() + s.slice(1); };
  OS.article = function (w) { return /^[aeiou]/i.test(String(w || '').trim()) && !/^(one|uni|use|eu)/i.test(w) ? 'an' : 'a'; };
  OS.titleCase = function (s) {
    var small = { a: 1, an: 1, the: 1, of: 1, in: 1, on: 1, and: 1, or: 1, to: 1, at: 1, for: 1 };
    return String(s || '').split(' ').map(function (w, i) { return i && small[w.toLowerCase()] ? w.toLowerCase() : OS.cap(w); }).join(' ');
  };
  OS.base = function (vp) {   // "falls in love" -> "fall in love" (for "has until sunrise to ...")
    var p = String(vp || '').trim().split(' '), w = p[0] || '', irregular = { is: 'be', has: 'have', does: 'do', goes: 'go' };
    if (w === 'must') return p.slice(1).join(' ');
    if (irregular[w]) w = irregular[w];
    else if (/(ss|sh|ch|x|z)es$/.test(w)) w = w.slice(0, -2);
    else if (/[^aeiou]ies$/.test(w)) w = w.slice(0, -3) + 'y';
    else if (/s$/.test(w) && !/ss$/.test(w)) w = w.slice(0, -1);
    p[0] = w;
    return p.join(' ');
  };
  /* "wants to adopt a child" -> "adopt a child": the goal itself, for "must ..." and "has until ... to ...". */
  OS.goal = function (vp) {
    var v = String(vp || '').trim(), m = v.match(/^(wants|needs|tries|decides|sets out|vows|plans|promises|is determined|hopes) to (.*)$/);
    return m ? m[2] : OS.base(v);
  };
  OS.first = function (name) {   // first name, skipping titles: "Sgt. Ada Moreno" -> "Ada"
    var p = String(name || '').replace(/"[^"]*"/g, ' ').trim().split(/\s+/);
    while (p.length > 1 && /^(sgt|dr|mr|mrs|ms|mx|count|countess|lady|lord|sir|father|sister|mother|captain|capt|det|officer|prof|uncle|aunt)\.?$/i.test(p[0])) p.shift();
    return p[0] || String(name || '');
  };
  OS.words = function (s) { return String(s || '').trim().split(/\s+/).filter(Boolean).length; };
  OS.ideaCount = function () { var n = 0; Object.keys(OS.L).forEach(function (k) { n += OS.L[k].length; }); Object.keys(OS.S).forEach(function (k) { n += (OS.S[k] || []).length; }); return n; };
  OS.daily = function (list) { var d = new Date(), n = d.getFullYear() * 400 + d.getMonth() * 31 + d.getDate(); return list[n % list.length]; };
  OS.find = function (list, id) { for (var i = 0; i < (list || []).length; i++) if (list[i].id === id) return list[i]; return null; };
  OS.charName = function (doc, id) { var c = OS.find(doc.characters, id); return c ? c.name : '?'; };

  /* ======================================================================== formats, colours, structures */
  OS.FORMATS = {
    feature: { name: 'Feature film', short: 'Feature', pages: [90, 120], target: 105, about: 'One page is about one minute on screen.' },
    short: { name: 'Short film', short: 'Short', pages: [5, 20], target: 12, about: 'Festivals love 8 to 15 minutes. One idea, one turn.' },
    pilot30: { name: 'TV pilot, half hour', short: 'Pilot 30', pages: [25, 38], target: 32, about: 'Comedy and dramedy pilots. Cold open, two or three acts, tag.' },
    pilot60: { name: 'TV pilot, one hour', short: 'Pilot 60', pages: [50, 66], target: 58, about: 'Teaser plus four or five acts, each ending on a turn.' },
    vertical: { name: 'Vertical micro-drama episode', short: 'Vertical', pages: [1, 3], target: 2, about: 'Phone-first series in 60 to 120 second episodes. Hook in 3 seconds, cliffhanger at the end.' }
  };
  OS.COLORS = { ember: ['#c8102e', '#3a0a12'], tungsten: ['#d69a1f', '#3b2a07'], teal: ['#2a9d8f', '#0b2e2a'], violet: ['#7b4bd6', '#1f1238'],
    ink: ['#4a5264', '#0d0f13'], rose: ['#e0457b', '#3a0f1f'], moss: ['#6b8f3a', '#18220c'] };
  OS.posterStyle = function (color) { var c = OS.COLORS[color] || OS.COLORS.ember; return '--p1:' + c[0] + ';--p2:' + c[1]; };

  function B(k, n, pct, d, q) { return { k: k, n: n, pct: pct, d: d, q: q }; }
  OS.STRUCTURES = {
    circle: { name: 'Story Circle', by: 'Dan Harmon', short: '8 steps. The engine behind every Rick and Morty episode: order, chaos, change.',
      beats: [B('you', 'You', 0, 'A character in a zone of comfort.', 'Who are they, and what does their normal look like? Show the flaw in action.'),
        B('need', 'Need', .125, 'But they want something.', 'What do they want, and why can\'t they have it right now?'),
        B('go', 'Go', .25, 'They enter an unfamiliar situation.', 'What pushes them across the threshold, into chaos?'),
        B('search', 'Search', .375, 'They adapt to it.', 'New rules, allies and enemies. How do they fail, and learn?'),
        B('find', 'Find', .5, 'They get what they wanted.', 'The midpoint: what do they find, or think they find?'),
        B('take', 'Take', .625, 'They pay a heavy price for it.', 'What does it cost? Something must be lost.'),
        B('return', 'Return', .75, 'They go back to where they started.', 'How do they come back, and what do they bring with them?'),
        B('change', 'Change', .875, 'Having changed.', 'Show how they\'re different now. Mirror the opening.')] },
    three: { name: 'Three acts', by: 'Aristotle to Syd Field', short: 'Setup, confrontation, resolution, with turning points at 25% and 75%.',
      beats: [B('hook', 'Opening hook', 0, 'Grab us, and show the world.', 'What image or moment makes us lean in?'),
        B('inciting', 'Inciting incident', .1, 'The event that starts the story.', 'What happens TO the hero that they can\'t ignore?'),
        B('pp1', 'Plot point 1', .25, 'The hero commits. Act Two begins.', 'What choice locks them into the story?'),
        B('pinch1', 'Pinch point 1', .375, 'The antagonist shows their power.', 'Remind us what the hero is up against.'),
        B('mid', 'Midpoint', .5, 'A reversal: the hero goes from reacting to acting.', 'What do they learn that changes the plan?'),
        B('pinch2', 'Pinch point 2', .625, 'The pressure tightens.', 'How does the antagonist strike back?'),
        B('pp2', 'Plot point 2', .75, 'The lowest point, then the final push.', 'What is lost, and what new idea does it bring?'),
        B('climax', 'Climax', .88, 'The decisive confrontation.', 'How does the hero settle the outer and the inner conflict?'),
        B('resolution', 'Resolution', .97, 'The new normal.', 'What does the world look like now?')] },
    cat: { name: 'Save the Cat', by: 'Blake Snyder', short: '15 beats with page targets, the Hollywood beat sheet.',
      beats: [B('opening', 'Opening image', 0, 'A snapshot of the hero\'s problem.', 'What single image shows the "before"?'),
        B('theme', 'Theme stated', .045, 'Someone says the lesson, and the hero ignores it.', 'Who says the theme, and how does the hero brush it off?'),
        B('setup', 'Set-up', .05, 'The hero\'s world and everything that needs fixing.', 'What are the "six things that need fixing"?'),
        B('catalyst', 'Catalyst', .11, 'Life-changing news.', 'What arrives that changes everything?'),
        B('debate', 'Debate', .15, 'Should I go?', 'What does the hero fear about saying yes?'),
        B('break2', 'Break into Two', .23, 'The hero chooses the new world.', 'What active choice do they make?'),
        B('bstory', 'B story', .27, 'The love or friendship story that carries the theme.', 'Who helps the hero learn the lesson?'),
        B('fun', 'Fun and games', .3, 'The promise of the premise.', 'What scenes are the reason people buy the ticket?'),
        B('midpoint', 'Midpoint', .5, 'A false victory or a false defeat. Stakes rise.', 'What raises the stakes, or puts a clock on it?'),
        B('badguys', 'Bad guys close in', .55, 'Doubt, jealousy and the enemy regroup.', 'How does it fall apart from inside and out?'),
        B('allislost', 'All is lost', .68, 'The "whiff of death".', 'What dies here: a mentor, a dream, a relationship?'),
        B('darknight', 'Dark night of the soul', .7, 'The hero hits bottom.', 'What do they finally admit?'),
        B('break3', 'Break into Three', .77, 'The solution, thanks to the B story.', 'What idea combines the A and B stories?'),
        B('finale', 'Finale', .8, 'The hero proves the change.', 'How do they storm the castle, differently?'),
        B('final', 'Final image', .99, 'The opposite of the opening image.', 'What image proves the change?')] },
    hero: { name: 'Hero\'s Journey', by: 'Joseph Campbell, Christopher Vogler', short: '12 stages of the monomyth, from the ordinary world and back with the elixir.',
      beats: [B('ordinary', 'Ordinary world', 0, 'The hero at home.', 'What is missing in their life?'),
        B('call', 'Call to adventure', .08, 'A problem or a challenge appears.', 'Who or what delivers the call?'),
        B('refusal', 'Refusal of the call', .12, 'Fear, doubt, duty.', 'Why do they say no at first?'),
        B('mentor', 'Meeting the mentor', .17, 'Advice, a gift, confidence.', 'What does the mentor give them?'),
        B('threshold', 'Crossing the threshold', .25, 'Into the special world.', 'What is the point of no return?'),
        B('tests', 'Tests, allies, enemies', .3, 'Learning the rules.', 'Who joins them, who opposes them?'),
        B('approach', 'Approach to the inmost cave', .45, 'Preparing for the big ordeal.', 'What is the plan, and what doubts appear?'),
        B('ordeal', 'The ordeal', .5, 'Facing death, or the greatest fear.', 'What must they survive?'),
        B('reward', 'Reward', .6, 'Seizing the sword.', 'What do they gain?'),
        B('roadback', 'The road back', .75, 'Consequences catch up.', 'What chases them home?'),
        B('resurrection', 'Resurrection', .88, 'A final test, a rebirth.', 'How do they prove they\'ve changed?'),
        B('elixir', 'Return with the elixir', .96, 'Home, transformed.', 'What do they bring back for others?')] },
    seq: { name: 'Eight sequences', by: 'Frank Daniel', short: 'Eight 12 to 15 minute mini-movies, each with its own tension. The Godfather plays beautifully this way.',
      beats: [B('seq_a', 'A · Status quo, inciting incident', 0, 'The world, the hero, the event.', 'What do we need to know, and what breaks it?'),
        B('seq_b', 'B · Predicament, lock-in', .125, 'The hero gets stuck in the problem.', 'What makes walking away impossible?'),
        B('seq_c', 'C · First obstacle', .25, 'The first serious attempt.', 'What does the hero try first, and why does it fail?'),
        B('seq_d', 'D · First culmination', .375, 'Rising to the midpoint.', 'What victory or defeat closes the first half?'),
        B('seq_e', 'E · New plan, subplot', .5, 'Regrouping; subplots carry the theme.', 'What does the hero try now, and who is affected?'),
        B('seq_f', 'F · Main culmination', .625, 'The end of Act Two: the biggest turn.', 'What is the point of greatest pressure?'),
        B('seq_g', 'G · New tension, twist', .75, 'The last push, with a twist.', 'What surprise sends the story into its final act?'),
        B('seq_h', 'H · Resolution', .875, 'Climax and the new normal.', 'How is it settled, and what does it mean?')] },
    kisho: { name: 'Kishōtenketsu', by: 'Classical Chinese and Japanese poetics', short: 'Four parts and no central conflict: the twist recontextualises everything.',
      beats: [B('ki', 'Ki · Introduction', 0, 'Characters and world.', 'What is ordinary here?'),
        B('sho', 'Shō · Development', .25, 'Deepen it, without conflict.', 'What do we learn as life goes on?'),
        B('ten', 'Ten · Twist', .5, 'Something unexpected, seemingly unrelated.', 'What new element appears?'),
        B('ketsu', 'Ketsu · Reconciliation', .75, 'The parts come together.', 'How does the twist change the meaning of all the rest?')] }
  };
  OS.STRUCTURE_ORDER = ['circle', 'three', 'cat', 'hero', 'seq', 'kisho'];
  OS.beatsOf = function (key) { return (OS.STRUCTURES[key] || OS.STRUCTURES.circle).beats; };
  OS.beat = function (key, k) { var b = OS.beatsOf(key); for (var i = 0; i < b.length; i++) if (b[i].k === k) return b[i]; return null; };
  /* Moving to another structure: every scene goes to the beat nearest to where it sat before. */
  OS.remapBeats = function (scenes, from, to) {
    var nb = OS.beatsOf(to);
    (scenes || []).forEach(function (s, i) {
      var old = OS.beat(from, s.beat), pct = old ? old.pct : (scenes.length ? i / scenes.length : 0), best = nb[0];
      nb.forEach(function (b) { if (b.pct <= pct + 0.02) best = b; });
      s.beat = best.k;
    });
  };

  /* ======================================================================== project documents */
  OS.newDoc = function () {
    return { premise: '', theme: '', theme_answer: '', tone: '', world: '', notes: '', logline_parts: {}, characters: [], relations: [], events: [], scenes: [], plants: [], script: [] };
  };
  OS.normalize = function (doc) {
    doc = doc && typeof doc === 'object' ? doc : {};
    var d = OS.newDoc();
    Object.keys(d).forEach(function (k) { if (doc[k] == null || (Array.isArray(d[k]) && !Array.isArray(doc[k]))) doc[k] = d[k]; });
    doc.characters.forEach(function (c) { c.traits = c.traits || { O: 50, C: 50, E: 50, A: 50, N: 50 }; });
    doc.scenes.forEach(function (s) { s.chars = s.chars || []; s.events = s.events || []; });
    doc.events.forEach(function (e) { e.chars = e.chars || []; });
    return doc;
  };
  OS.blankCharacter = function (role) {
    return { id: OS.uid('c'), name: '', role: role || 'supporting', archetype: '', age: '', occupation: '', want: '', need: '', wound: '', lie: '', flaw: '',
      fear: '', value: '', secret: '', quirk: '', voice: '', condition: '', skills: '', look: '', arc: 'positive', backstory: '', notes: '',
      traits: { O: 50, C: 50, E: 50, A: 50, N: 50 } };
  };
  OS.suggestName = function () { return OS.pick(OS.NAMES.first) + ' ' + OS.pick(OS.NAMES.last); };
  OS.rollCharacter = function (role) {
    var c = OS.blankCharacter(role), arch = OS.pick(OS.L.archetypes), wound = OS.pick(OS.L.wounds), voice = OS.pick(OS.L.voices);
    c.name = OS.suggestName(); c.archetype = arch.t; c.occupation = OS.pick(OS.L.occupations).t; c.age = String(18 + Math.floor(Math.random() * 55));
    c.want = 'To ' + OS.goal(OS.pick(OS.S.want).t); c.need = 'To accept that ' + OS.pick(OS.S.truth).t; c.wound = wound.t; c.lie = wound.x;
    c.flaw = OS.pick(OS.L.flaws).t; c.fear = OS.pick(OS.L.fears).t; c.value = OS.pick(OS.L.values).t; c.secret = OS.pick(OS.L.secrets).t;
    c.quirk = OS.pick(OS.L.quirks).t; c.voice = voice.t; c.arc = OS.pick(['positive', 'positive', 'negative', 'flat']);
    'OCEAN'.split('').forEach(function (k) { c.traits[k] = 15 + Math.floor(Math.random() * 70); });
    return c;
  };
  /* A backstory paragraph from the fields that are filled in. */
  OS.backstoryDraft = function (c) {
    var n = OS.first(c.name || 'They'), out = [];
    out.push(n + (c.age ? ', ' + c.age + ',' : '') + (c.occupation ? ' works as ' + OS.article(c.occupation) + ' ' + c.occupation.toLowerCase() + '.' : ' keeps their life small and orderly.'));
    if (c.wound) out.push('Years ago, ' + n + ' ' + OS.lower1(c.wound).replace(/^was /, 'was ') + '. Nobody talks about it.');
    if (c.lie) out.push('Since then, ' + n + ' has believed one thing: "' + c.lie.replace(/\.$/, '') + '."');
    if (c.flaw) out.push('It shows as ' + c.flaw.toLowerCase() + ', which everyone around them has learned to work around.');
    if (c.fear) out.push('What ' + n + ' fears most: ' + c.fear.toLowerCase() + '.');
    if (c.secret) out.push('Their secret: ' + OS.lower1(c.secret) + '.');
    if (c.want) out.push('Right now, ' + n + ' wants ' + OS.lower1(c.want).replace(/^to /, 'to ') + '.');
    if (c.need) out.push('What they need, and can\'t see yet, is ' + OS.lower1(c.need).replace(/^to /, 'to ') + '.');
    return out.join(' ');
  };

  /* ======================================================================== the Spark generator */
  var SLOT_INFO = {
    setting: ['Setting', 'Where and when'], adj: ['Trait', 'What kind of hero'], hero: ['Hero', 'Who the story follows'], want: ['Want', 'What they go after'],
    obstacle: ['Obstacle', 'What stands in the way'], enemy: ['Opposition', 'Who or what opposes them'], twist: ['Twist', 'The turn that changes everything'],
    truth: ['Truth', 'What they learn (the theme)'], stakes: ['Stakes', 'What happens if they fail'], clock: ['Clock', 'The deadline'],
    inciting: ['Inciting incident', 'What starts it'], title: ['Title', 'What it\'s called']
  };
  var TEMPLATES = {
    until: { name: 'Until one day', tpl: '{setting}, {a} {adj} {hero} {want}, but {obstacle}. Until one day {twist}, and the {hero:echo} learns that {truth}.' },
    spine: { name: 'Story spine', tpl: 'Once upon a time, {setting:lower}, there lived {a} {adj} {hero} who {want}. Every day, the {hero:echo} {obstacle}. Until one day {twist}. And because of that, the {hero:echo} finally understood that {truth}.' },
    clock: { name: 'Ticking clock', tpl: '{setting}, {a} {adj} {hero} has until {clock} to {want:base}. The trouble is, the {hero:echo} {obstacle}, and if they fail, {stakes}. Then {twist}, and everything turns on one discovery: {truth}.' },
    mystery: { name: 'Mystery', tpl: 'When {inciting}, {a} {adj} {hero} {want}. But the {hero:echo} {obstacle}, and when {twist}, everything they believed falls apart. In the end, {truth}.' },
    comedy: { name: 'Comedy of errors', tpl: '{setting}, {a} {adj} {hero} {want}. Simple, except the {hero:echo} {obstacle}, and every fix makes it worse. It all collapses when {twist}, which is exactly when the {hero:echo} discovers that {truth}.' },
    tragedy: { name: 'Tragedy', tpl: '{setting}, {a} {adj} {hero} {want}, and will pay any price for it. The {hero:echo} {obstacle}, so they make a deal they shouldn\'t. By the time {twist}, it\'s too late to learn that {truth}.' }
  };
  var POOLS = { setting: 'setting', adj: 'adj', hero: 'hero', want: 'want', obstacle: 'obstacle', twist: 'twist', truth: 'truth', stakes: 'stakes', clock: 'clock', inciting: 'inciting' };
  var spark = OS.spark = { SLOTS: SLOT_INFO, TEMPLATES: TEMPLATES, ORDER: ['title', 'setting', 'adj', 'hero', 'want', 'obstacle', 'enemy', 'twist', 'truth', 'inciting', 'clock', 'stakes'] };

  /* Items for a slot, filtered to the genre unless weirdness wins the coin toss. */
  spark.pool = function (slot, genre, weird) {
    var items = OS.S[POOLS[slot]] || [];
    if (!genre || genre === 'any' || Math.random() * 100 < (weird || 0)) return items;
    var fit = items.filter(function (it) { return !it.g.length || it.g.indexOf(genre) >= 0; });
    return fit.length >= 3 ? fit : items;
  };
  spark.options = function (slot, st, n) {
    if (slot === 'title') { var t = []; for (var i = 0; i < 24 && t.length < (n || 8); i++) { var x = spark.makeTitle(st); if (t.indexOf(x) < 0 && x !== st.slots.title) t.push(x); } return t; }
    if (slot === 'enemy') {
      return OS.shuffle(OS.S.obstacle.map(function (o) { return o.x; }).filter(function (x, i, a) { return x && a.indexOf(x) === i && x !== st.slots.enemy; })).slice(0, n || 8);
    }
    var cur = st.slots[slot];
    return OS.shuffle(spark.pool(slot, st.flavor, 25).map(function (i) { return i.t; }).filter(function (t) { return t !== cur; })).slice(0, n || 8);
  };
  spark.makeTitle = function (st) {
    var s = st.slots, H = OS.titleCase(s.hero || 'Stranger'), W = OS.pick(OS.S.titleWord), W2 = OS.pick(OS.S.titleWord),
      enemyNoun = OS.titleCase(String(s.enemy || '').replace(/^the /i, '')), clock = OS.titleCase(s.clock || 'Sunrise');
    var pats = ['The Last ' + H, W + ' Season', 'A ' + H + ' in ' + W, W + ' & ' + W2, 'The ' + H + '\'s ' + W, 'No ' + W + ' Tonight', 'Until ' + clock,
      enemyNoun ? 'There Is No ' + enemyNoun : W + ' Country', 'Salt and ' + W, 'Small ' + W, H + ', Interrupted', 'Love, the ' + H, 'Before ' + clock];
    return OS.pick(pats);
  };
  spark.fresh = function () { return { slots: {}, locked: {}, tpl: 'until', genre: 'any', weird: 20, flavor: null }; };
  spark.generate = function (st) {
    st = st || spark.fresh();
    st.locked = st.locked || {};
    st.flavor = st.genre && st.genre !== 'any' ? st.genre : OS.pick(OS.GENRES)[0];
    var w = st.weird == null ? 20 : st.weird;
    Object.keys(POOLS).forEach(function (slot) {
      if (st.locked[slot] && st.slots[slot]) return;
      var item = OS.pick(spark.pool(slot, st.flavor, w));
      st.slots[slot] = item.t;
      if (slot === 'obstacle' && !st.locked.enemy) st.slots.enemy = item.x || 'the opposition';
    });
    if (!st.locked.title || !st.slots.title) st.slots.title = spark.makeTitle(st);
    st._names = null; st._cast = null;
    return st;
  };
  spark.set = function (st, slot, value) {
    st.slots[slot] = value;
    if (slot === 'obstacle' && !st.locked.enemy) {
      var it = OS.S.obstacle.filter(function (o) { return o.t === value; })[0];
      if (it && it.x) st.slots.enemy = it.x;
    }
  };
  /* The abstract as HTML (chips) or plain text. */
  spark.render = function (st, asText) {
    var s = st.slots, tpl = (TEMPLATES[st.tpl] || TEMPLATES.until).tpl;
    function chip(slot, text, cls, nested) {
      if (asText) return text;
      return '<span ' + (nested ? '' : 'role="button" tabindex="0" ') + 'class="os-chip' + (cls ? ' ' + cls : '') + (st.locked[slot] ? ' locked' : '') + '" data-slot="' + slot + '" title="' +
        esc(SLOT_INFO[slot][0]) + ': click to swap">' + esc(text) + '</span>';
    }
    function fill(text, slot) {   // a twist may mention {hero} and {enemy}
      var parts = String(text).split(/(\{hero\}|\{enemy\})/);
      return parts.map(function (p) {
        if (p === '{hero}') return chip('hero', s.hero, 'echo', true);
        if (p === '{enemy}') return chip('enemy', s.enemy || 'the opposition', '', true);
        return asText ? p : (p ? '<span class="os-chip-in" data-slot="' + slot + '">' + esc(p) + '</span>' : '');
      }).join('');
    }
    var out = tpl.replace(/\{(\w+)(?::(\w+))?\}/g, function (m, slot, mod) {
      if (slot === 'a') return asText ? (OS.article(s.adj)) : esc(OS.article(s.adj));
      if (slot === 'twist' || slot === 'truth') {
        if (asText) return fill(s[slot], slot);
        return '<span class="os-chip' + (st.locked[slot] ? ' locked' : '') + '" role="button" tabindex="0" data-slot="' + slot + '" title="' + SLOT_INFO[slot][0] + ': click to swap">' + fill(s[slot], slot) + '</span>';
      }
      var v = s[slot] || '';
      if (mod === 'lower') v = OS.lower1(v);
      if (mod === 'base') v = OS.goal(v);
      return chip(slot, v, mod === 'echo' ? 'echo' : '');
    });
    if (asText) return out.replace(/^./, function (c) { return c.toUpperCase(); });
    return out;
  };
  spark.text = function (st) { return spark.render(st, true); };
  spark.resolve = function (st, text) { return String(text || '').replace(/\{hero\}/g, st.slots.hero).replace(/\{enemy\}/g, st.slots.enemy || 'the opposition'); };
  spark.logline = function (st) {
    var s = st.slots;
    return OS.cap((s.inciting ? 'When ' + s.inciting + ', ' : '') + OS.article(s.adj) + ' ' + s.adj + ' ' + s.hero + ' must ' + OS.goal(s.want) +
      ' before ' + s.clock + ' or ' + s.stakes + ', even though the ' + s.hero + ' ' + s.obstacle + '.');
  };
  spark.circle = function (st) {
    var s = st.slots, H = 'the ' + s.hero;
    return [
      OS.cap(OS.article(s.adj)) + ' ' + s.adj + ' ' + s.hero + ', ' + OS.lower1(s.setting) + '.',
      OS.cap(H) + ' ' + s.want + '.',
      'When ' + s.inciting + ', ' + H + ' has no choice but to act.',
      OS.cap(H) + ' ' + s.obstacle + ', and tries everything, failing in new ways.',
      'They get close to what they wanted, and it\'s even better than they hoped.',
      'Then ' + spark.resolve(st, s.twist) + '. The price is heavy.',
      'Changed, ' + H + ' goes back to face ' + (s.enemy || 'the opposition') + ' one last time.',
      OS.cap(H) + ' now knows that ' + s.truth + '.'
    ];
  };
  function traitsFromAdj(adj) {
    var t = { O: 50, C: 50, E: 50, A: 50, N: 50 }, it = OS.S.adj.filter(function (a) { return a.t === adj; })[0];
    'OCEAN'.split('').forEach(function (k) { t[k] = 35 + Math.floor(Math.random() * 30); });
    if (it && it.x) it.x.split(/\s+/).forEach(function (h) { var k = h[0], d = h[1] === '+' ? 30 : -30; if (t[k] != null) t[k] = Math.max(5, Math.min(95, t[k] + d)); });
    return t;
  }
  /* The starter cast. Cached per spark (names stay put while words are swapped; a new pull brings new people). */
  spark.cast = function (st) {
    var key = JSON.stringify(st.slots);
    if (st._cast && st._castKey === key) return JSON.parse(JSON.stringify(st._cast));
    var cast = makeCast(st);
    if (st._names) cast.forEach(function (c, i) { if (st._names[i] && !(i === 1 && /^the /i.test(st.slots.enemy || ''))) c.name = st._names[i]; });
    else st._names = cast.map(function (c) { return c.name; });
    st._cast = cast; st._castKey = key;
    return JSON.parse(JSON.stringify(cast));
  };
  function makeCast(st) {
    var s = st.slots, wound = OS.pick(OS.L.wounds), enemyName = OS.titleCase(String(s.enemy || 'The Opposition'));
    var hero = OS.blankCharacter('protagonist');
    hero.name = OS.suggestName(); hero.occupation = OS.cap(s.hero); hero.want = 'To ' + OS.goal(s.want); hero.need = 'To learn that ' + s.truth;
    hero.wound = wound.t; hero.lie = wound.x; hero.flaw = OS.pick(OS.L.flaws).t; hero.fear = OS.pick(OS.L.fears).t; hero.value = OS.pick(OS.L.values).t;
    hero.archetype = 'The Everyman'; hero.traits = traitsFromAdj(s.adj); hero.arc = st.tpl === 'tragedy' ? 'negative' : 'positive';
    hero.notes = 'From the spark: ' + OS.cap(s.adj) + ' ' + s.hero + '.';
    var foe = OS.blankCharacter('antagonist');
    foe.name = /^the /i.test(s.enemy || '') ? enemyName : OS.suggestName(); foe.archetype = 'The Shadow'; foe.want = 'To keep ' + OS.first(hero.name) + ' from getting what they want';
    foe.notes = 'The opposition: ' + (s.enemy || '') + '. If it isn\'t a person, give it a face: who embodies it?'; foe.flaw = OS.pick(OS.L.flaws).t; foe.arc = 'flat';
    var mentor = OS.rollCharacter('mentor'); mentor.archetype = 'The Mentor';
    var ally = OS.rollCharacter('ally'); ally.archetype = 'The Ally';
    return [hero, foe, mentor, ally];
  }
  /* Everything a new project needs, built from one spark: cast, relationships, events, 8 scene cards. */
  spark.toSeed = function (st, opts) {
    opts = opts || {};
    var s = st.slots, cast = spark.cast(st), hero = cast[0], foe = cast[1], mentor = cast[2], ally = cast[3];
    var doc = OS.newDoc(), lines = spark.circle(st), keys = OS.beatsOf('circle').map(function (b) { return b.k; });
    doc.premise = spark.text(st); doc.theme_answer = s.truth; doc.theme = OS.pick(OS.L.themes).t; doc.world = s.setting;
    doc.characters = cast;
    doc.relations = [
      { id: OS.uid('r'), a: hero.id, b: foe.id, type: 'enemies', a_to_b: 'Needs to beat them', b_to_a: 'Stands in the way', tension: 9 },
      { id: OS.uid('r'), a: mentor.id, b: hero.id, type: 'mentor', a_to_b: 'Sees their younger self', b_to_a: 'Resents being told', tension: 4 },
      { id: OS.uid('r'), a: hero.id, b: ally.id, type: 'friends', a_to_b: 'Leans on them', b_to_a: 'Needs something in return', tension: 3 }];
    doc.events.push({ id: OS.uid('e'), when: 'Years before', title: 'The wound', detail: OS.first(hero.name) + ': ' + hero.wound, chars: [hero.id], kind: 'backstory' });
    var charges = [[0, 1], [1, -1], [-1, -1], [-1, -1], [-1, 2], [2, -2], [-2, -1], [-1, 2]];
    var heads = ['EXT. ' + (s.setting || 'TOWN').replace(/^(In|On|At|Inside|Aboard|Deep inside) (an? |the )?/i, '').split(/[,]/)[0].toUpperCase() + ' - DAY'];
    lines.forEach(function (line, i) {
      var ev = { id: OS.uid('e'), when: 'Day ' + (i + 1), title: ['Ordinary life', 'The want', 'The inciting incident', 'Trying and failing', 'Getting it', 'The twist', 'Going back', 'Changed'][i],
        detail: line, chars: i === 3 || i === 6 ? [hero.id, foe.id] : i === 1 || i === 4 ? [hero.id, ally.id] : i === 2 ? [hero.id, mentor.id] : [hero.id], kind: 'story' };
      doc.events.push(ev);
      doc.scenes.push({ id: OS.uid('s'), heading: i === 0 ? heads[0] : '', summary: line, goal: i === 1 ? hero.want : '', conflict: i === 3 ? OS.cap(s.obstacle) : '',
        outcome: '', beat: keys[i], charge_in: charges[i][0], charge_out: charges[i][1], chars: ev.chars.slice(), events: [ev.id], done: false });
    });
    doc.plants = [{ id: OS.uid('p'), setup: 'Show ' + (s.enemy || 'the opposition') + ' early, before we understand it', payoff: 'The twist: ' + spark.resolve(st, s.twist), setup_scene: doc.scenes[0].id, payoff_scene: doc.scenes[5].id }];
    var g = OS.GENRE[st.flavor];
    return { title: s.title, logline: spark.logline(st), genre: g ? g.name : '', format: opts.format || 'feature', structure: 'circle',
      color: OS.pick(Object.keys(OS.COLORS)), doc: doc };
  };

  /* ======================================================================== the reaction engine */
  var RULES = {};
  OS.REACT.forEach(function (ev) {
    RULES[ev[0]] = ev[4].map(function (line) {
      var p = line.split('|'), text = p[0];
      var rules = (p.slice(1).join('|') ? line.slice(text.length + 1) : '').trim().split(/\s+/).filter(Boolean).map(function (tok) {
        var m = tok.match(/^([OCEAN])([<>])(\d+):(\d+)$/);
        if (m) return { trait: m[1], op: m[2], n: +m[3], w: +m[4] };
        var f = tok.match(/^(\w+)~(.+):(\d+)$/);
        if (f) return { field: f[1], words: f[2].split('|'), w: +f[3] };
        return null;
      }).filter(Boolean);
      return { text: text, rules: rules };
    });
  });
  OS.REACT_BY = {};
  OS.REACT.forEach(function (ev) { OS.REACT_BY[ev[0]] = { key: ev[0], label: ev[1], icon: ev[2], tip: ev[3] }; });
  var TRAIT_NAME = { O: 'openness', C: 'conscientiousness', E: 'extraversion', A: 'agreeableness', N: 'neuroticism' };
  OS.react = function (ch, key) {
    var t = (ch && ch.traits) || {}, out = [];
    (RULES[key] || []).forEach(function (r, i) {
      var score = 0.5, why = [];
      r.rules.forEach(function (rule) {
        if (rule.trait) {
          var v = t[rule.trait] == null ? 50 : +t[rule.trait];
          if ((rule.op === '>' && v > rule.n) || (rule.op === '<' && v < rule.n)) {
            score += rule.w; why.push((rule.op === '>' ? 'high ' : 'low ') + TRAIT_NAME[rule.trait] + ' (' + v + ')');
          }
        } else {
          var val = String(ch[rule.field] || '').toLowerCase();
          if (val && rule.words.some(function (w) { return val.indexOf(w.toLowerCase()) >= 0; })) {
            score += rule.w; why.push(rule.field + ': ' + String(ch[rule.field]).toLowerCase().slice(0, 40));
          }
        }
      });
      out.push({ text: r.text, score: score - i * 0.001, why: why });
    });
    out.sort(function (a, b) { return b.score - a.score; });
    var top = out.slice(0, 3), total = top.reduce(function (n, r) { return n + r.score; }, 0) || 1;
    top.forEach(function (r) { r.pct = Math.round(r.score / total * 100); });
    return top;
  };

  /* ======================================================================== the screenplay elements */
  var SC = OS.script = {};
  SC.TYPES = [['scene', 'Scene heading', 'Slug'], ['action', 'Action', 'Action'], ['character', 'Character', 'Char'], ['paren', 'Parenthetical', 'Paren'],
    ['dialogue', 'Dialogue', 'Dial'], ['transition', 'Transition', 'Trans'], ['shot', 'Shot', 'Shot'], ['note', 'Note (not printed)', 'Note']];
  SC.NAME = {}; SC.TYPES.forEach(function (t) { SC.NAME[t[0]] = t[1]; });
  SC.NEXT = { scene: 'action', action: 'action', character: 'dialogue', paren: 'dialogue', dialogue: 'action', transition: 'scene', shot: 'action', note: 'action' };
  SC.TAB = { action: 'character', character: 'transition', transition: 'scene', scene: 'action', dialogue: 'paren', paren: 'dialogue', shot: 'action', note: 'action' };
  var WIDTH = { scene: 58, action: 61, character: 38, paren: 26, dialogue: 35, transition: 20, shot: 58, note: 0 };
  var GAP = { scene: 2, action: 1, character: 1, paren: 0, dialogue: 0, transition: 1, shot: 1, note: 0 };
  SC.lines = function (blocks) {
    var n = 0;
    (blocks || []).forEach(function (b) {
      if (b.t === 'note') return;
      var w = WIDTH[b.t] || 61, len = String(b.x || '').length;
      n += (GAP[b.t] || 0) + Math.max(1, Math.ceil(len / w));
    });
    return n;
  };
  SC.pages = function (blocks) { var l = SC.lines(blocks); return l ? Math.max(0.1, Math.round(l / 55 * 10) / 10) : 0; };
  SC.words = function (blocks) { return (blocks || []).reduce(function (n, b) { return n + (b.t === 'note' ? 0 : OS.words(b.x)); }, 0); };
  SC.characterLines = function (blocks) {
    var out = {}, who = null;
    (blocks || []).forEach(function (b) {
      if (b.t === 'character') { who = String(b.x || '').replace(/\s*\(.*\)\s*$/, '').trim().toUpperCase(); if (who) out[who] = out[who] || { lines: 0, words: 0 }; if (who) out[who].lines++; }
      else if (b.t === 'dialogue' && who) out[who].words += OS.words(b.x);
      else if (b.t !== 'paren') who = null;
    });
    return out;
  };
  /* Guess the element from what was typed (INT. -> scene heading, CUT TO: -> transition). */
  SC.guess = function (t, x) {
    var s = String(x || '').trim();
    if (t === 'action' && /^(INT|EXT|EST|INT\.?\/EXT|I\/E)[\.\s]/i.test(s)) return 'scene';
    if (t === 'action' && /^[A-Z\s]+TO:$/.test(s)) return 'transition';
    if ((t === 'dialogue' || t === 'action') && /^\(.*\)$/.test(s) && t === 'dialogue') return 'paren';
    return t;
  };
  SC.fountain = function (project, author) {
    var doc = project.doc || {}, blocks = doc.script || [], out = ['Title: ' + (project.title || 'Untitled'), 'Credit: Written by', 'Author: ' + (author || 'Anonymous'),
      'Draft date: ' + new Date().toLocaleDateString(), ''], prev = null;
    blocks.forEach(function (b) {
      var x = String(b.x || '').trim(), line;
      if (b.t === 'scene') line = /^(INT|EXT|EST|INT\.?\/EXT|I\/E)[\.\s]/i.test(x) ? x.toUpperCase() : '.' + x.toUpperCase();
      else if (b.t === 'character') line = (/[a-z]/.test(x) ? '@' : '') + x.toUpperCase();
      else if (b.t === 'paren') line = /^\(.*\)$/.test(x) ? x : '(' + x + ')';
      else if (b.t === 'transition') line = /TO:$/.test(x.toUpperCase()) ? x.toUpperCase() : '> ' + x.toUpperCase();
      else if (b.t === 'note') line = '[[' + x + ']]';
      else if (b.t === 'shot') line = x.toUpperCase();
      else line = (x && x === x.toUpperCase() && /[A-Z]/.test(x) ? '!' : '') + x;
      var tight = prev && (prev === 'character' || prev === 'paren' || (prev === 'dialogue' && b.t === 'paren')) && (b.t === 'dialogue' || b.t === 'paren');
      if (!tight && out.length) out.push('');
      out.push(line);
      prev = b.t;
    });
    return out.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
  };
  SC.parseFountain = function (text) {
    var lines = String(text || '').replace(/\r/g, '').replace(/\/\*[\s\S]*?\*\//g, '').split('\n'), blocks = [], i = 0, prevBlank = true, inDialogue = false;
    if (/^\s*title\s*:/i.test(lines[0] || '')) { while (i < lines.length && lines[i].trim() !== '') i++; }
    for (; i < lines.length; i++) {
      var raw = lines[i], s = raw.trim(), next = (lines[i + 1] || '').trim();
      if (!s) { prevBlank = true; inDialogue = false; continue; }
      if (/^#/.test(s) || /^=/.test(s)) { prevBlank = false; continue; }
      var t = 'action', x = s;
      if (/^\[\[[\s\S]*\]\]$/.test(s)) { t = 'note'; x = s.slice(2, -2); }
      else if (/^(INT|EXT|EST|INT\.?\/EXT|I\/E)[\.\s]/i.test(s) && prevBlank) t = 'scene';
      else if (/^\.[^.]/.test(s) && prevBlank) { t = 'scene'; x = s.slice(1); }
      else if (/^>.*<$/.test(s)) { t = 'action'; x = s.slice(1, -1).trim(); }
      else if (/^>/.test(s)) { t = 'transition'; x = s.slice(1).trim(); }
      else if (/^[A-Z\s]+TO:$/.test(s) && prevBlank) t = 'transition';
      else if (inDialogue) { t = /^\(.*\)$/.test(s) ? 'paren' : 'dialogue'; }
      else if (/^@/.test(s)) { t = 'character'; x = s.slice(1); inDialogue = true; }
      else if (prevBlank && next && /[A-Z]/.test(s) && s === s.toUpperCase() && !/^!/.test(s) && s.length < 50) { t = 'character'; inDialogue = true; }
      else if (/^!/.test(s)) x = s.slice(1);
      if (t === 'action' && blocks.length && blocks[blocks.length - 1].t === 'action' && !prevBlank) blocks[blocks.length - 1].x += ' ' + x;
      else blocks.push({ t: t, x: x });
      prevBlank = false;
    }
    return blocks;
  };
  /* First-draft pages from the scene cards (or only the cards that aren't in the pages yet). */
  SC.draft = function (doc, onlyMissing) {
    var have = {}, out = [];
    (doc.script || []).forEach(function (b) { if (b.s) have[b.s] = 1; });
    var voiceSample = {};
    OS.L.voices.forEach(function (v) { voiceSample[v.t] = v.x; });
    (doc.scenes || []).forEach(function (s, i) {
      if (onlyMissing && have[s.id]) return;
      out.push({ t: 'scene', x: (s.heading || 'INT. LOCATION - DAY').toUpperCase(), s: s.id });
      out.push({ t: 'action', x: s.summary || 'Describe what we see.' });
      var turn = s.charge_in != null && s.charge_out != null ? ' Turn: ' + OS.charge(s.charge_in) + ' to ' + OS.charge(s.charge_out) + '.' : '';
      if (s.goal || s.conflict || turn) out.push({ t: 'note', x: (s.goal ? 'Goal: ' + s.goal + '. ' : '') + (s.conflict ? 'Conflict: ' + s.conflict + '.' : '') + turn });
      (s.chars || []).slice(0, 2).forEach(function (cid) {
        var c = OS.find(doc.characters, cid);
        if (!c || !c.name) return;
        out.push({ t: 'character', x: OS.first(c.name).toUpperCase() });
        out.push({ t: 'dialogue', x: voiceSample[c.voice] && voiceSample[c.voice].indexOf('up to you') < 0 ? voiceSample[c.voice] : '...' });
      });
    });
    return out;
  };
  OS.charge = function (v) { return v == null ? '' : v > 1 ? '++' : v > 0 ? '+' : v < -1 ? '−−' : v < 0 ? '−' : '±'; };
  OS.chargeWord = function (v) { return v == null ? 'not set' : v > 1 ? 'very positive' : v > 0 ? 'positive' : v < -1 ? 'very negative' : v < 0 ? 'negative' : 'neutral'; };

  /* ======================================================================== story shape (Vonnegut) */
  OS.SHAPES = [
    ['Man in a hole', 'Trouble, then a climb out, a little better off.', [0.3, 0, -0.5, -0.8, -0.5, 0, 0.4, 0.6]],
    ['Boy meets girl', 'Find it, lose it, win it back.', [0, 0.4, 0.7, 0.3, -0.4, -0.6, 0.2, 0.8]],
    ['Cinderella', 'A slow rise, a sudden fall at the stroke of midnight, then joy.', [-0.6, -0.4, 0.2, 0.6, 0.8, -0.6, 0.2, 1]],
    ['Rags to riches', 'A steady rise.', [-0.8, -0.6, -0.4, -0.1, 0.2, 0.4, 0.6, 0.8]],
    ['Riches to rags', 'A steady fall: the tragedy.', [0.8, 0.6, 0.4, 0.1, -0.2, -0.4, -0.6, -0.8]],
    ['Icarus', 'Rise, then the fall.', [0, 0.3, 0.6, 0.8, 0.6, 0.1, -0.4, -0.8]],
    ['Oedipus', 'Fall, rise, and a final fall.', [0.4, -0.2, -0.5, 0, 0.4, -0.3, -0.6, -0.9]],
    ['From bad to worse', 'Down, and down again.', [-0.2, -0.3, -0.4, -0.5, -0.6, -0.7, -0.8, -0.9]]
  ];
  function resample(vals, n) {
    if (!vals.length) return [];
    if (vals.length === 1) return Array(n).fill(vals[0]);
    var out = [];
    for (var i = 0; i < n; i++) { var p = i * (vals.length - 1) / (n - 1), a = Math.floor(p), b = Math.min(vals.length - 1, a + 1); out.push(vals[a] + (vals[b] - vals[a]) * (p - a)); }
    return out;
  }
  function corr(x, y) {
    var n = x.length, mx = x.reduce(function (a, b) { return a + b; }, 0) / n, my = y.reduce(function (a, b) { return a + b; }, 0) / n, sxy = 0, sx = 0, sy = 0;
    for (var i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sx += Math.pow(x[i] - mx, 2); sy += Math.pow(y[i] - my, 2); }
    return sx && sy ? sxy / Math.sqrt(sx * sy) : 0;
  }
  OS.shapeOf = function (scenes) {
    var vals = (scenes || []).filter(function (s) { return s.charge_out != null; }).map(function (s) { return +s.charge_out; });
    if (vals.length < 4) return null;
    var r = resample(vals, 8), best = null;
    OS.SHAPES.forEach(function (sh) { var c = corr(r, sh[2]); if (!best || c > best.c) best = { name: sh[0], about: sh[1], c: c, pts: sh[2] }; });
    return best && best.c > 0.45 ? best : { name: 'An uncharted shape', about: 'It doesn\'t match a classic curve. That can be great, or a sign the turns are random.', c: best ? best.c : 0 };
  };

  /* ======================================================================== the script doctor */
  OS.doctor = function (p) {
    var d = OS.normalize(p.doc || {}), out = [], chars = d.characters, scenes = d.scenes;
    function add(lvl, area, text, go) { out.push({ lvl: lvl, area: area, text: text, go: go || '' }); }
    var hero = chars.filter(function (c) { return c.role === 'protagonist'; })[0], foe = chars.filter(function (c) { return c.role === 'antagonist'; })[0];
    if (!String(p.logline || '').trim()) add('bad', 'Story', 'Write a logline: one sentence with a hero, a goal, an obstacle and stakes. The builder on this page does most of it.', 'overview');
    else if (OS.words(p.logline) > 55) add('warn', 'Story', 'The logline runs ' + OS.words(p.logline) + ' words. Aim for 25 to 50: what would you say in an elevator?', 'overview');
    else add('good', 'Story', 'There\'s a logline.', 'overview');
    if (!String(d.theme || '').trim()) add('warn', 'Story', 'Name the theme as a question ("Can you love your family and stay good?"). Every scene can then argue one side.', 'overview');
    if (!chars.length) add('bad', 'Cast', 'No characters yet. Start with the protagonist: who do we follow?', 'cast');
    else if (!hero) add('bad', 'Cast', 'Mark one character as the protagonist, so the doctor and the arc charts know who to follow.', 'cast');
    if (hero) {
      var miss = ['want', 'need', 'flaw', 'wound'].filter(function (k) { return !String(hero[k] || '').trim(); });
      if (miss.length) add('warn', 'Cast', (hero.name || 'Your protagonist') + ' is missing: ' + miss.join(', ') + '. The want drives the plot; the need drives the arc.', 'cast/' + hero.id);
      else add('good', 'Cast', (hero.name || 'The protagonist') + ' has a want, a need, a flaw and a wound.', 'cast/' + hero.id);
      if (hero.want && hero.need && hero.want.trim().toLowerCase() === hero.need.trim().toLowerCase()) add('warn', 'Cast', 'The protagonist\'s want and need are the same. The want is outer (the plan); the need is inner (the lesson).', 'cast/' + hero.id);
      if (hero.wound && !hero.lie) add('tip', 'Cast', 'Give ' + (hero.name || 'the protagonist') + ' the lie that grew from the wound. Choosing a wound from the list fills one in.', 'cast/' + hero.id);
    }
    if (chars.length && !foe) add('warn', 'Cast', 'Nobody is the antagonist. Who or what wants the opposite (or the same thing, first)?', 'cast');
    if (foe && !String(foe.want || '').trim()) add('warn', 'Cast', 'Give ' + (foe.name || 'the antagonist') + ' a want of their own. Every villain is the hero of their own story.', 'cast/' + foe.id);
    if (chars.length >= 2) {
      var linked = {};
      d.relations.forEach(function (r) { linked[r.a] = 1; linked[r.b] = 1; });
      var lone = chars.filter(function (c) { return !linked[c.id]; });
      if (lone.length) add('warn', 'Web', lone.map(function (c) { return c.name || 'Unnamed'; }).join(', ') + (lone.length === 1 ? ' has' : ' have') + ' no relationships. Connect them in the Web, or cut them.', 'web');
      else add('good', 'Web', 'Every character is connected to someone.', 'web');
    }
    if (scenes.length >= 3) {
      var seen = {};
      scenes.forEach(function (s) { s.chars.forEach(function (id) { seen[id] = 1; }); });
      var ghosts = chars.filter(function (c) { return !seen[c.id]; });
      if (ghosts.length) add('tip', 'Cast', ghosts.map(function (c) { return c.name || 'Unnamed'; }).join(', ') + ' never appear in a scene card.', 'storyline');
    }
    if (!d.events.length) add('warn', 'Chronology', 'The chronology is empty. List what happened in story order, backstory included; the Chronology tab can rebuild it from your cards.', 'chronology');
    else {
      var shown = {};
      scenes.forEach(function (s) { s.events.forEach(function (id) { shown[id] = 1; }); });
      var hidden = d.events.filter(function (e) { return !shown[e.id] && e.kind !== 'backstory'; });
      if (hidden.length) add('tip', 'Chronology', UI.plural(hidden.length, 'event') + ' never appear on screen. Are they revealed in dialogue, or should they be scenes?', 'chronology');
    }
    if (!scenes.length) add('bad', 'Scenes', 'No scene cards yet. Add one per beat to start, or develop a Spark.', 'storyline');
    else {
      var beats = OS.beatsOf(p.structure), used = {};
      scenes.forEach(function (s) { used[s.beat] = 1; });
      var empty = beats.filter(function (b) { return !used[b.k]; });
      if (empty.length) add('warn', 'Scenes', UI.plural(empty.length, 'beat') + ' still have no scene: ' + empty.slice(0, 4).map(function (b) { return b.n; }).join(', ') + (empty.length > 4 ? '…' : '') + '.', 'storyline');
      else add('good', 'Scenes', 'Every beat of the ' + OS.STRUCTURES[p.structure || 'circle'].name + ' has a scene.', 'storyline');
      var flat = scenes.filter(function (s) { return s.charge_in != null && s.charge_out != null && +s.charge_in === +s.charge_out; });
      if (flat.length) add('warn', 'Scenes', UI.plural(flat.length, 'scene') + ' don\'t turn (the value is the same at the start and the end). Every scene should change something.', 'storyline');
      var noConflict = scenes.filter(function (s) { return !String(s.conflict || '').trim(); });
      if (noConflict.length > scenes.length / 2) add('tip', 'Scenes', 'Most scene cards have no conflict written down. Who wants what, and who stops them?', 'storyline');
      var run = 1, worst = 1;
      for (var i = 1; i < scenes.length; i++) {
        var a = scenes[i - 1].charge_out, b = scenes[i].charge_out;
        if (a != null && b != null && Math.sign(a) === Math.sign(b) && b !== 0) { run++; worst = Math.max(worst, run); } else run = 1;
      }
      if (worst >= 4) add('tip', 'Scenes', worst + ' scenes in a row end on the same note. Alternate up and down so the audience can breathe.', 'storyline');
    }
    var unpaid = d.plants.filter(function (pl) { return pl.setup && !String(pl.payoff || '').trim(); });
    if (unpaid.length) add('warn', 'Setups', UI.plural(unpaid.length, 'setup') + ' never pay off. Chekhov: if there\'s a gun in act one, it goes off by act three.', 'storyline');
    var pages = SC.pages(d.script), f = OS.FORMATS[p.format] || OS.FORMATS.feature;
    if (!d.script.length) add('tip', 'Pages', 'No pages yet. The Pages tab can draft them from your scene cards, so you never face a blank page.', 'pages');
    else if (pages < f.pages[0] * 0.6) add('tip', 'Pages', 'About ' + pages + ' pages so far, of the ' + f.pages[0] + ' to ' + f.pages[1] + ' a ' + f.name.toLowerCase() + ' usually runs.', 'pages');
    else if (pages > f.pages[1]) add('warn', 'Pages', 'About ' + pages + ' pages: longer than the usual ' + f.pages[1] + ' for a ' + f.name.toLowerCase() + '. Enter scenes later, leave earlier.', 'pages');
    else if (pages >= f.pages[0]) add('good', 'Pages', 'The length (' + pages + ' pages) is right for a ' + f.name.toLowerCase() + '.', 'pages');
    var score = 100;
    out.forEach(function (c) { score -= c.lvl === 'bad' ? 16 : c.lvl === 'warn' ? 7 : c.lvl === 'tip' ? 2 : 0; });
    score = Math.round(score * (0.55 + 0.45 * Math.min(1, pages / f.pages[0])));   // a plan is half the job; the pages are the other half
    var order = { bad: 0, warn: 1, tip: 2, good: 3 };
    out.sort(function (a, b) { return order[a.lvl] - order[b.lvl]; });
    return { checks: out, score: Math.max(3, Math.min(100, score)) };
  };
  OS.stats = function (p) {
    var d = OS.normalize(p.doc || {}), beats = OS.beatsOf(p.structure), used = {};
    d.scenes.forEach(function (s) { used[s.beat] = 1; });
    return { characters: d.characters.length, relations: d.relations.length, events: d.events.length, scenes: d.scenes.length,
      pages: SC.pages(d.script), words: SC.words(d.script), readiness: OS.doctor(p).score,
      beats_done: beats.filter(function (b) { return used[b.k]; }).length, beats_total: beats.length };
  };
  /* The one next step to suggest. */
  OS.nextStep = function (p) {
    var c = OS.doctor(p).checks.filter(function (x) { return x.lvl !== 'good'; })[0];
    return c || { lvl: 'good', area: 'Pages', text: 'Everything checks out. Keep writing pages, then read it out loud.', go: 'pages' };
  };

  /* ======================================================================== drawings (SVG strings) */
  var SVG = OS.svg = {};
  function pt(cx, cy, r, deg) { var a = (deg - 90) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
  function arc(cx, cy, r1, r2, a0, a1) {
    var p1 = pt(cx, cy, r2, a0), p2 = pt(cx, cy, r2, a1), p3 = pt(cx, cy, r1, a1), p4 = pt(cx, cy, r1, a0), big = a1 - a0 > 180 ? 1 : 0;
    return 'M' + p1 + 'A' + r2 + ',' + r2 + ' 0 ' + big + ' 1 ' + p2 + 'L' + p3 + 'A' + r1 + ',' + r1 + ' 0 ' + big + ' 0 ' + p4 + 'Z';
  }
  /* The Story Circle as a wheel: 8 segments, order above, chaos below. opts: counts {beat: n}, active, labels (array of 8 texts), night */
  SVG.wheel = function (opts) {
    opts = opts || {};
    var beats = OS.beatsOf('circle'), S = 360, c = S / 2, R2 = 150, R1 = 92, night = opts.night, ink = night ? '#efe8da' : 'var(--c-ink)', faint = night ? 'rgba(239,232,218,.5)' : 'var(--c-muted)';
    var out = '<svg class="os-wheel" viewBox="0 0 ' + S + ' ' + S + '" role="img" aria-label="Story Circle">';
    out += '<path d="' + arc(c, c, 0, R1 - 4, -90, 90) + '" fill="' + (night ? 'rgba(224,165,38,.08)' : 'color-mix(in srgb, #e0a526 10%, transparent)') + '"/>';
    out += '<path d="' + arc(c, c, 0, R1 - 4, 90, 270) + '" fill="' + (night ? 'rgba(200,16,46,.12)' : 'color-mix(in srgb, #c8102e 8%, transparent)') + '"/>';
    beats.forEach(function (b, i) {
      var a0 = i * 45 - 22.5 + 1.5, a1 = i * 45 + 22.5 - 1.5, on = opts.active === b.k, n = opts.counts ? opts.counts[b.k] || 0 : null;
      var fill = on ? '#c8102e' : i < 2 || i === 7 ? (night ? '#2a241c' : 'var(--c-accent-soft)') : (i >= 3 && i <= 5 ? (night ? '#2a1418' : 'var(--c-brand-soft)') : (night ? '#24201b' : 'var(--c-surface-2)'));
      out += '<g class="seg" data-beat="' + b.k + '"><path d="' + arc(c, c, R1, R2, a0, a1) + '" fill="' + fill + '" stroke="' + (night ? '#0e0d0c' : 'var(--c-bg)') + '" stroke-width="2"/>';
      var lp = pt(c, c, (R1 + R2) / 2, i * 45);
      out += '<text x="' + lp[0] + '" y="' + (lp[1] - 4) + '" text-anchor="middle" font-size="13" font-weight="700" fill="' + (on ? '#fff' : ink) + '">' + (i + 1) + '. ' + esc(b.n) + '</text>';
      if (n != null) out += '<text x="' + lp[0] + '" y="' + (lp[1] + 13) + '" text-anchor="middle" font-size="10.5" fill="' + (on ? '#fff' : faint) + '">' + (n ? UI.plural(n, 'scene') : 'empty') + '</text>';
      else if (opts.labels) out += '<text x="' + lp[0] + '" y="' + (lp[1] + 13) + '" text-anchor="middle" font-size="10" fill="' + (on ? '#fff' : faint) + '">' + esc({ you: 'comfort zone', need: 'wants something', go: 'the unknown', search: 'adapts', find: 'gets it', take: 'pays for it', return: 'goes back', change: 'changed' }[b.k]) + '</text>';
      out += '<title>' + esc(b.n + ': ' + b.d) + '</title></g>';
    });
    out += '<line x1="' + (c - R1 + 10) + '" y1="' + c + '" x2="' + (c + R1 - 10) + '" y2="' + c + '" stroke="' + faint + '" stroke-dasharray="3 4"/>';
    out += '<text x="' + c + '" y="' + (c - 26) + '" text-anchor="middle" font-size="10" letter-spacing="2" fill="' + faint + '">ORDER</text>';
    out += '<text x="' + c + '" y="' + (c + 36) + '" text-anchor="middle" font-size="10" letter-spacing="2" fill="' + faint + '">CHAOS</text>';
    out += '<text x="' + c + '" y="' + (c - 4) + '" text-anchor="middle" font-size="15" font-style="italic" font-family="Fraunces, Georgia, serif" fill="' + ink + '">' + esc(opts.center || 'Story Circle') + '</text>';
    return out + '</svg>';
  };
  /* Any structure as a horizontal bar: beats at their % positions, scene counts under each. */
  SVG.bar = function (structure, counts, active) {
    var beats = OS.beatsOf(structure), W = 1000, H = 104, out = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Structure">';
    out += '<rect x="0" y="34" width="' + W + '" height="10" rx="5" fill="var(--c-surface-2)"/>';
    [0.25, 0.75].forEach(function (x) { out += '<line x1="' + x * W + '" x2="' + x * W + '" y1="26" y2="52" stroke="var(--c-line)" stroke-width="2"/>'; });
    beats.forEach(function (b, i) {
      var x = 12 + b.pct * (W - 24), n = counts ? counts[b.k] || 0 : 0, on = active === b.k;
      out += '<g class="seg" data-beat="' + b.k + '" style="cursor:pointer"><circle cx="' + x + '" cy="39" r="' + (on ? 10 : 8) + '" fill="' + (n ? 'var(--c-brand)' : 'var(--c-surface)') + '" stroke="var(--c-brand)" stroke-width="2"/>';
      var name = b.n.split(' · ')[0].length <= 2 ? b.n.split(' · ')[0] + ' · ' + (b.n.split(' · ')[1] || '').split(',')[0] : b.n;
      var anchor = b.pct < 0.06 ? 'start' : b.pct > 0.94 ? 'end' : 'middle', lx = anchor === 'start' ? x - 8 : anchor === 'end' ? x + 8 : x;
      out += '<text x="' + lx + '" y="' + (i % 2 ? 78 : 18) + '" text-anchor="' + anchor + '" font-size="' + (beats.length > 10 ? 13 : 15) + '" font-weight="600" fill="var(--c-ink)">' + esc(name.length > 20 ? name.slice(0, 19) + '…' : name) + '</text>';
      out += '<text x="' + lx + '" y="' + (i % 2 ? 97 : 64) + '" text-anchor="' + anchor + '" font-size="12" fill="var(--c-muted)">' + (n ? UI.plural(n, 'scene') : 'empty') + '</text>';
      out += '<title>' + esc(b.n + ' (' + Math.round(b.pct * 100) + '%): ' + b.d) + '</title></g>';
    });
    return out + '</svg>';
  };
  /* Out-of-order scenes. A scene's time is the latest event it shows. The longest run of scenes that moves forward in
     time is the "present"; a scene outside it is a flashback (earlier than the present around it) or a flash-forward.
     Returns {sceneId: 'flashback' | 'flashforward'}. */
  OS.order = function (doc) {
    var idx = {}, out = {};
    (doc.events || []).forEach(function (e, i) { idx[e.id] = i; });
    var timed = (doc.scenes || []).map(function (s) {
      var t = -1; (s.events || []).forEach(function (id) { if (idx[id] != null) t = Math.max(t, idx[id]); });
      return { id: s.id, t: t };
    }).filter(function (x) { return x.t >= 0; });
    var n = timed.length, len = [], prev = [];
    for (var i = 0; i < n; i++) {
      len[i] = 1; prev[i] = -1;
      for (var j = 0; j < i; j++) if (timed[j].t <= timed[i].t && len[j] + 1 > len[i]) { len[i] = len[j] + 1; prev[i] = j; }
    }
    var best = -1; for (i = 0; i < n; i++) if (best < 0 || len[i] >= len[best]) best = i;
    var inLine = {}; for (i = best; i >= 0; i = prev[i]) inLine[i] = true;
    for (i = 0; i < n; i++) {
      if (inLine[i]) continue;
      var p = -1, q = -1;
      for (j = i - 1; j >= 0; j--) if (inLine[j]) { p = j; break; }
      for (j = i + 1; j < n; j++) if (inLine[j]) { q = j; break; }
      if (p >= 0 && timed[i].t < timed[p].t) out[timed[i].id] = 'flashback';
      else if (q >= 0 && timed[i].t > timed[q].t) out[timed[i].id] = 'flashforward';
    }
    return out;
  };
  /* The braid: chronology (top) against the order we tell it (bottom). Lines that cross = non-linear storytelling. */
  SVG.braid = function (doc) {
    var ev = doc.events || [], sc = doc.scenes || [], W = 1000, H = 230, top = 46, bot = 184;
    if (!ev.length || !sc.length) return '';
    var ex = function (i) { return 30 + (ev.length === 1 ? (W - 60) / 2 : i * (W - 60) / (ev.length - 1)); };
    var sx = function (i) { return 30 + (sc.length === 1 ? (W - 60) / 2 : i * (W - 60) / (sc.length - 1)); };
    var idx = {}; ev.forEach(function (e, i) { idx[e.id] = i; });
    var out = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Chronology against storyline">';
    out += '<text x="30" y="18" font-size="11" letter-spacing="2" fill="var(--c-muted)" font-family="Courier Prime, monospace">WHAT HAPPENED (CHRONOLOGY)</text>';
    out += '<text x="30" y="' + (H - 6) + '" font-size="11" letter-spacing="2" fill="var(--c-muted)" font-family="Courier Prime, monospace">WHAT WE SEE (STORYLINE)</text>';
    out += '<line x1="30" x2="' + (W - 30) + '" y1="' + top + '" y2="' + top + '" stroke="var(--c-line)" stroke-width="2"/><line x1="30" x2="' + (W - 30) + '" y1="' + bot + '" y2="' + bot + '" stroke="var(--c-line)" stroke-width="2"/>';
    var kinds = OS.order(doc);
    sc.forEach(function (s, i) {
      var links = (s.events || []).filter(function (id) { return idx[id] != null; }), k = kinds[s.id];
      links.forEach(function (id) {
        var x1 = sx(i), x2 = ex(idx[id]), col = k === 'flashback' ? '#c8102e' : k === 'flashforward' ? '#7b4bd6' : '#e0a526';
        out += '<path d="M' + x1 + ',' + (bot - 8) + ' C' + x1 + ',' + (bot - 70) + ' ' + x2 + ',' + (top + 70) + ' ' + x2 + ',' + (top + 8) + '" fill="none" stroke="' + col + '" stroke-width="' + (k ? 2.6 : 1.6) + '" opacity="' + (k ? .95 : .7) + '"/>';
      });
    });
    ev.forEach(function (e, i) {
      var bk = e.kind === 'backstory';
      out += '<g><circle cx="' + ex(i) + '" cy="' + top + '" r="6.5" fill="' + (bk ? 'var(--c-surface)' : 'var(--c-ink)') + '" stroke="var(--c-ink)" stroke-width="2"/><title>' + esc((e.when ? e.when + ': ' : '') + e.title) + '</title></g>';
    });
    sc.forEach(function (s, i) {
      out += '<g data-scene="' + s.id + '"><rect x="' + (sx(i) - 9) + '" y="' + (bot - 8) + '" width="18" height="16" rx="3" fill="var(--c-brand)"/>' +
        '<text x="' + sx(i) + '" y="' + (bot + 4) + '" text-anchor="middle" font-size="9.5" font-weight="700" fill="#fff">' + (i + 1) + '</text><title>' + esc('Scene ' + (i + 1) + ': ' + (s.heading || s.summary || '')) + '</title></g>';
    });
    return out + '</svg>';
  };
  /* The emotional line across the scenes, with the matched Vonnegut shape behind it. */
  SVG.shape = function (scenes, shape) {
    var vals = (scenes || []).map(function (s) { return s.charge_out == null ? null : +s.charge_out; }), W = 1000, H = 200, pad = 26;
    var x = function (i) { return pad + (vals.length <= 1 ? 0 : i * (W - 2 * pad) / (vals.length - 1)); }, y = function (v) { return H / 2 - v * (H / 2 - pad) / 2; };
    var out = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Story shape">';
    out += '<line x1="' + pad + '" x2="' + (W - pad) + '" y1="' + H / 2 + '" y2="' + H / 2 + '" stroke="var(--c-line)" stroke-dasharray="4 5"/>';
    out += '<text x="' + pad + '" y="16" font-size="11" fill="var(--c-muted)">good fortune</text><text x="' + pad + '" y="' + (H - 6) + '" font-size="11" fill="var(--c-muted)">ill fortune</text>';
    if (shape && shape.pts) {
      var sp = shape.pts.map(function (v, i) { return (pad + i * (W - 2 * pad) / 7) + ',' + y(v * 2); }).join(' ');
      out += '<polyline points="' + sp + '" fill="none" stroke="#e0a526" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" opacity=".22"/>';
    }
    var pts = [];
    vals.forEach(function (v, i) { if (v != null) pts.push([x(i), y(v), i]); });
    if (pts.length > 1) out += '<polyline points="' + pts.map(function (p) { return p[0] + ',' + p[1]; }).join(' ') + '" fill="none" stroke="var(--c-brand)" stroke-width="3" stroke-linejoin="round"/>';
    pts.forEach(function (p) { out += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="5" fill="var(--c-surface)" stroke="var(--c-brand)" stroke-width="2.5"><title>Scene ' + (p[2] + 1) + '</title></circle>'; });
    return out + '</svg>';
  };
  /* Big Five radar. */
  SVG.radar = function (traits, size) {
    var S = size || 200, c = S / 2, R = S / 2 - 28, keys = 'OCEAN'.split(''), out = '<svg viewBox="0 0 ' + S + ' ' + S + '" role="img" aria-label="Personality">';
    [0.33, 0.66, 1].forEach(function (f) { out += '<polygon points="' + keys.map(function (k, i) { return pt(c, c, R * f, i * 72).join(','); }).join(' ') + '" fill="none" stroke="var(--c-line)"/>'; });
    out += '<polygon points="' + keys.map(function (k, i) { return pt(c, c, R * Math.max(0.05, (traits[k] == null ? 50 : traits[k]) / 100), i * 72).join(','); }).join(' ') + '" fill="color-mix(in srgb, var(--c-brand) 22%, transparent)" stroke="var(--c-brand)" stroke-width="2"/>';
    keys.forEach(function (k, i) { var p = pt(c, c, R + 15, i * 72); out += '<text x="' + p[0] + '" y="' + (p[1] + 4) + '" text-anchor="middle" font-size="12" font-weight="700" fill="var(--c-muted)">' + k + '</text>'; });
    return out + '</svg>';
  };
  /* A force layout for the relationship web: positions for nodes that don't have one yet. */
  OS.layout = function (nodes, edges, W, H) {
    var free = nodes.filter(function (n) { return n.x == null || n.y == null; });
    if (!free.length) return;
    nodes.forEach(function (n, i) { if (n.x == null || n.y == null) { var a = i / nodes.length * Math.PI * 2; n.x = W / 2 + Math.cos(a) * W * 0.3; n.y = H / 2 + Math.sin(a) * H * 0.3; } });
    var byId = {}; nodes.forEach(function (n) { byId[n.id] = n; });
    for (var step = 0; step < 260; step++) {
      var f = {};
      nodes.forEach(function (n) { f[n.id] = [0, 0]; });
      for (var i = 0; i < nodes.length; i++) for (var j = i + 1; j < nodes.length; j++) {
        var a = nodes[i], b = nodes[j], dx = a.x - b.x, dy = a.y - b.y, d2 = Math.max(80, dx * dx + dy * dy), k = 9000 / d2;
        f[a.id][0] += dx * k / Math.sqrt(d2); f[a.id][1] += dy * k / Math.sqrt(d2); f[b.id][0] -= dx * k / Math.sqrt(d2); f[b.id][1] -= dy * k / Math.sqrt(d2);
      }
      edges.forEach(function (e) {
        var a = byId[e.a], b = byId[e.b]; if (!a || !b) return;
        var dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 1, k = (d - 170) * 0.02;
        f[a.id][0] += dx / d * k * 10; f[a.id][1] += dy / d * k * 10; f[b.id][0] -= dx / d * k * 10; f[b.id][1] -= dy / d * k * 10;
      });
      nodes.forEach(function (n) {
        if (free.indexOf(n) < 0) return;
        f[n.id][0] += (W / 2 - n.x) * 0.01; f[n.id][1] += (H / 2 - n.y) * 0.01;
        n.x = Math.max(50, Math.min(W - 50, n.x + Math.max(-12, Math.min(12, f[n.id][0]))));
        n.y = Math.max(40, Math.min(H - 40, n.y + Math.max(-12, Math.min(12, f[n.id][1]))));
      });
    }
    nodes.forEach(function (n) { n.x = Math.round(n.x); n.y = Math.round(n.y); });
  };
  OS.roleColor = function (role) {
    return { protagonist: '#c8102e', antagonist: '#5b2a86', deuteragonist: '#b45a31', love: '#db2665', mentor: '#2c6db3', ally: '#2b8362', foil: '#827319',
      confidant: '#337f8a', trickster: '#956c15', herald: '#8a6d3b', guardian: '#46505e', shapeshifter: '#a65b8a', witness: '#6b6f7a' }[role] || '#6b6f7a';
  };

  /* ======================================================================== the swap popover (used by the Spark pages) */
  OS.popover = function (anchor, opts) {
    OS.closePopover();
    var pop = document.createElement('div');
    pop.className = 'ui os-pop';
    pop.setAttribute('role', 'dialog');
    pop.innerHTML = '<h4>' + esc(opts.title) + '</h4><div class="opts">' + opts.options.map(function (o, i) {
      return '<button type="button" data-i="' + i + '">' + esc(o) + '</button>';
    }).join('') + '</div><form data-own><input type="text" placeholder="Write your own…" maxlength="200"><button class="ui-btn sm primary" type="submit">Use</button></form>' +
      '<div class="tools"><button type="button" class="ui-btn sm" data-more>' + UI.icon('refresh') + 'More</button>' +
      (opts.lockable ? '<button type="button" class="ui-btn sm" data-lock>' + UI.icon('lock') + (opts.locked ? 'Unlock' : 'Lock') + '</button>' : '') + '</div>';
    document.body.appendChild(pop);
    var r = anchor.getBoundingClientRect(), w = pop.offsetWidth;
    pop.style.left = Math.max(12, Math.min(window.scrollX + r.left, window.scrollX + document.documentElement.clientWidth - w - 12)) + 'px';
    pop.style.top = (window.scrollY + r.bottom + 8) + 'px';
    anchor.classList.add('open');
    pop.addEventListener('click', function (e) {
      var b = e.target.closest('[data-i]');
      if (b) { opts.onPick(opts.options[+b.getAttribute('data-i')]); OS.closePopover(); return; }
      if (e.target.closest('[data-more]')) { var more = opts.more && opts.more(); if (more) { opts.options = more; OS.popover(anchor, opts); } return; }
      if (e.target.closest('[data-lock]')) { opts.onLock(); OS.closePopover(); }
    });
    pop.querySelector('[data-own]').addEventListener('submit', function (e) {
      e.preventDefault();
      var v = pop.querySelector('[data-own] input').value.trim();
      if (v) { opts.onPick(v); OS.closePopover(); }
    });
    OS._pop = { el: pop, anchor: anchor };
    setTimeout(function () { document.addEventListener('mousedown', outside); document.addEventListener('keydown', key); }, 0);
    function outside(e) { if (!pop.contains(e.target) && !anchor.contains(e.target)) OS.closePopover(); }
    function key(e) { if (e.key === 'Escape') OS.closePopover(); }
    OS._popOff = function () { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', key); };
    return pop;
  };
  OS.closePopover = function () {
    if (OS._pop) { OS._pop.el.remove(); OS._pop.anchor.classList.remove('open'); OS._pop = null; }
    if (OS._popOff) { OS._popOff(); OS._popOff = null; }
  };
  window.addEventListener('hashchange', function () { OS.closePopover(); });

  /* A Spark machine bound to an element: the abstract with chips + swap popovers. Used by the Spark page and the landing page. */
  OS.sparkMachine = function (el, st, onChange) {
    el.addEventListener('click', function (e) {
      var holder = e.target.closest('.os-chip');
      if (!holder || !el.contains(holder)) return;
      var slot = holder.getAttribute('data-slot');
      e.stopPropagation();
      var info = OS.spark.SLOTS[slot];
      OS.popover(holder, {
        title: 'Swap the ' + info[0].toLowerCase() + ' · ' + info[1], options: OS.spark.options(slot, st, 8), lockable: true, locked: !!st.locked[slot],
        more: function () { return OS.spark.options(slot, st, 8); },
        onPick: function (v) { OS.spark.set(st, slot, v); onChange(slot); },
        onLock: function () { st.locked[slot] = !st.locked[slot]; onChange(null); }
      });
    });
    el.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('span.os-chip')) { e.preventDefault(); e.target.click(); }
    });
  };
})();
