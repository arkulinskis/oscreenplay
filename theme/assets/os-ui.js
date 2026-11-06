/* os-ui.js: the bridge between OScreenplay's JavaScript engine and the Python Forms.
   Loaded after app-kit.js and before os-data.js / os-engine.js / os-studio.js / os-tabs.js (the engine, unchanged
   from the old app). It provides:
   1. the UI helpers the engine and the project tabs call (they came from the old core.js): initials, dates, formData,
      busy, toast, modal, confirm, go, api. UI.api goes to the server through Python (startup.py sets OS_SERVER).
   2. OSF: engine data read out as plain JSON for the Forms (decks, spark views, posters, seeds for new projects).
   3. OS.workspace: the project editor (six tabs + autosave), mounted by Components/Workspace.
   4. The Watch section's click-to-play video (nothing loads from YouTube before the click). */
(function () {
  'use strict';
  var UI = window.UI = window.UI || {};
  UI.config.name = 'OScreenplay';
  var esc = function (s) { return UI.esc(s); };

  /* ------------------------------------------------------------------ 1. helpers the engine expects */
  UI.initials = function (name) {
    var p = String(name || '?').trim().split(/\s+/);
    return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  };
  UI.fmtDate = function (iso, opts) {
    if (!iso) return '';
    var d = iso.length <= 10 ? new Date(iso + 'T12:00:00') : new Date(iso);
    return d.toLocaleDateString([], opts || { day: 'numeric', month: 'short', year: 'numeric' });
  };
  UI.ago = function (iso) {
    if (!iso) return '';
    var s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return 'just now';
    var steps = [[60, 'minute'], [24, 'hour'], [7, 'day'], [4.35, 'week'], [12, 'month'], [Infinity, 'year']], n = s / 60;
    for (var i = 0; i < steps.length; i++) {
      if (n < steps[i][0]) { n = Math.floor(n); return UI.plural(n, steps[i][1]) + ' ago'; }
      n = n / steps[i][0];
    }
    return '';
  };
  UI.formData = function (form) {
    var out = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || el.disabled) return;
      if (el.type === 'checkbox') out[el.name] = el.checked;
      else if (el.type === 'radio') { if (el.checked) out[el.name] = el.value; }
      else out[el.name] = el.value;
    });
    return out;
  };
  UI.busy = function (btn, promise) {
    if (!btn) return promise;
    btn.disabled = true; btn.classList.add('is-busy');
    var done = function () { btn.disabled = false; btn.classList.remove('is-busy'); };
    promise.then(done, done);
    return promise;
  };
  UI.toast = function (msg, kind) {
    var box = document.querySelector('.ui-toasts');
    if (!box) { box = document.createElement('div'); box.className = 'ui ui-toasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    var t = document.createElement('div');
    t.className = 'ui-toast' + (kind ? ' ' + kind : '');
    t.innerHTML = (kind === 'error' ? UI.icon('info') : kind === 'ok' ? UI.icon('check') : '') + '<span>' + esc(msg) + '</span>';
    box.appendChild(t);
    setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 260); }, kind === 'error' ? 6500 : 3200);
  };
  /* The project tabs' own dialogs (scene, event, relationship, import...): part of the editor engine. */
  UI.modal = function (html, opts) {
    opts = opts || {};
    var prev = document.activeElement;
    var wrap = document.createElement('div');
    wrap.className = 'ui ui-modal-wrap';
    wrap.innerHTML = '<div class="ui-modal' + (opts.wide ? ' wide' : '') + '" role="dialog" aria-modal="true" tabindex="-1">' +
      '<button class="ui-btn ghost icon ui-modal-x" data-close aria-label="Close">' + UI.icon('x') + '</button>' + html + '</div>';
    document.body.appendChild(wrap);
    document.documentElement.classList.add('ui-modal-open');
    function key(e) { if (e.key === 'Escape') close(); }
    function close() {
      if (!wrap.parentNode) return;
      wrap.remove(); document.removeEventListener('keydown', key);
      if (!document.querySelector('.ui-modal-wrap')) document.documentElement.classList.remove('ui-modal-open');
      if (opts.onclose) opts.onclose();
      if (prev && prev.focus) prev.focus();
    }
    document.addEventListener('keydown', key);
    wrap.addEventListener('mousedown', function (e) { if (e.target === wrap) close(); });
    wrap.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) close(); });
    var first = wrap.querySelector('input, textarea, select');
    setTimeout(function () { var f = first || wrap.querySelector('.ui-modal'); if (f && f.focus) f.focus(); }, 30);
    return { el: wrap.querySelector('.ui-modal'), close: close };
  };
  UI.confirm = function (o) {
    o = typeof o === 'string' ? { title: o } : (o || {});
    return new Promise(function (resolve) {
      var answered = false;
      var m = UI.modal('<h2>' + esc(o.title || 'Are you sure?') + '</h2>' + (o.text ? '<p class="muted">' + esc(o.text) + '</p>' : '') +
        '<div class="ui-row end" style="margin-top:20px"><button class="ui-btn ghost" data-close>' + esc(o.cancel || 'Cancel') + '</button>' +
        '<button class="ui-btn ' + (o.danger ? 'danger solid' : 'primary') + '" data-ok>' + esc(o.ok || 'OK') + '</button></div>',
      { onclose: function () { if (!answered) resolve(false); } });
      m.el.querySelector('[data-ok]').onclick = function () { answered = true; m.close(); resolve(true); };
    });
  };
  UI.hashFor = function () {
    return '#' + Array.prototype.slice.call(arguments).filter(function (x) { return x != null && x !== ''; })
      .map(function (x) { return encodeURIComponent(String(x)); }).join('/');
  };
  UI.go = function () { location.hash = UI.hashFor.apply(null, arguments); };
  /* the engine's links written as data-go="page/arg" (the old app's global click rule) */
  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('[data-go]') : null;
    if (!el) return;
    e.preventDefault();
    UI.go.apply(null, el.getAttribute('data-go').split('/'));
  });

  /* Server calls from the engine go through Python (startup.py: window.OS_SERVER(fn, argsJson, quiet) -> JSON text
     {"result": ...} or {"error": "...", "expected": true}). Expected errors reject with err.expected = true and show a
     toast unless the caller handles the rejection. */
  function apiCall(quiet, fn, args) {
    return Promise.resolve(window.OS_SERVER(fn, JSON.stringify(args), !!quiet)).then(function (txt) {
      var r = JSON.parse(txt);
      if (r.error != null) { var e = new Error(r.error); e.expected = !!r.expected; throw e; }
      return r.result;
    });
  }
  UI.api = function (fn) { return apiCall(false, fn, Array.prototype.slice.call(arguments, 1)); };
  UI.apiQuiet = function (fn) { return apiCall(true, fn, Array.prototype.slice.call(arguments, 1)); };
  window.addEventListener('unhandledrejection', function (e) {
    if (e.reason && e.reason.expected) { UI.toast(e.reason.message, 'error'); e.preventDefault(); }
  });

  /* ------------------------------------------------------------------ 2. OSF: engine data for the Forms */
  var OSF = window.OSF = {};
  var J = function (x) { return JSON.stringify(x); };
  var parse = function (t) { return typeof t === 'string' ? JSON.parse(t) : t; };

  OSF.numbers = function () {
    var OS = window.OS;
    return J({ ideas: OS.ideaCount(), reactions: OS.REACT.length * 6, structures: OS.STRUCTURE_ORDER.length, relations: OS.REL.length });
  };
  OSF.prompt = function (another) { return another ? window.OS.pick(window.OS.PROMPTS) : window.OS.daily(window.OS.PROMPTS); };

  /* Posters: the 15 progress segments, the colours and the small labels for Items/Poster. */
  OSF.poster = function (pj) {
    var OS = window.OS, p = parse(pj), st = p.stats || {};
    var total = st.beats_total || OS.beatsOf(p.structure).length, done = Math.min(total, st.beats_done || 0), f = OS.FORMATS[p.format] || OS.FORMATS.feature;
    var n = Math.min(total, 15), on = total ? Math.round(done / total * n) : 0;
    return J({ segs: n, on: on, style: OS.posterStyle(p.color), gen: p.genre || f.short,
      meta: f.short + ' · ' + UI.plural(st.scenes || 0, 'scene') + (st.pages ? ' · ' + st.pages + ' pp' : ''), format: f.name });
  };
  OSF.segs = function (el, n, on) {
    el.innerHTML = '';
    for (var i = 0; i < n; i++) { var s = document.createElement('i'); if (i < on) s.className = 'on'; el.appendChild(s); }
  };

  /* New screenplay dialog: the choices, and the seed the server stores. */
  OSF.newProjectOptions = function () {
    var OS = window.OS;
    return J({ formats: Object.keys(OS.FORMATS).map(function (k) { return [k, OS.FORMATS[k].name]; }),
      genres: OS.GENRES.map(function (g) { return g[1]; }),
      structures: OS.STRUCTURE_ORDER.map(function (k) { var s = OS.STRUCTURES[k]; return { key: k, name: s.name, by: s.by, beats: s.beats.length }; }) });
  };
  OSF.seed = function (vj) {
    var OS = window.OS, v = parse(vj), seed;
    if (v.start === 'spark') {
      var st = OS.spark.generate(OS.spark.fresh());
      var g = OS.GENRES.filter(function (x) { return x[1] === v.genre; })[0];
      if (g) { st.genre = g[0]; OS.spark.generate(st); }
      seed = OS.spark.toSeed(st, { format: v.format });
      if (v.structure !== 'circle') { OS.remapBeats(seed.doc.scenes, 'circle', v.structure); seed.structure = v.structure; }
      if ((v.title || '').trim()) seed.title = v.title.trim();
    } else {
      var doc = OS.newDoc();
      var hero = OS.blankCharacter('protagonist'); hero.name = 'Protagonist'; doc.characters.push(hero);
      if (v.start === 'beats') OS.beatsOf(v.structure).forEach(function (b) {
        doc.scenes.push({ id: OS.uid('s'), heading: '', summary: b.n + ': ' + b.q, goal: '', conflict: '', outcome: '', beat: b.k, charge_in: null, charge_out: null, chars: [hero.id], events: [], done: false });
      });
      seed = { title: (v.title || '').trim() || 'Untitled screenplay', format: v.format, genre: v.genre, structure: v.structure, color: OS.pick(Object.keys(OS.COLORS)), doc: doc };
    }
    return J(seed);
  };

  /* Spark: the state object stays in JavaScript; Python keeps a handle to it and reads views of it. */
  OSF.sparkState = function (pendingJson) {
    var OS = window.OS, st = OS.spark.fresh(), pending = parse(pendingJson);
    if (pending && pending.slots) { st.slots = pending.slots; st.tpl = pending.tpl || 'until'; st.genre = pending.genre || 'any'; st.flavor = pending.flavor; st.weird = UI.store.get('sparkWeird', 20); }
    else { st.genre = UI.store.get('sparkGenre', 'any'); st.weird = UI.store.get('sparkWeird', 20); st.tpl = UI.store.get('sparkTpl', 'until'); OS.spark.generate(st); }
    return st;
  };
  OSF.reelState = function () { return window.OS.spark.generate({ slots: {}, locked: {}, tpl: 'until', genre: 'any', weird: 15 }); };
  OSF.sparkView = function (st) {
    var OS = window.OS, beats = OS.beatsOf('circle');
    return J({
      genre: (OS.GENRE[st.flavor] || {}).name || 'Any genre', tpl: st.tpl, tpl_name: OS.spark.TEMPLATES[st.tpl].name, words: OS.words(OS.spark.text(st)),
      title: st.slots.title, weird: st.weird, genre_key: st.genre,
      slots: OS.spark.ORDER.map(function (k) {
        return { k: k, label: OS.spark.SLOTS[k][0], value: (k === 'twist' ? OS.spark.resolve(st, st.slots[k]) : st.slots[k]) || '', locked: !!st.locked[k] };
      }),
      logline: OS.spark.logline(st), theme: OS.cap(st.slots.truth || '') + '.',
      circle: OS.spark.circle(st).map(function (l, i) { return { n: beats[i].n, text: l }; }),
      cast: OS.spark.cast(st).map(function (c) {
        return { name: c.name, initials: UI.initials(c.name), color: OS.roleColor(c.role), line: OS.ROLE[c.role] + (c.occupation ? ' · ' + c.occupation : '') + (c.want ? ' · ' + c.want : '') };
      })
    });
  };
  OSF.sparkChoices = function () {
    var OS = window.OS;
    return J({ genres: OS.GENRES.map(function (g) { return [g[0], g[1]]; }),
      templates: Object.keys(OS.spark.TEMPLATES).map(function (k) { return [k, OS.spark.TEMPLATES[k].name]; }),
      formats: Object.keys(OS.FORMATS).map(function (k) { return [k, OS.FORMATS[k].name]; }) });
  };
  /* The machine itself (title chip + abstract with chips) and its swap popovers. */
  OSF.drawMachine = function (el, st, changed) {
    var OS = window.OS;
    el.innerHTML = '<h2 class="sk-title"><span role="button" tabindex="0" class="os-chip' + (st.locked.title ? ' locked' : '') + '" data-slot="title">' + esc(st.slots.title) + '</span></h2>' +
      '<p class="sk-abs">' + OS.spark.render(st) + '</p>' +
      '<p class="sk-meta"><span>' + esc((OS.GENRE[st.flavor] || {}).name || 'Any genre') + ' · ' + esc(OS.spark.TEMPLATES[st.tpl].name) + '</span>' +
      '<span>' + OS.words(OS.spark.text(st)) + ' words</span></p>';
    if (changed) { var c = el.querySelector('[data-slot="' + changed + '"]'); if (c) c.classList.add('flash'); }
  };
  OSF.bindMachine = function (el, st, onChange) { window.OS.sparkMachine(el, st, function (changed) { onChange(changed || ''); }); };
  OSF.sparkPull = function (st) { window.OS.spark.generate(st); };
  OSF.sparkRoll = function (st, k) { var o = window.OS.spark.options(k, st, 1); if (o[0]) { window.OS.spark.set(st, k, o[0]); return true; } return false; };
  OSF.sparkLock = function (st, k) { st.locked[k] = !st.locked[k]; };
  OSF.sparkSnapshot = function (st) { return J({ slots: st.slots, locked: st.locked, tpl: st.tpl, flavor: st.flavor }); };
  OSF.sparkRestore = function (st, snap, keepLocks) {
    var h = parse(snap);
    st.slots = JSON.parse(JSON.stringify(h.slots)); st.tpl = h.tpl; st.flavor = h.flavor;
    if (!keepLocks) st.locked = h.locked || {};
  };
  OSF.sparkHistoryLabel = function (snap) { var h = parse(snap); return J({ title: h.slots.title, line: window.OS.cap(h.slots.adj) + ' ' + h.slots.hero }); };
  OSF.sparkSet = function (st, key, value) {
    if (key === 'genre') { st.genre = value; UI.store.set('sparkGenre', value); window.OS.spark.generate(st); }
    if (key === 'tpl') { st.tpl = value; UI.store.set('sparkTpl', value); }
    if (key === 'weird') { st.weird = +value; UI.store.set('sparkWeird', +value); }
  };
  OSF.sparkFromSaved = function (st, sj) {
    var s = parse(sj), slots = {};
    Object.keys(s.slots || {}).forEach(function (k) { if (k.charAt(0) !== '_') slots[k] = s.slots[k]; });
    st.slots = slots; st.tpl = s.slots._tpl || 'until'; st.flavor = s.slots._flavor || 'dr'; st.genre = s.slots._genre || 'any'; st.locked = {};
  };
  OSF.sparkSaveArgs = function (st) {
    var slots = Object.assign({}, st.slots, { _tpl: st.tpl, _genre: st.genre, _flavor: st.flavor });
    return J([st.slots.title, window.OS.spark.text(st), slots]);
  };
  OSF.sparkSeed = function (st, format) { return J(window.OS.spark.toSeed(st, { format: format })); };
  OSF.savedSeed = function (sj, format) { var st = window.OS.spark.fresh(); OSF.sparkFromSaved(st, sj); return OSF.sparkSeed(st, format); };
  OSF.pendingSpark = function (st) { return J({ slots: st.slots, tpl: st.tpl, genre: st.genre, flavor: st.flavor }); };

  /* Ideas */
  var ABOUT = {
    archetypes: 'Roles characters play in the story\'s machine. Mix them: a mentor can be a shapeshifter.', occupations: 'A job is a world with its own rules, vocabulary and pressures.',
    wounds: 'The ghost from the past. Each wound comes with the lie it usually grows into: pick one in a character and the lie fills itself in.',
    lies: 'The false belief the wound planted. A positive arc is the story of unlearning it.', flaws: 'How the lie shows in behaviour. The flaw makes trouble; the arc fixes it (or doesn\'t).',
    fears: 'What they\'d do anything to avoid. Put it in the third act.', values: 'What they protect. Force two values into conflict and you have a dilemma.',
    secrets: 'What they hide. Decide who finds out, when, and what it costs.', quirks: 'Small, specific behaviour that makes a character visible in one shot.',
    voices: 'How they talk. A line of dialogue should tell you who said it, even without the name.', conditions: 'Illnesses and conditions as part of a life, not a gimmick. Research, consult, portray with care.',
    motivations: 'What drives a character forward, and the kinds of scenes each drive creates.', conflicts: 'The seven classic sources of opposition.',
    obstacles: 'Problems to throw in the hero\'s way. Escalate: each one worse than the last.', inciting: 'Something happens TO the hero that they can\'t ignore.',
    twists: 'Kinds of reversal, and how to earn them.', stakes: 'What could be lost. The best stories stack several kinds.', macguffins: 'The thing everyone wants. What it is matters less than who wants it.',
    complications: 'Drop one into any scene that feels too easy.', settings: 'Places with built-in pressure.', themes: 'Ask it as a question; let the characters argue both sides.',
    scenes: 'Classic scene shapes, with what makes each one work.'
  };
  function deckIndex() {
    var DECK = {};
    window.OS.DECKS.forEach(function (g) { g[1].forEach(function (d) { DECK[d[0]] = { key: d[0], name: d[1], icon: d[2], group: g[0] }; }); });
    return DECK;
  }
  function card(it, deck, withDeck) {
    var OS = window.OS, DECK = deckIndex();
    var x = it.x ? (deck === 'wounds' ? 'Lie: ' : deck === 'voices' ? '“' : '') + it.x + (deck === 'voices' ? '”' : '') : '';
    return { t: it.t, d: it.d || '', x: x, deck: withDeck ? DECK[deck].name : '',
      tags: (it.g || []).map(function (g) { return OS.GENRE[g] ? OS.GENRE[g].name : ''; }).filter(Boolean).join(' · ') };
  }
  OSF.decks = function () {
    var OS = window.OS;
    return J(OS.DECKS.map(function (g) { return { group: g[0], decks: g[1].map(function (d) { return { key: d[0], name: d[1], icon: d[2], count: OS.L[d[0]].length }; }) }; }));
  };
  OSF.ideaCount = function () { return window.OS.ideaCount(); };
  OSF.deck = function (key) {
    var OS = window.OS, DECK = deckIndex(), d = DECK[key] || DECK.archetypes;
    return J({ key: d.key, name: d.name, group: d.group, about: ABOUT[d.key] || '', cards: OS.L[d.key].map(function (it) { return card(it, d.key); }) });
  };
  OSF.searchIdeas = function (q) {
    var OS = window.OS, DECK = deckIndex(), hits = [];
    q = String(q || '').trim().toLowerCase();
    Object.keys(DECK).forEach(function (k) {
      OS.L[k].forEach(function (it) { if ((it.t + ' ' + (it.d || '') + ' ' + (it.x || '')).toLowerCase().indexOf(q) >= 0) hits.push(card(it, k, true)); });
    });
    return J({ count: hits.length, cards: hits.slice(0, 120) });
  };
  OSF.drawIdea = function (key) {
    var OS = window.OS, DECK = deckIndex(), keys = key ? [key] : Object.keys(DECK), k = OS.pick(keys), it = OS.pick(OS.L[k]);
    return J(card(it, k, true));
  };

  /* Learn */
  OSF.structures = function () {
    var OS = window.OS;
    return J(OS.STRUCTURE_ORDER.filter(function (k) { return k !== 'circle'; }).map(function (k) {
      var s = OS.STRUCTURES[k];
      return { key: k, name: s.name, by: s.by, short: s.short, open: k === 'seq',
        beats: s.beats.map(function (b) { return { n: b.n, pct: Math.round(b.pct * 100), d: b.d, q: b.q }; }) };
    }));
  };
  OSF.circleStep = function (active) {
    var beats = window.OS.beatsOf('circle'), keys = beats.map(function (b) { return b.k; }), i = Math.max(0, keys.indexOf(active)), b = beats[i], opp = beats[(i + 4) % 8];
    return J({ key: b.k, i: i, phase: i < 2 || i === 7 ? 'order' : 'chaos', n: b.n, d: b.d, q: b.q,
      mirror: 'Mirrors step ' + ((i + 4) % 8 + 1) + ', ' + opp.n + ': ' + opp.d.toLowerCase(), prev: beats[(i + 7) % 8].k, next: beats[(i + 1) % 8].k });
  };
  OSF.beatTip = function (key) { var b = window.OS.beat('circle', key); return b ? b.n + ': ' + b.q : ''; };
  OSF.wheel = function (el, night, labels, active) {
    el.innerHTML = window.OS.svg.wheel({ night: !!night, labels: !!labels, active: active || null });
  };

  /* ------------------------------------------------------------------ 3. the project workspace (tabs + autosave) */
  /* OS.workspace(el, project, hooks) draws one of the six tabs (OS.tabs, in os-tabs.js) into el and autosaves the whole
     document a second after each change. hooks: status(kind, text), bar(json {score, counts, title}), tab(name, sub),
     retitle(title). Returns {go(tab, sub), setTitle(text), flush(), destroy()}. */
  window.OS = window.OS || {};
  window.OS.workspace = function (el, project, hooks, me, startTab, startSub) {
    var OS = window.OS;
    var P = project, T = null, dirty = false, timer = null, inflight = null, again = false, current = null;
    var tab = startTab || 'overview', sub = startSub || null;
    P.doc = OS.normalize(P.doc);
    OS.cache = { id: P.id, project: P };
    function status(kind, text) { try { hooks.status(kind, text); } catch (e) { console.error(e); } }
    function flush() {
      clearTimeout(timer);
      if (!dirty || P.readonly) return Promise.resolve();
      if (inflight) { again = true; return inflight; }
      dirty = false;
      status('busy', 'Saving…');
      P.stats = OS.stats(P);
      var patch = { title: P.title, logline: P.logline, genre: P.genre, format: P.format, structure: P.structure, color: P.color, doc: P.doc, stats: P.stats };
      inflight = UI.apiQuiet('save_project', P.id, patch).then(function () {
        inflight = null;
        status('', 'Saved');
        if (again || dirty) { again = false; dirty = true; return flush(); }
      }, function (err) {
        inflight = null; dirty = true;
        status('err', 'Not saved. Retrying…');
        timer = setTimeout(flush, 8000);
        if (err && err.expected) UI.toast(err.message, 'error'); else console.warn(err);
      });
      return inflight;
    }
    function refreshBar() {
      var d = OS.doctor(P);
      var counts = { cast: P.doc.characters.length, web: P.doc.relations.length, chronology: P.doc.events.length, storyline: P.doc.scenes.length, pages: OS.script.pages(P.doc.script) };
      try { hooks.bar(J({ score: d.score, counts: counts, title: P.title || 'Untitled' })); } catch (e) { console.error(e); }
    }
    function touch() {
      if (P.readonly) { status('dirty', 'Sample: not saved'); refreshBar(); return; }
      dirty = true; status('dirty', 'Editing…');
      clearTimeout(timer); timer = setTimeout(flush, 1100);
      refreshBar();
    }
    function sortScenes() {
      var order = {}; OS.beatsOf(P.structure).forEach(function (b, i) { order[b.k] = i; });
      var idx = P.doc.scenes.map(function (s, i) { return [s, i]; });
      idx.sort(function (a, b) { var x = order[a[0].beat], y = order[b[0].beat]; x = x == null ? 999 : x; y = y == null ? 999 : y; return x - y || a[1] - b[1]; });
      P.doc.scenes = idx.map(function (p) { return p[0]; });
      T.doc = P.doc;
    }
    function drawTab() {
      if (current && current.destroy) { try { current.destroy(); } catch (e) { console.error(e); } }
      el.innerHTML = '';
      var box = document.createElement('div');
      el.appendChild(box);
      T.sub = sub;
      current = OS.tabs[tab](box, T) || null;
    }
    function go(t, s) {
      tab = OS.tabs[t] ? t : 'overview'; sub = s || null;
      try { hooks.tab(tab, sub || ''); } catch (e) { console.error(e); }
      drawTab();
    }
    function warn(e) { if (dirty && !P.readonly) { flush(); e.preventDefault(); e.returnValue = ''; } }
    /* links inside the tabs that open another tab ("Fix" in the doctor's notes, "Open the web"): data-go-tab="tab/sub" */
    el.addEventListener('click', function (e) {
      var g = e.target.closest('[data-go-tab]');
      if (!g || !el.contains(g)) return;
      e.preventDefault();
      var parts = g.getAttribute('data-go-tab').split('/');
      go(parts[0], parts[1]);
      var bar = document.querySelector('.pj-tabs');
      if (bar && window.scrollY > bar.offsetTop) window.scrollTo(0, Math.max(0, bar.offsetTop - 70));
    });
    T = { P: P, doc: P.doc, me: me, readonly: !!P.readonly, touch: touch, go: go, flush: flush, sortScenes: sortScenes, refreshBar: refreshBar,
      setStructure: function (k) { if (k === P.structure) return; OS.remapBeats(P.doc.scenes, P.structure, k); P.structure = k; sortScenes(); touch(); },
      retitle: function () { try { hooks.retitle(P.title || ''); } catch (e) { console.error(e); } refreshBar(); } };
    window.addEventListener('beforeunload', warn);
    refreshBar();
    drawTab();
    return {
      go: go,
      setTitle: function (text) { P.title = text; touch(); },
      flush: flush,
      destroy: function () {
        window.removeEventListener('beforeunload', warn);
        if (current && current.destroy) { try { current.destroy(); } catch (e) { console.error(e); } }
        current = null;
        if (dirty) flush();
        if (P.readonly) OS.cache = {};
      }
    };
  };

  /* ------------------------------------------------------------------ 4. Watch section: click to play */
  if (!window.__ytFilm) {
    window.__ytFilm = true;
    document.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('[data-yt-film]') : null;
      if (!b) return;
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + b.getAttribute('data-yt-film') + '?autoplay=1&rel=0&playsinline=1';
      f.title = b.getAttribute('data-yt-title') || 'Video';
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.allowFullscreen = true;
      f.referrerPolicy = 'strict-origin-when-cross-origin';
      b.parentNode.replaceChild(f, b);
    });
  }
})();
