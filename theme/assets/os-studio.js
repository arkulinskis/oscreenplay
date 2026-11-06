/* os-studio.js: from the old web/pages/_studio.html (OScreenplay's engine, unchanged). Field and editor helpers for the project tabs. */
(function () {
  'use strict';
  var esc = UI.esc;
  var ui = OS.ui = {};
  OS.tabs = OS.tabs || {};

  ui.avatar = function (c, size) {
    c = c || {};
    return '<span class="os-av' + (size ? ' ' + size : '') + '" style="background:' + OS.roleColor(c.role) + '" title="' + esc(c.name || '') + '">' + esc(UI.initials(c.name || '?')) + '</span>';
  };
  ui.avatars = function (doc, ids, max) {
    var list = (ids || []).map(function (id) { return OS.find(doc.characters, id); }).filter(Boolean);
    return '<span class="os-avs">' + list.slice(0, max || 5).map(function (c) { return ui.avatar(c, 'sm'); }).join('') +
      (list.length > (max || 5) ? '<span class="os-av sm" style="background:var(--c-faint)">+' + (list.length - (max || 5)) + '</span>' : '') + '</span>';
  };
  ui.charge = function (a, b) {
    function one(v) { var cls = v == null ? 'z' : v > 0 ? 'p' : v < 0 ? 'n' : 'z'; return '<span class="' + cls + '">' + (v == null ? '·' : OS.charge(v)) + '</span>'; }
    return '<span class="os-charge" title="Value at the start → at the end">' + one(a) + '→' + one(b) + '</span>';
  };
  ui.chargeSelect = function (name, v) {
    return '<select name="' + name + '"><option value="">Not set</option>' + [2, 1, 0, -1, -2].map(function (n) {
      return '<option value="' + n + '"' + (v === n ? ' selected' : '') + '>' + OS.charge(n) + '  ' + OS.chargeWord(n) + '</option>';
    }).join('') + '</select>';
  };

  /* Field decks: where the dice and the list button take their suggestions from. */
  ui.DECKS = {
    occupation: function () { return OS.L.occupations; }, archetype: function () { return OS.L.archetypes; },
    want: function () { return OS.S.want.map(function (w) { return { t: 'To ' + OS.goal(w.t), g: w.g }; }); },
    need: function () { return OS.S.truth.map(function (w) { return { t: 'To learn that ' + w.t }; }); },
    wound: function () { return OS.L.wounds; }, lie: function () { return OS.L.lies.concat(OS.L.wounds.map(function (w) { return { t: w.x, d: 'Grows from: ' + w.t }; })); },
    flaw: function () { return OS.L.flaws; }, fear: function () { return OS.L.fears; }, value: function () { return OS.L.values; },
    secret: function () { return OS.L.secrets; }, quirk: function () { return OS.L.quirks; }, voice: function () { return OS.L.voices; },
    condition: function () { return OS.L.conditions; }, theme: function () { return OS.L.themes; },
    theme_answer: function () { return OS.S.truth; }, conflict: function () { return OS.L.complications.concat(OS.L.obstacles); },
    world: function () { return OS.S.setting; }, name: function () { var o = []; for (var i = 0; i < 30; i++) o.push({ t: OS.suggestName() }); return o; }
  };
  /* A labelled field. o: {key, label, value, type: text|textarea|select, options: [[v, label]], help, placeholder, deck: true, rows, max} */
  ui.field = function (o) {
    var v = o.value == null ? '' : o.value, ctl;
    if (o.type === 'textarea') ctl = '<textarea data-f="' + o.key + '" rows="' + (o.rows || 3) + '" maxlength="' + (o.max || 4000) + '" placeholder="' + esc(o.placeholder || '') + '">' + esc(v) + '</textarea>';
    else if (o.type === 'select') ctl = '<select data-f="' + o.key + '">' + o.options.map(function (p) { return '<option value="' + esc(p[0]) + '"' + (String(p[0]) === String(v) ? ' selected' : '') + '>' + esc(p[1]) + '</option>'; }).join('') + '</select>';
    else ctl = '<input type="text" data-f="' + o.key + '" value="' + esc(v) + '" maxlength="' + (o.max || 300) + '" placeholder="' + esc(o.placeholder || '') + '">';
    var deck = o.deck && ui.DECKS[o.deckKey || o.key];
    return '<label class="os-f' + (o.wide ? ' wide' : '') + '"><span class="lab"><b>' + esc(o.label) + '</b>' + (o.help ? '<small>' + esc(o.help) + '</small>' : '') + '</span>' +
      '<span class="row">' + ctl + (deck ? '<button type="button" class="ui-btn os-dice" data-dice="' + (o.deckKey || o.key) + '" data-for="' + o.key + '" title="Suggest one" aria-label="Suggest ' + esc(o.label) + '">' + UI.icon('dice') + '</button>' +
      '<button type="button" class="ui-btn os-dice" data-list="' + (o.deckKey || o.key) + '" data-for="' + o.key + '" title="Browse ideas" aria-label="Browse ideas for ' + esc(o.label) + '">' + UI.icon('bulb') + '</button>' : '') + '</span></label>';
  };
  ui.randomFrom = function (deckKey, current) {
    var items = ui.DECKS[deckKey] ? ui.DECKS[deckKey]() : [];
    var pick = items.filter(function (i) { return i.t !== current; });
    return pick.length ? OS.pick(pick) : null;
  };
  /* A searchable list of ideas; onPick(item). */
  ui.pickList = function (title, items, onPick) {
    var m = UI.modal('<h2>' + esc(title) + '</h2><input type="search" placeholder="Search…" data-q><div class="os-pick-list" data-list></div>', { wide: true });
    function draw(q) {
      q = (q || '').toLowerCase();
      var list = items.filter(function (i) { return !q || (i.t + ' ' + (i.d || '') + ' ' + (i.x || '')).toLowerCase().indexOf(q) >= 0; });
      m.el.querySelector('[data-list]').innerHTML = list.length ? list.map(function (it) {
        return '<button type="button" data-i="' + items.indexOf(it) + '"><b>' + esc(it.t) + '</b>' + (it.d ? '<span>' + esc(it.d) + '</span>' : '') + (it.x ? '<i>' + esc(it.x) + '</i>' : '') + '</button>';
      }).join('') : '<p class="muted">Nothing matches. Close this and type your own.</p>';
    }
    draw();
    m.el.querySelector('[data-q]').addEventListener('input', function (e) { draw(e.target.value); });
    m.el.addEventListener('click', function (e) { var b = e.target.closest('[data-i]'); if (b) { onPick(items[+b.getAttribute('data-i')]); m.close(); } });
    return m;
  };
  /* Wire dice and list buttons inside `el`: setValue(key, item) applies a suggestion. */
  ui.wireSuggest = function (el, setValue, readonly) {
    el.addEventListener('click', function (e) {
      var d = e.target.closest('[data-dice]'), l = e.target.closest('[data-list]');
      if (d) {
        var inp = el.querySelector('[data-f="' + d.getAttribute('data-for') + '"]'), it = ui.randomFrom(d.getAttribute('data-dice'), inp && inp.value);
        if (it) { setValue(d.getAttribute('data-for'), it); if (inp) { inp.classList.remove('os-flash-in'); void inp.offsetWidth; inp.classList.add('os-flash-in'); } }
      } else if (l) {
        var key = l.getAttribute('data-for');
        ui.pickList('Ideas: ' + (l.closest('.os-f').querySelector('.lab b').textContent), ui.DECKS[l.getAttribute('data-list')](), function (it) { setValue(key, it); });
      }
    });
  };

  /* ---------------------------------------------------------------- scene editor */
  var TIMES = ['DAY', 'NIGHT', 'MORNING', 'AFTERNOON', 'EVENING', 'DAWN', 'DUSK', 'CONTINUOUS', 'LATER', 'MOMENTS LATER'];
  ui.splitHeading = function (h) {
    var m = String(h || '').match(/^(INT\.\/EXT\.|EXT\.\/INT\.|I\/E\.?|INT\.|EXT\.|EST\.)\s*(.*?)(?:\s+-\s+([A-Z ]+))?$/i);
    if (!m) return { ie: 'INT.', loc: String(h || ''), time: 'DAY' };
    return { ie: m[1].toUpperCase(), loc: m[2] || '', time: (m[3] || 'DAY').toUpperCase().trim() };
  };
  ui.locations = function (doc) {
    var set = {};
    doc.scenes.forEach(function (s) { var l = ui.splitHeading(s.heading).loc; if (l) set[l.toUpperCase()] = 1; });
    (doc.script || []).forEach(function (b) { if (b.t === 'scene') { var l = ui.splitHeading(b.x).loc; if (l) set[l.toUpperCase()] = 1; } });
    return Object.keys(set).sort();
  };
  ui.editScene = function (T, scene, onDone) {
    var doc = T.doc, isNew = !OS.find(doc.scenes, scene.id), h = ui.splitHeading(scene.heading), beats = OS.beatsOf(T.P.structure);
    var num = doc.scenes.indexOf(scene) + 1;
    var m = UI.modal('<h2>' + (isNew ? 'New scene' : 'Scene ' + num) + '</h2>' +
      '<form class="ui-stack" data-sc><datalist id="os-locs">' + ui.locations(doc).map(function (l) { return '<option value="' + esc(l) + '">'; }).join('') + '</datalist>' +
      '<div><span class="lab" style="font-weight:600;font-size:.86rem;display:block;margin-bottom:5px">Scene heading</span><div class="os-head3">' +
      '<select name="ie">' + ['INT.', 'EXT.', 'INT./EXT.', 'EST.'].map(function (x) { return '<option' + (h.ie === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select>' +
      '<input type="text" name="loc" list="os-locs" placeholder="LOCATION" value="' + esc(h.loc) + '" maxlength="80" style="text-transform:uppercase">' +
      '<select name="time">' + TIMES.map(function (x) { return '<option' + (h.time === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></div></div>' +
      '<label class="ui-field"><span>What happens <em>(one or two sentences)</em></span><textarea name="summary" rows="3" maxlength="1200">' + esc(scene.summary || '') + '</textarea></label>' +
      '<div class="os-fields"><label class="ui-field"><span>Goal <em>(who wants what here?)</em></span><input type="text" name="goal" maxlength="240" value="' + esc(scene.goal || '') + '"></label>' +
      '<label class="ui-field"><span>Conflict <em>(what stops them?)</em></span><span class="ui-row" style="flex-wrap:nowrap;gap:6px"><input type="text" name="conflict" maxlength="240" value="' + esc(scene.conflict || '') + '"><button type="button" class="ui-btn os-dice" data-complication title="Drop in a complication" aria-label="Suggest a complication">' + UI.icon('dice') + '</button></span></label>' +
      '<label class="ui-field"><span>Outcome <em>(how it turns)</em></span><input type="text" name="outcome" maxlength="240" value="' + esc(scene.outcome || '') + '"></label>' +
      '<label class="ui-field"><span>Beat</span><select name="beat">' + beats.map(function (b, i) { return '<option value="' + b.k + '"' + (scene.beat === b.k ? ' selected' : '') + '>' + (i + 1) + '. ' + esc(b.n) + '</option>'; }).join('') + '</select></label>' +
      '<label class="ui-field"><span>Value at the start</span>' + ui.chargeSelect('charge_in', scene.charge_in) + '</label>' +
      '<label class="ui-field"><span>Value at the end</span>' + ui.chargeSelect('charge_out', scene.charge_out) + '</label></div>' +
      '<div><span style="font-weight:600;font-size:.86rem;display:block;margin-bottom:6px">Who\'s in it</span><div class="os-checks">' + (doc.characters.length ? doc.characters.map(function (c) {
        return '<label><input type="checkbox" name="ch" value="' + c.id + '"' + (scene.chars.indexOf(c.id) >= 0 ? ' checked' : '') + '>' + ui.avatar(c, 'sm') + esc(c.name || 'Unnamed') + '</label>';
      }).join('') : '<span class="muted small">No characters yet.</span>') + '</div></div>' +
      '<div><span style="font-weight:600;font-size:.86rem;display:block;margin-bottom:6px">Events it shows <em class="muted" style="font-weight:400">(from the chronology)</em></span><div class="os-checks">' + doc.events.map(function (ev, i) {
        return '<label><input type="checkbox" name="ev" value="' + ev.id + '"' + (scene.events.indexOf(ev.id) >= 0 ? ' checked' : '') + '><b class="os-tc" style="letter-spacing:.04em">E' + (i + 1) + '</b>' + esc(ev.title || 'Untitled') + '</label>';
      }).join('') + '<label><input type="checkbox" name="newev"' + (isNew && !doc.events.length ? ' checked' : '') + '>' + UI.icon('plus') + 'Add a new event for this scene</label></div></div>' +
      '<label class="ui-check"><input type="checkbox" name="done"' + (scene.done ? ' checked' : '') + '> Written: this scene is in the pages and I\'m happy with it</label>' +
      (T.readonly ? '<p class="ui-note">This is a sample: changes stay on this page. Make a copy to keep them.</p>' : '') +
      '<div class="ui-row"><' + (isNew ? 'span' : 'button type="button" class="ui-btn danger" data-del') + '>' + (isNew ? '' : UI.icon('trash') + 'Delete') + '</' + (isNew ? 'span' : 'button') + '>' +
      (isNew ? '' : '<button type="button" class="ui-btn" data-dup>' + UI.icon('copy') + 'Duplicate</button>') + '<span class="ui-spacer"></span>' +
      '<button type="button" class="ui-btn ghost" data-close>Cancel</button><button class="ui-btn primary" type="submit">' + UI.icon('check') + 'Save scene</button></div></form>', { wide: true });
    var form = m.el.querySelector('[data-sc]');
    m.el.querySelector('[data-complication]').addEventListener('click', function () {
      var inp = form.querySelector('[name=conflict]'), c = OS.pick(OS.L.complications).t;
      inp.value = inp.value ? inp.value.replace(/\.?$/, '. ') + c : c;
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = UI.formData(form), num = function (x) { return x === '' || x == null ? null : +x; };
      scene.heading = (v.ie + ' ' + v.loc.trim().toUpperCase() + (v.loc.trim() ? ' - ' + v.time : '')).trim();
      if (!v.loc.trim()) scene.heading = '';
      scene.summary = v.summary.trim(); scene.goal = v.goal.trim(); scene.conflict = v.conflict.trim(); scene.outcome = v.outcome.trim();
      scene.beat = v.beat; scene.charge_in = num(v.charge_in); scene.charge_out = num(v.charge_out); scene.done = !!v.done;
      scene.chars = Array.prototype.map.call(form.querySelectorAll('[name=ch]:checked'), function (x) { return x.value; });
      scene.events = Array.prototype.map.call(form.querySelectorAll('[name=ev]:checked'), function (x) { return x.value; });
      if (v.newev) {
        var ev = { id: OS.uid('e'), when: '', title: scene.summary ? scene.summary.split(/[.!?]/)[0].slice(0, 80) : (scene.heading || 'New event'), detail: scene.summary, chars: scene.chars.slice(), kind: 'story' };
        doc.events.push(ev); scene.events.push(ev.id);
      }
      if (isNew) doc.scenes.push(scene);
      T.sortScenes(); T.touch(); m.close(); if (onDone) onDone(scene);
    });
    var del = m.el.querySelector('[data-del]');
    if (del) del.addEventListener('click', function () {
      UI.confirm({ title: 'Delete scene ' + num + '?', text: 'The scene card goes; its events stay in the chronology.', ok: 'Delete', danger: true }).then(function (yes) {
        if (!yes) return;
        doc.scenes.splice(doc.scenes.indexOf(scene), 1);
        doc.plants.forEach(function (p) { if (p.setup_scene === scene.id) p.setup_scene = ''; if (p.payoff_scene === scene.id) p.payoff_scene = ''; });
        T.touch(); m.close(); if (onDone) onDone(null);
      });
    });
    var dup = m.el.querySelector('[data-dup]');
    if (dup) dup.addEventListener('click', function () {
      var copy = JSON.parse(JSON.stringify(scene)); copy.id = OS.uid('s'); copy.done = false;
      doc.scenes.splice(doc.scenes.indexOf(scene) + 1, 0, copy); T.touch(); m.close(); if (onDone) onDone(copy);
    });
    return m;
  };
  ui.newScene = function (beat) {
    return { id: OS.uid('s'), heading: '', summary: '', goal: '', conflict: '', outcome: '', beat: beat, charge_in: null, charge_out: null, chars: [], events: [], done: false };
  };

  /* ---------------------------------------------------------------- event editor */
  ui.KINDS = [['story', 'On screen (or meant to be)'], ['backstory', 'Backstory (before the film starts)'], ['offscreen', 'Off screen (happens, but we don\'t see it)']];
  ui.editEvent = function (T, ev, onDone, position) {
    var doc = T.doc, isNew = !OS.find(doc.events, ev.id);
    var m = UI.modal('<h2>' + (isNew ? 'New event' : 'Event') + '</h2><form class="ui-stack" data-ev>' +
      '<div class="os-fields"><label class="ui-field"><span>When <em>(a label: "1998", "Day 3, night")</em></span><input type="text" name="when" maxlength="60" value="' + esc(ev.when || '') + '"></label>' +
      '<label class="ui-field"><span>Kind</span><select name="kind">' + ui.KINDS.map(function (k) { return '<option value="' + k[0] + '"' + (ev.kind === k[0] ? ' selected' : '') + '>' + esc(k[1]) + '</option>'; }).join('') + '</select></label></div>' +
      '<label class="ui-field"><span>What happened</span><input type="text" name="title" maxlength="140" required value="' + esc(ev.title || '') + '"></label>' +
      '<label class="ui-field"><span>Details <em>(optional)</em></span><textarea name="detail" rows="3" maxlength="1500">' + esc(ev.detail || '') + '</textarea></label>' +
      (isNew && doc.events.length ? '<label class="ui-field"><span>Place it</span><select name="pos"><option value="end">At the end (latest)</option><option value="start">At the start (earliest)</option>' +
        doc.events.map(function (x, i) { return '<option value="' + i + '"' + (position === i ? ' selected' : '') + '>After E' + (i + 1) + ': ' + esc((x.title || '').slice(0, 50)) + '</option>'; }).join('') + '</select></label>' : '') +
      '<div><span style="font-weight:600;font-size:.86rem;display:block;margin-bottom:6px">Who was involved</span><div class="os-checks">' + doc.characters.map(function (c) {
        return '<label><input type="checkbox" name="ch" value="' + c.id + '"' + (ev.chars.indexOf(c.id) >= 0 ? ' checked' : '') + '>' + ui.avatar(c, 'sm') + esc(c.name || 'Unnamed') + '</label>';
      }).join('') + '</div></div>' +
      '<div class="ui-row">' + (isNew ? '' : '<button type="button" class="ui-btn danger" data-del>' + UI.icon('trash') + 'Delete</button>') + '<span class="ui-spacer"></span>' +
      '<button type="button" class="ui-btn ghost" data-close>Cancel</button><button class="ui-btn primary" type="submit">' + UI.icon('check') + 'Save event</button></div></form>', { wide: true });
    var form = m.el.querySelector('[data-ev]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = UI.formData(form);
      ev.when = v.when.trim(); ev.kind = v.kind; ev.title = v.title.trim(); ev.detail = v.detail.trim();
      ev.chars = Array.prototype.map.call(form.querySelectorAll('[name=ch]:checked'), function (x) { return x.value; });
      if (isNew) {
        if (v.pos === 'start') doc.events.unshift(ev); else if (v.pos && v.pos !== 'end') doc.events.splice(+v.pos + 1, 0, ev); else doc.events.push(ev);
      }
      T.touch(); m.close(); if (onDone) onDone(ev);
    });
    var del = m.el.querySelector('[data-del]');
    if (del) del.addEventListener('click', function () {
      UI.confirm({ title: 'Delete this event?', text: 'Scenes that show it keep their cards.', ok: 'Delete', danger: true }).then(function (yes) {
        if (!yes) return;
        doc.events.splice(doc.events.indexOf(ev), 1);
        doc.scenes.forEach(function (s) { s.events = s.events.filter(function (id) { return id !== ev.id; }); });
        T.touch(); m.close(); if (onDone) onDone(null);
      });
    });
  };

  /* ---------------------------------------------------------------- relationship editor */
  ui.editRelation = function (T, rel, onDone) {
    var doc = T.doc, isNew = !OS.find(doc.relations, rel.id);
    var opts = function (sel) { return doc.characters.map(function (c) { return '<option value="' + c.id + '"' + (sel === c.id ? ' selected' : '') + '>' + esc(c.name || 'Unnamed') + '</option>'; }).join(''); };
    var m = UI.modal('<h2>' + (isNew ? 'New relationship' : 'Relationship') + '</h2><form class="ui-stack" data-rel>' +
      '<div class="os-fields"><label class="ui-field"><span>Between</span><select name="a">' + opts(rel.a) + '</select></label><label class="ui-field"><span>and</span><select name="b">' + opts(rel.b) + '</select></label></div>' +
      '<label class="ui-field"><span>Kind</span><select name="type">' + OS.REL.map(function (r) { return '<option value="' + r[0] + '"' + (rel.type === r[0] ? ' selected' : '') + '>' + esc(r[1]) + '</option>'; }).join('') + '</select></label>' +
      '<p class="ui-note" data-q></p>' +
      '<div class="os-fields"><label class="ui-field"><span data-ab>How A treats B</span><input type="text" name="a_to_b" maxlength="140" value="' + esc(rel.a_to_b || '') + '" placeholder="Protects her from herself"></label>' +
      '<label class="ui-field"><span data-ba>How B treats A</span><input type="text" name="b_to_a" maxlength="140" value="' + esc(rel.b_to_a || '') + '" placeholder="Resents being protected"></label></div>' +
      '<label class="ui-field"><span>Tension <em data-tv>' + (rel.tension == null ? 5 : rel.tension) + ' / 10</em></span><input type="range" name="tension" min="0" max="10" value="' + (rel.tension == null ? 5 : rel.tension) + '" style="width:100%;accent-color:var(--c-brand)"></label>' +
      '<div class="ui-row">' + (isNew ? '' : '<button type="button" class="ui-btn danger" data-del>' + UI.icon('trash') + 'Delete</button>') + '<span class="ui-spacer"></span>' +
      '<button type="button" class="ui-btn ghost" data-close>Cancel</button><button class="ui-btn primary" type="submit">' + UI.icon('check') + 'Save</button></div></form>');
    var form = m.el.querySelector('[data-rel]');
    function labels() {
      var a = OS.find(doc.characters, form.a.value), b = OS.find(doc.characters, form.b.value), t = OS.RELTYPE[form.type.value];
      form.querySelector('[data-ab]').textContent = 'How ' + OS.first((a && a.name) || 'A') + ' treats ' + OS.first((b && b.name) || 'B');
      form.querySelector('[data-ba]').textContent = 'How ' + OS.first((b && b.name) || 'B') + ' treats ' + OS.first((a && a.name) || 'A');
      form.querySelector('[data-q]').textContent = t ? t.q : '';
      form.querySelector('[data-tv]').textContent = form.tension.value + ' / 10';
    }
    labels();
    form.addEventListener('input', labels);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = UI.formData(form);
      if (v.a === v.b) { UI.toast('Pick two different characters.', 'error'); return; }
      rel.a = v.a; rel.b = v.b; rel.type = v.type; rel.a_to_b = v.a_to_b.trim(); rel.b_to_a = v.b_to_a.trim(); rel.tension = +v.tension;
      if (isNew) doc.relations.push(rel);
      T.touch(); m.close(); if (onDone) onDone(rel);
    });
    var del = m.el.querySelector('[data-del]');
    if (del) del.addEventListener('click', function () { doc.relations.splice(doc.relations.indexOf(rel), 1); T.touch(); m.close(); if (onDone) onDone(null); });
  };
  /* Two characters with no relationship, and a type to try. */
  ui.suggestRelation = function (doc) {
    var pairs = [];
    doc.characters.forEach(function (a, i) { doc.characters.slice(i + 1).forEach(function (b) {
      if (!doc.relations.some(function (r) { return (r.a === a.id && r.b === b.id) || (r.a === b.id && r.b === a.id); })) pairs.push([a, b]);
    }); });
    if (!pairs.length) return null;
    var p = OS.pick(pairs), t = OS.pick(OS.REL);
    return { id: OS.uid('r'), a: p[0].id, b: p[1].id, type: t[0], a_to_b: '', b_to_a: '', tension: 3 + Math.floor(Math.random() * 6) };
  };
})();
