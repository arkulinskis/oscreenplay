/* os-tabs.js: the six project tabs (OS.tabs.overview/cast/web/chronology/storyline/pages), from the old
   web/pages/_tab_*.html, unchanged. Mounted by OS.workspace (os-ui.js) inside Components/Workspace. */
(function () {
  var esc = UI.esc;
  var TRAIT_WORDS = { O: ['set in their ways', 'practical', 'curious', 'restlessly imaginative'], C: ['chaotic', 'easygoing', 'organised', 'relentlessly disciplined'],
    E: ['deeply private', 'reserved', 'sociable', 'a force of nature in a room'], A: ['combative', 'blunt', 'kind', 'conflict-avoidant to a fault'], N: ['unshakeable', 'steady', 'sensitive', 'volatile'] };
  function read(c) {
    var t = c.traits || {}, w = function (k) { var v = t[k] == null ? 50 : t[k]; return TRAIT_WORDS[k][v < 25 ? 0 : v < 50 ? 1 : v < 75 ? 2 : 3]; };
    return OS.cap(w('E')) + ', ' + w('C') + ' and ' + w('A') + '; ' + w('O') + ', and emotionally ' + w('N') + '.';
  }

  OS.tabs.cast = function (el, T) {
    var doc = T.doc, eventKey = 'betrayal';
    function list() {
      var roles = {}; doc.characters.forEach(function (c) { roles[c.role] = 1; });
      var missing = [['protagonist', 'No protagonist yet'], ['antagonist', 'Nobody opposes the hero'], ['mentor', 'No mentor (optional)'], ['ally', 'No ally (optional)']].filter(function (m) { return !roles[m[0]]; })[0];
      el.innerHTML = '<div class="pj-sec-title"><div><h2>Cast</h2><p class="muted small" style="margin:4px 0 0">' + UI.plural(doc.characters.length, 'character') + '. Click one to build them in depth.</p></div>' +
        '<div class="cs-add"><button class="ui-btn" data-roll>' + UI.icon('dice') + 'Roll a character</button><button class="ui-btn primary" data-add>' + UI.icon('plus') + 'Add a character</button></div></div>' +
        (missing && doc.characters.length ? '<div class="cs-missing">' + UI.icon('bulb') + '<span>' + esc(missing[1]) + '.</span><button class="ui-btn sm" data-fill="' + missing[0] + '">' + UI.icon('wand') + 'Suggest ' + OS.article(OS.ROLE[missing[0]]) + ' ' + esc(OS.ROLE[missing[0]].toLowerCase()) + '</button></div>' : '') +
        (doc.characters.length ? '<div class="cs-grid">' + doc.characters.map(function (c) {
          var t = c.traits || {};
          return '<button type="button" class="ui-card cs-card" data-open="' + esc(c.id) + '"><div class="top">' + OS.ui.avatar(c) + '<div><h3>' + esc(c.name || 'Unnamed') + '</h3>' +
            '<span class="ui-badge" style="margin-top:4px">' + esc(OS.ROLE[c.role] || 'Supporting') + '</span></div></div>' +
            (c.archetype ? '<span class="os-tc">' + esc(c.archetype) + (c.age && c.age !== '0' ? ' · ' + esc(c.age) : '') + '</span>' : '') +
            '<p class="want">' + (c.want ? '<b>Wants</b> ' + esc(OS.lower1(c.want)) : 'No want yet.') + (c.flaw ? ' · <b>Flaw</b> ' + esc(c.flaw.toLowerCase()) : '') + '</p>' +
            '<div class="cs-traits">' + 'OCEAN'.split('').map(function (k) { return '<div>' + k + '<i><b style="width:' + (t[k] == null ? 50 : t[k]) + '%"></b></i></div>'; }).join('') + '</div></button>';
        }).join('') + '</div>' : '<div class="ui-empty">' + UI.icon('users') + '<h3>Nobody here yet</h3><p>Start with the protagonist: who do we follow, and what do they want?</p>' +
          '<div class="ui-row" style="justify-content:center"><button class="ui-btn" data-roll>' + UI.icon('dice') + 'Roll one</button><button class="ui-btn primary" data-add>' + UI.icon('plus') + 'Add the protagonist</button></div></div>');
    }

    function detail(c) {
      var scenes = doc.scenes.map(function (s, i) { return [s, i]; }).filter(function (x) { return x[0].chars.indexOf(c.id) >= 0; });
      var events = doc.events.map(function (e, i) { return [e, i]; }).filter(function (x) { return x[0].chars.indexOf(c.id) >= 0; });
      var rels = doc.relations.filter(function (r) { return r.a === c.id || r.b === c.id; });
      var F = function (o) { o.value = c[o.key]; return OS.ui.field(o); };
      el.innerHTML = '<a href="#" data-back class="small">' + UI.icon('back') + ' All characters</a>' +
        '<div class="ce-head" style="margin-top:12px">' + OS.ui.avatar(c, 'lg') + '<div class="name os-f"><span class="row"><input type="text" data-f="name" value="' + esc(c.name) + '" placeholder="Name" maxlength="80" aria-label="Name">' +
        '<button type="button" class="ui-btn os-dice" data-dice="name" data-for="name" title="Suggest a name" aria-label="Suggest a name">' + UI.icon('dice') + '</button></span>' +
        '<span class="muted small">' + esc(OS.ROLE[c.role] || '') + (c.archetype ? ' · ' + esc(c.archetype) : '') + '</span></div></div>' +
        '<div class="pj-cols"><div>' +
        '<div class="ui-card ce-sec"><h3>' + UI.icon('user') + 'Who they are</h3><div class="os-fields">' +
        F({ key: 'role', label: 'Role in the story', type: 'select', options: OS.ROLES.map(function (r) { return [r[0], r[1] + ' · ' + r[2]]; }) }) +
        F({ key: 'archetype', label: 'Archetype', deck: true }) + F({ key: 'age', label: 'Age', max: 20 }) + F({ key: 'occupation', label: 'Occupation or world', deck: true }) +
        F({ key: 'arc', label: 'Arc', type: 'select', options: [['positive', 'Positive: unlearns the lie'], ['negative', 'Negative: corrupted, or doubles down'], ['flat', 'Flat: already knows; changes others']] }) +
        F({ key: 'look', label: 'Look', placeholder: 'One detail we\'d notice first' }) + '</div></div>' +
        '<div class="ui-card ce-sec"><h3>' + UI.icon('heart') + 'What drives them</h3><p class="ce-chain">Wound → lie → flaw → want, against the need. Pick a wound and the lie that usually grows from it fills itself in.</p><div class="os-fields">' +
        F({ key: 'want', label: 'Want', help: 'outer goal, drives the plot', deck: true }) + F({ key: 'need', label: 'Need', help: 'inner truth, drives the arc', deck: true }) +
        F({ key: 'wound', label: 'Wound (the ghost)', deck: true }) + F({ key: 'lie', label: 'The lie they believe', deck: true }) +
        F({ key: 'flaw', label: 'Flaw', deck: true }) + F({ key: 'fear', label: 'Greatest fear', deck: true }) +
        F({ key: 'value', label: 'What they value most', deck: true }) + F({ key: 'secret', label: 'Secret', deck: true }) + '</div></div>' +
        '<div class="ui-card ce-sec"><h3>' + UI.icon('mask') + 'Personality</h3><div class="ce-persona"><div>' + OS.TRAITS.map(function (tr) {
          var v = c.traits[tr[0]] == null ? 50 : c.traits[tr[0]];
          return '<div class="ce-slider"><div class="l"><b>' + esc(tr[1]) + '</b><span data-tv="' + tr[0] + '">' + v + '</span></div><input type="range" min="0" max="100" value="' + v + '" data-trait="' + tr[0] + '" aria-label="' + esc(tr[1]) + '">' +
            '<div class="ends"><span>' + esc(tr[2]) + '</span><span>' + esc(tr[3]) + '</span></div></div>';
        }).join('') + '</div><div><div data-radar>' + OS.svg.radar(c.traits) + '</div></div></div><p class="ce-read" data-read>' + esc(read(c)) + '</p></div>' +
        '<div class="ui-card ce-sec"><h3>' + UI.icon('flash') + 'How would they react?</h3><p class="muted small" style="margin-top:-4px">Pick a situation. The engine weighs their personality, flaw, fear, values and wound, and shows the most likely reactions with the reasons.</p>' +
        '<div class="ce-events">' + OS.REACT.map(function (ev) { return '<button type="button" data-ev="' + ev[0] + '" class="' + (ev[0] === eventKey ? 'on' : '') + '">' + UI.icon(ev[2]) + esc(ev[1]) + '</button>'; }).join('') + '</div>' +
        '<div data-react></div></div>' +
        '<div class="ui-card ce-sec"><h3>' + UI.icon('sparkle') + 'Texture</h3><div class="os-fields">' +
        F({ key: 'quirk', label: 'Quirk', deck: true }) + F({ key: 'voice', label: 'Voice (how they talk)', deck: true }) +
        F({ key: 'condition', label: 'Condition or illness', deck: true, help: 'optional; portray with care' }) + F({ key: 'skills', label: 'Skills', placeholder: 'What are they great at?' }) + '</div>' +
        '<p class="os-help" data-voice-sample></p></div>' +
        '<div class="ui-card ce-sec"><div class="pj-sec-title"><h3 style="margin:0">' + UI.icon('book') + 'Backstory</h3><button type="button" class="ui-btn sm" data-draft>' + UI.icon('wand') + 'Draft from the fields above</button></div>' +
        '<textarea data-f="backstory" rows="6" maxlength="6000" placeholder="Where they come from, what happened, what they never talk about.">' + esc(c.backstory) + '</textarea>' +
        '<label class="os-f" style="margin-top:12px"><span class="lab"><b>Notes</b></span><textarea data-f="notes" rows="2" maxlength="3000">' + esc(c.notes) + '</textarea></label></div>' +
        '</div><aside>' +
        '<div class="ui-card"><div class="pj-sec-title"><h3>Relationships</h3><button class="ui-btn sm" data-addrel>' + UI.icon('plus') + 'Add</button></div><div class="ce-rels">' + (rels.length ? rels.map(function (r) {
          var other = OS.find(doc.characters, r.a === c.id ? r.b : r.a) || {}, t = OS.RELTYPE[r.type] || { name: r.type, color: '#888' }, mine = r.a === c.id ? r.a_to_b : r.b_to_a;
          return '<button type="button" class="ce-rel" data-rel="' + esc(r.id) + '"><span class="sw" style="background:' + t.color + '"></span>' + OS.ui.avatar(other, 'sm') +
            '<span class="grow"><b>' + esc(other.name || '?') + '</b>' + esc(t.name) + (mine ? ' · ' + esc(mine) : '') + '</span><span class="small muted">' + (r.tension || 0) + '/10</span></button>';
        }).join('') : '<p class="muted small">Not connected to anyone yet.</p>') + '</div><a href="#" data-go-tab="web" class="small" style="display:inline-block;margin-top:10px">Open the web ' + UI.icon('arrow') + '</a></div>' +
        '<div class="ui-card"><h3>On screen</h3><p class="muted small">' + (scenes.length ? 'In ' + UI.plural(scenes.length, 'scene') + ' of ' + doc.scenes.length + '.' : 'Not in any scene card yet.') + '</p>' +
        '<div class="ce-chips">' + scenes.map(function (x) { return '<a href="#" data-scene="' + esc(x[0].id) + '" title="' + esc(x[0].heading || x[0].summary) + '">' + (x[1] + 1) + '</a>'; }).join('') + '</div>' +
        (doc.scenes.length ? '<div class="os-meter" style="margin-top:10px"><i style="width:' + Math.round(scenes.length / doc.scenes.length * 100) + '%"></i></div>' : '') +
        '<h3 style="margin-top:18px">In the chronology</h3><div class="ce-chips">' + (events.length ? events.map(function (x) { return '<a href="#" data-go-tab="chronology" title="' + esc(x[0].title) + '">E' + (x[1] + 1) + '</a>'; }).join('') : '<span class="muted small">No events.</span>') + '</div></div>' +
        '<div class="ui-card"><button class="ui-btn block danger" data-delchar>' + UI.icon('trash') + 'Remove ' + esc(OS.first(c.name || 'this character')) + '</button></div></aside></div>';
      drawReact(c); voiceSample(c);
    }
    function drawReact(c) {
      var box = el.querySelector('[data-react]'); if (!box) return;
      var ev = OS.REACT_BY[eventKey], res = OS.react(c, eventKey), n = OS.first(c.name || 'They');
      box.innerHTML = '<div class="ce-react">' + res.map(function (r) {
        return '<div class="r"><span class="pct">' + r.pct + '%</span><div><div class="t">' + esc(n) + ' ' + esc(OS.lower1(r.text)) + '</div><div class="why">' +
          (r.why.length ? 'Because of ' + esc(r.why.join(', ')) + '.' : 'A fallback: nothing in their profile pulls hard either way. Fill in more of the character.') + '</div></div></div>';
      }).join('') + '</div><p class="os-help" style="margin-top:10px">' + UI.icon('camera') + ' Scene tip: ' + esc(ev.tip) + '</p>';
    }
    function voiceSample(c) {
      var v = OS.L.voices.filter(function (x) { return x.t === c.voice; })[0], box = el.querySelector('[data-voice-sample]');
      if (box) box.innerHTML = v && v.x ? 'Sounds like: <i class="os-script">“' + esc(v.x) + '”</i>' : '';
    }

    function current() { return T.sub ? OS.find(doc.characters, T.sub) : null; }
    function draw() { var c = current(); if (c) detail(c); else list(); }
    var redrawTimer = null;
    function setField(c, key, value, redraw) {
      c[key] = value; T.touch();
      if (key === 'wound') {
        var w = OS.L.wounds.filter(function (x) { return x.t === value; })[0];
        if (w && w.x && !c.lie) { c.lie = w.x; var li = el.querySelector('[data-f="lie"]'); if (li) { li.value = w.x; li.classList.add('os-flash-in'); } UI.toast('Filled in the lie that usually grows from this wound.'); }
      }
      if (key === 'voice') voiceSample(c);
      if (['flaw', 'fear', 'value', 'wound', 'arc'].indexOf(key) >= 0) drawReact(c);
      if (redraw) { clearTimeout(redrawTimer); redrawTimer = setTimeout(draw, 10); }
    }
    el.addEventListener('input', function (e) {
      var c = current(), t = e.target;
      if (!c) return;
      if (t.matches('[data-f]')) setField(c, t.getAttribute('data-f'), t.value, false);
      if (t.matches('[data-trait]')) {
        var k = t.getAttribute('data-trait'); c.traits[k] = +t.value; T.touch();
        el.querySelector('[data-tv="' + k + '"]').textContent = t.value; el.querySelector('[data-radar]').innerHTML = OS.svg.radar(c.traits);
        el.querySelector('[data-read]').textContent = read(c); drawReact(c);
      }
    });
    el.addEventListener('change', function (e) {
      var c = current();
      if (c && e.target.matches('select[data-f]')) { setField(c, e.target.getAttribute('data-f'), e.target.value, e.target.getAttribute('data-f') === 'role'); }
      if (c && e.target.matches('input[data-f="name"]')) draw();
    });
    OS.ui.wireSuggest(el, function (key, it) {
      var c = current(); if (!c) return;
      var inp = el.querySelector('[data-f="' + key + '"]'); if (inp) inp.value = it.t;
      setField(c, key, it.t, key === 'name' || key === 'archetype');
    });
    el.addEventListener('click', function (e) {
      var t, c = current();
      if ((t = e.target.closest('[data-open]'))) { T.go('cast', t.getAttribute('data-open')); return; }
      if (e.target.closest('[data-back]')) { e.preventDefault(); T.go('cast'); return; }
      if (e.target.closest('[data-add]')) { var n = OS.blankCharacter(doc.characters.length ? 'supporting' : 'protagonist'); doc.characters.push(n); T.touch(); T.go('cast', n.id); return; }
      if (e.target.closest('[data-roll]')) { var r = OS.rollCharacter(doc.characters.length ? 'supporting' : 'protagonist'); doc.characters.push(r); T.touch(); UI.toast('Meet ' + r.name + '. Keep what works, swap the rest.', 'ok'); T.go('cast', r.id); return; }
      if ((t = e.target.closest('[data-fill]'))) { var role = t.getAttribute('data-fill'), f = OS.rollCharacter(role); f.archetype = { antagonist: 'The Shadow', mentor: 'The Mentor', ally: 'The Ally', protagonist: 'The Everyman' }[role] || f.archetype; doc.characters.push(f); T.touch(); T.go('cast', f.id); return; }
      if ((t = e.target.closest('[data-ev]'))) { eventKey = t.getAttribute('data-ev'); el.querySelectorAll('[data-ev]').forEach(function (b) { b.classList.toggle('on', b === t); }); drawReact(c); return; }
      if (c && e.target.closest('[data-draft]')) {
        var go = function () { c.backstory = OS.backstoryDraft(c); el.querySelector('[data-f="backstory"]').value = c.backstory; T.touch(); };
        if (c.backstory && c.backstory.trim()) UI.confirm({ title: 'Replace the backstory?', text: 'The draft is built from the fields above. Your current text is replaced.', ok: 'Replace' }).then(function (y) { if (y) go(); });
        else go();
        return;
      }
      if (c && e.target.closest('[data-addrel]')) { var other = doc.characters.filter(function (x) { return x.id !== c.id; })[0]; if (!other) { UI.toast('Add another character first.'); return; }
        OS.ui.editRelation(T, { id: OS.uid('r'), a: c.id, b: other.id, type: 'friends', a_to_b: '', b_to_a: '', tension: 5 }, draw); return; }
      if ((t = e.target.closest('[data-rel]'))) { OS.ui.editRelation(T, OS.find(doc.relations, t.getAttribute('data-rel')), draw); return; }
      if ((t = e.target.closest('[data-scene]'))) { e.preventDefault(); OS.ui.editScene(T, OS.find(doc.scenes, t.getAttribute('data-scene')), draw); return; }
      if (c && e.target.closest('[data-delchar]')) {
        UI.confirm({ title: 'Remove ' + (c.name || 'this character') + '?', text: 'They leave every scene, event and relationship.', ok: 'Remove', danger: true }).then(function (yes) {
          if (!yes) return;
          doc.characters.splice(doc.characters.indexOf(c), 1);
          doc.relations = doc.relations.filter(function (r) { return r.a !== c.id && r.b !== c.id; }); T.doc.relations = doc.relations;
          doc.scenes.forEach(function (s) { s.chars = s.chars.filter(function (id) { return id !== c.id; }); });
          doc.events.forEach(function (ev) { ev.chars = ev.chars.filter(function (id) { return id !== c.id; }); });
          T.touch(); T.go('cast');
        });
      }
    });
    draw();
    return { destroy: function () { clearTimeout(redrawTimer); } };
  };
})();

(function () {
  var esc = UI.esc;
  OS.tabs.chronology = function (el, T) {
    var doc = T.doc, mode = UI.store.get('chronoMode', 'line');
    function shownIn(ev) { var out = []; doc.scenes.forEach(function (s, i) { if (s.events.indexOf(ev.id) >= 0) out.push([s, i]); }); return out; }
    function line() {
      return '<div class="ch-line">' + doc.events.map(function (ev, i) {
        var shown = shownIn(ev), kind = OS.ui.KINDS.filter(function (k) { return k[0] === ev.kind; })[0];
        return '<div class="ui-card ch-ev ' + esc(ev.kind || 'story') + '" data-ev="' + esc(ev.id) + '"><div><span class="no">E' + (i + 1) + '</span> <span class="when">' + esc(ev.when || 'Undated') + '</span>' +
          '<h3>' + esc(ev.title || 'Untitled event') + '</h3>' + (ev.detail ? '<p>' + esc(ev.detail) + '</p>' : '') +
          '<div class="meta">' + OS.ui.avatars(doc, ev.chars, 6) + '<span class="ui-badge' + (ev.kind === 'backstory' ? '' : ev.kind === 'offscreen' ? ' tung' : ' brand') + '">' + esc(kind ? kind[1].split(' (')[0] : 'On screen') + '</span>' +
          '<span class="shown">' + (shown.length ? shown.map(function (x) { return '<a href="#" data-scene="' + esc(x[0].id) + '">Scene ' + (x[1] + 1) + '</a>'; }).join(' ') : (ev.kind === 'backstory' ? '' : '<span class="small faint">Not in any scene</span>')) + '</span></div></div>' +
          '<div class="moves"><button class="ui-btn" data-up aria-label="Earlier"' + (i ? '' : ' disabled') + '>' + UI.icon('up') + '</button><button class="ui-btn" data-down aria-label="Later"' + (i < doc.events.length - 1 ? '' : ' disabled') + '>' + UI.icon('down') + '</button>' +
          '<button class="ui-btn" data-edit aria-label="Edit">' + UI.icon('edit') + '</button></div></div>';
      }).join('') + '</div>';
    }
    function lanes() {
      var chars = doc.characters;
      return '<div class="ch-lanes"><table><thead><tr><th>Event</th>' + chars.map(function (c) { return '<th>' + OS.ui.avatar(c, 'sm') + '<br>' + esc(OS.first(c.name || '?')) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        doc.events.map(function (ev, i) {
          return '<tr data-ev="' + esc(ev.id) + '"><td><span class="w">E' + (i + 1) + ' · ' + esc(ev.when || '') + '</span>' + esc(ev.title || '') + '</td>' + chars.map(function (c) {
            return '<td>' + (ev.chars.indexOf(c.id) >= 0 ? '<span class="dot" style="background:' + OS.roleColor(c.role) + '" title="' + esc(c.name) + '"></span>' : '') + '</td>';
          }).join('') + '</tr>';
        }).join('') + '</tbody></table></div><p class="os-help">Read a column top to bottom: that character\'s life, in order. Long gaps are places they could be doing something off screen.</p>';
    }
    function draw() {
      var hidden = doc.events.filter(function (e) { return e.kind !== 'backstory' && !shownIn(e).length; }).length;
      el.innerHTML = '<div class="pj-sec-title"><div><h2>Chronology</h2><p class="muted small" style="margin:4px 0 0">What happened, in the order it happened. The Storyline is the order you tell it.</p></div>' +
        '<div class="ui-seg"><button data-mode="line" class="' + (mode === 'line' ? 'on' : '') + '">Timeline</button><button data-mode="lanes" class="' + (mode === 'lanes' ? 'on' : '') + '">Lanes</button></div></div>' +
        '<div class="ch-tools"><button class="ui-btn primary" data-add>' + UI.icon('plus') + 'Add an event</button><button class="ui-btn" data-rebuild>' + UI.icon('wand') + 'Rebuild from scene cards</button>' +
        '<button class="ui-btn" data-backstory>' + UI.icon('heart') + 'Add backstory from the cast</button>' +
        (hidden ? '<span class="ui-badge tung">' + UI.plural(hidden, 'event') + ' never on screen</span>' : '') + '</div>' +
        (doc.events.length ? (mode === 'lanes' ? lanes() : line()) : '<div class="ui-empty">' + UI.icon('timeline') + '<h3>No events yet</h3><p>List what happens in your story world, from the oldest backstory to the last day. Or let your scene cards build it.</p></div>');
    }
    function move(ev, d) {
      var i = doc.events.indexOf(ev), j = i + d;
      if (j < 0 || j >= doc.events.length) return;
      doc.events.splice(i, 1); doc.events.splice(j, 0, ev); T.touch(); draw();
    }
    el.addEventListener('click', function (e) {
      var t, card = e.target.closest('[data-ev]'), ev = card ? OS.find(doc.events, card.getAttribute('data-ev')) : null;
      if ((t = e.target.closest('[data-mode]'))) { mode = t.getAttribute('data-mode'); UI.store.set('chronoMode', mode); draw(); return; }
      if (e.target.closest('[data-add]')) { OS.ui.editEvent(T, { id: OS.uid('e'), when: '', title: '', detail: '', chars: [], kind: 'story' }, draw); return; }
      if ((t = e.target.closest('[data-scene]'))) { e.preventDefault(); OS.ui.editScene(T, OS.find(doc.scenes, t.getAttribute('data-scene')), draw); return; }
      if (ev && e.target.closest('[data-up]')) return move(ev, -1);
      if (ev && e.target.closest('[data-down]')) return move(ev, 1);
      if (ev && (e.target.closest('[data-edit]') || mode === 'lanes' || e.target.closest('h3'))) { OS.ui.editEvent(T, ev, draw); return; }
      if (e.target.closest('[data-rebuild]')) {
        var n = 0;
        doc.scenes.forEach(function (s, i) {
          if (s.events.length) return;
          var ev2 = { id: OS.uid('e'), when: 'Scene ' + (i + 1), title: (s.summary || s.heading || 'Scene ' + (i + 1)).split(/[.!?]/)[0].slice(0, 90), detail: s.summary || '', chars: s.chars.slice(), kind: 'story' };
          doc.events.push(ev2); s.events.push(ev2.id); n++;
        });
        T.touch(); draw();
        UI.toast(n ? 'Added ' + UI.plural(n, 'event') + ' from cards that had none. Now move them into the order they really happened.' : 'Every scene card already shows an event.', n ? 'ok' : null);
        return;
      }
      if (e.target.closest('[data-backstory]')) {
        var added = 0;
        doc.characters.forEach(function (c) {
          if (!c.wound) return;
          var has = doc.events.some(function (x) { return x.kind === 'backstory' && x.chars.indexOf(c.id) >= 0 && x.detail && x.detail.indexOf(c.wound) >= 0; });
          if (has) return;
          doc.events.unshift({ id: OS.uid('e'), when: 'Years before', title: OS.first(c.name || 'Someone') + '\'s wound', detail: c.wound + (c.lie ? '. Since then: "' + c.lie.replace(/\.$/, '') + '."' : ''), chars: [c.id], kind: 'backstory' });
          added++;
        });
        T.touch(); draw();
        UI.toast(added ? 'Added ' + UI.plural(added, 'backstory event') + ' at the start.' : 'Give characters a wound in the Cast tab first (or they\'re all here already).', added ? 'ok' : null);
      }
    });
    draw();
  };
})();

(function () {
  var esc = UI.esc;
  OS.tabs.overview = function (el, T) {
    var P = T.P, doc = T.doc;
    doc.logline_parts = doc.logline_parts || {};
    var LP = [['when', 'When', 'her father is shot on her sister\'s wedding night'], ['who', 'a / an', 'marine biologist who swore off the family business'],
      ['must', 'must', 'hold the harbour together'], ['or', 'or else', 'the family loses everything'], ['but', 'but', 'winning means becoming what she ran from']];
    function built() {
      var p = doc.logline_parts;
      if (!p.who && !p.must) return '';
      var who = (p.who || 'hero').trim();
      return OS.cap((p.when ? 'When ' + p.when.trim() + ', ' : '') + OS.article(who) + ' ' + who + ' must ' + (p.must || '…').trim() + (p.or ? ' or ' + p.or.trim() : '') + (p.but ? ', but ' + p.but.trim() : '')) + '.';
    }
    function checklist() {
      var p = doc.logline_parts, words = OS.words(P.logline);
      var items = [['Protagonist', !!(p.who || (P.logline || '').length > 20)], ['Goal', !!(p.must || / must | wants? | tries | needs? /i.test(P.logline || ''))],
        ['Obstacle', !!(p.but || / but | until | despite | even though /i.test(P.logline || ''))], ['Stakes', !!(p.or || / or | before /i.test(P.logline || ''))], ['Under 50 words', words > 0 && words <= 50]];
      return items.map(function (i) { return '<span class="ui-badge ' + (i[1] ? 'good' : '') + '">' + (i[1] ? UI.icon('check') : '') + esc(i[0]) + '</span>'; }).join('');
    }
    function doctorHtml() {
      var d = OS.doctor(P), notes = d.checks.filter(function (c) { return c.lvl !== 'good'; }), good = d.checks.filter(function (c) { return c.lvl === 'good'; });
      function li(c) {
        return '<li class="' + c.lvl + '"><span class="dot"></span><span><span class="area">' + esc(c.area) + '</span>' + esc(c.text) +
          (c.go && c.lvl !== 'good' ? ' <a href="#" data-go-tab="' + esc(c.go) + '">Fix ' + UI.icon('arrow') + '</a>' : '') + '</span></li>';
      }
      return '<div class="ui-card ov-doc"><div class="head"><span class="os-ring" style="--v:' + d.score + '"><b>' + d.score + '</b></span><div><h3>Script doctor</h3><p class="muted small" style="margin:0">' +
        (notes.length ? UI.plural(notes.length, 'note') + ', most important first.' : 'No notes. Go write.') + '</p></div></div>' +
        '<ul>' + notes.map(li).join('') + '</ul>' + (good.length ? '<details style="margin-top:12px"><summary class="small muted" style="cursor:pointer">' + UI.plural(good.length, 'thing') + ' already working</summary><ul style="margin-top:8px">' + good.map(li).join('') + '</ul></details>' : '') + '</div>';
    }
    function statsHtml() {
      var s = OS.stats(P), f = OS.FORMATS[P.format] || OS.FORMATS.feature;
      return '<div class="ui-card"><h3>By the numbers</h3><div class="ov-stats">' +
        [[s.characters, 'characters'], [s.relations, 'relationships'], [s.events, 'events'], [s.scenes, 'scenes'], [s.pages, 'pages'], [s.pages ? '~' + Math.round(s.pages) + ' min' : '0 min', 'runtime']].map(function (x) {
          return '<div><b>' + x[0] + '</b><span>' + x[1] + '</span></div>';
        }).join('') + '</div><p class="os-help" style="margin-top:12px">' + esc(f.name) + ': usually ' + f.pages[0] + ' to ' + f.pages[1] + ' pages. ' + esc(f.about) + '</p>' +
        '<div class="os-meter" style="margin-top:8px"><i style="width:' + Math.min(100, Math.round(s.pages / f.target * 100)) + '%"></i></div></div>';
    }
    function structureViz() {
      var counts = {};
      doc.scenes.forEach(function (s) { counts[s.beat] = (counts[s.beat] || 0) + 1; });
      if (P.structure === 'circle') return '<div class="ov-viz">' + OS.svg.wheel({ counts: counts }) + '</div>';
      return '<div class="ov-viz bar os-svg-wrap">' + OS.svg.bar(P.structure, counts) + '</div>';
    }
    function draw() {
      var genreKey = (OS.GENRES.filter(function (g) { return g[1] === P.genre; })[0] || [])[0], g = OS.GENRE[genreKey];
      el.innerHTML = '<div class="pj-cols"><div>' +
        '<div class="ui-card ov-card"><div class="pj-sec-title"><h2>The story in one sentence</h2><span class="muted small" data-wc>' + OS.words(P.logline) + ' words</span></div>' +
        '<textarea data-logline rows="3" maxlength="600" placeholder="When [something happens], a [flawed hero] must [goal] or [stakes], but [obstacle].">' + esc(P.logline) + '</textarea>' +
        '<div class="ov-checks" data-checks>' + checklist() + '</div>' +
        '<details' + (P.logline ? '' : ' open') + ' style="margin-top:14px"><summary style="cursor:pointer;font-weight:600">' + UI.icon('wand') + ' Logline builder</summary>' +
        '<div class="ov-builder">' + LP.map(function (x) { return '<span>' + x[1] + '</span><input type="text" data-lp="' + x[0] + '" value="' + esc(doc.logline_parts[x[0]] || '') + '" placeholder="' + esc(x[2]) + '" maxlength="200">'; }).join('') + '</div>' +
        '<p class="ov-preview" data-preview>' + esc(built() || 'Fill in the blanks and the sentence writes itself.') + '</p><button type="button" class="ui-btn sm primary" data-use>' + UI.icon('check') + 'Use this logline</button></details></div>' +
        '<div class="ui-card ov-card"><h2>Theme and premise</h2><div class="os-fields" data-meta>' +
        OS.ui.field({ key: 'theme', label: 'Theme, as a question', value: doc.theme, deck: true, help: 'every scene argues a side', wide: true, placeholder: 'Can you love your family and still stay good?' }) +
        OS.ui.field({ key: 'theme_answer', label: 'What the ending answers', value: doc.theme_answer, deck: true, wide: true, help: 'the truth the hero learns (or refuses)' }) +
        OS.ui.field({ key: 'premise', label: 'Premise / abstract', type: 'textarea', value: doc.premise, wide: true, rows: 4, help: 'the short story of your story' }) +
        OS.ui.field({ key: 'tone', label: 'Tone', value: doc.tone, placeholder: 'Cold, quiet, operatic underneath' }) +
        OS.ui.field({ key: 'world', label: 'World', value: doc.world, deck: true, placeholder: 'Where and when' }) + '</div></div>' +
        '<div class="ui-card ov-card"><h2>Format and genre</h2><div class="os-fields">' +
        '<label class="os-f"><span class="lab"><b>Format</b></span><select data-format>' + Object.keys(OS.FORMATS).map(function (k) { return '<option value="' + k + '"' + (P.format === k ? ' selected' : '') + '>' + esc(OS.FORMATS[k].name) + '</option>'; }).join('') + '</select></label>' +
        '<label class="os-f"><span class="lab"><b>Genre</b></span><select data-genre><option value="">Not decided</option>' + OS.GENRES.map(function (x) { return '<option' + (P.genre === x[1] ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join('') + '</select></label>' +
        (g ? '<p class="os-help wide" style="grid-column:1/-1;margin:0"><b>' + esc(g.name) + ':</b> ' + esc(g.about) + ' ' + esc(g.conventions) + '</p>' : '') +
        '<div class="os-f wide"><span class="lab"><b>Poster colour</b><small>for your desk</small></span><div class="ov-swatches">' + Object.keys(OS.COLORS).map(function (k) {
          return '<button type="button" data-color="' + k + '" class="' + (P.color === k ? 'on' : '') + '" style="' + OS.posterStyle(k) + '" aria-label="' + k + '"></button>'; }).join('') + '</div></div></div></div>' +
        '<div class="ui-card ov-card"><div class="pj-sec-title"><h2>Structure</h2><a href="#learn/structures" data-go="learn/structures" class="small">How they compare ' + UI.icon('arrow') + '</a></div>' +
        '<div class="ov-structs">' + OS.STRUCTURE_ORDER.map(function (k) { var s = OS.STRUCTURES[k]; return '<button type="button" data-structure="' + k + '" class="' + (P.structure === k ? 'on' : '') + '"><b>' + esc(s.name) + '</b><small>' + s.beats.length + ' beats · ' + esc(s.by) + '</small></button>'; }).join('') + '</div>' +
        '<p class="muted small">' + esc(OS.STRUCTURES[P.structure].short) + ' Click a beat to open it in the Storyline.</p>' + structureViz() + '</div></div>' +
        '<aside><div data-doctor>' + doctorHtml() + '</div><div data-stats>' + statsHtml() + '</div>' +
        '<div class="ui-card"><h3>This project</h3><div class="ui-stack">' + (T.readonly ? '<button class="ui-btn primary block" data-copy-sample>' + UI.icon('copy') + 'Make my own copy</button>'
          : '<button class="ui-btn block" data-dup>' + UI.icon('copy') + 'Duplicate</button><button class="ui-btn block danger" data-del>' + UI.icon('trash') + 'Delete this screenplay</button>') + '</div></div></aside></div>';
    }
    function side() {
      var d = el.querySelector('[data-doctor]'), s = el.querySelector('[data-stats]');
      if (d) d.innerHTML = doctorHtml();
      if (s) s.innerHTML = statsHtml();
      var c = el.querySelector('[data-checks]'); if (c) c.innerHTML = checklist();
      var w = el.querySelector('[data-wc]'); if (w) w.textContent = OS.words(P.logline) + ' words';
    }
    var sideTimer = null;
    function changed() { T.touch(); clearTimeout(sideTimer); sideTimer = setTimeout(side, 350); }
    el.addEventListener('input', function (e) {
      var t = e.target;
      if (t.matches('[data-logline]')) { P.logline = t.value; changed(); }
      else if (t.matches('[data-lp]')) { doc.logline_parts[t.getAttribute('data-lp')] = t.value; el.querySelector('[data-preview]').textContent = built() || '…'; changed(); }
      else if (t.matches('[data-f]')) { doc[t.getAttribute('data-f')] = t.value; changed(); }
    });
    el.addEventListener('change', function (e) {
      var t = e.target;
      if (t.matches('[data-format]')) { P.format = t.value; T.touch(); side(); }
      if (t.matches('[data-genre]')) { P.genre = t.value; T.touch(); draw(); }
    });
    OS.ui.wireSuggest(el, function (key, it) {
      doc[key] = it.t; var inp = el.querySelector('[data-f="' + key + '"]'); if (inp) inp.value = it.t; changed();
    });
    el.addEventListener('click', function (e) {
      var t;
      if (e.target.closest('[data-use]')) { var b = built(); if (b) { P.logline = b; el.querySelector('[data-logline]').value = b; changed(); UI.toast('Logline updated', 'ok'); } return; }
      if ((t = e.target.closest('[data-structure]'))) {
        var k = t.getAttribute('data-structure');
        if (k !== P.structure) { T.setStructure(k); UI.toast('Switched to ' + OS.STRUCTURES[k].name + '. Each scene moved to the nearest beat.', 'ok'); draw(); }
        return;
      }
      if ((t = e.target.closest('[data-color]'))) { P.color = t.getAttribute('data-color'); T.touch(); draw(); var dot = document.querySelector('.pj-dot'); if (dot) dot.setAttribute('style', OS.posterStyle(P.color)); return; }
      if ((t = e.target.closest('.os-wheel [data-beat], svg [data-beat]'))) { T.go('storyline', t.getAttribute('data-beat')); return; }
      if ((t = e.target.closest('[data-dup]'))) { UI.busy(t, T.flush().then(function () { return UI.api('duplicate_project', P.id); })).then(function (r) { OS.cache = {}; UI.toast('Duplicated', 'ok'); UI.go('project', r.project.id); }); return; }
      if (e.target.closest('[data-del]')) {
        UI.confirm({ title: 'Delete "' + P.title + '"?', text: 'The whole project goes: cast, timelines, cards and pages. This can\'t be undone.', ok: 'Delete forever', danger: true }).then(function (yes) {
          if (yes) UI.api('delete_project', P.id).then(function () { OS.cache = {}; P.readonly = true; UI.toast('Deleted'); UI.go('home'); });
        });
      }
    });
    draw();
    return { destroy: function () { clearTimeout(sideTimer); } };
  };
})();

(function () {
  var esc = UI.esc, SC = OS.script;
  var PH = { scene: 'INT. LOCATION - DAY', action: 'What we see…', character: 'CHARACTER', paren: '(how it\'s said)', dialogue: 'What they say…', transition: 'CUT TO:', shot: 'CLOSE ON…', note: 'A note to yourself (not printed)' };
  var PLAIN = (function () { var d = document.createElement('div'); try { d.contentEditable = 'plaintext-only'; return d.contentEditable === 'plaintext-only'; } catch (e) { return false; } })();
  var PREV_TAB = {}; Object.keys(SC.TAB).forEach(function (k) { if (!PREV_TAB[SC.TAB[k]]) PREV_TAB[SC.TAB[k]] = k; });
  function caret(el) {
    var sel = window.getSelection();
    if (!sel.rangeCount || !el.contains(sel.anchorNode)) return { start: 0, end: 0 };
    var r = sel.getRangeAt(0), pre = r.cloneRange();
    pre.selectNodeContents(el); pre.setEnd(r.startContainer, r.startOffset);
    var start = pre.toString().length;
    return { start: start, end: start + r.toString().length };
  }
  function setCaret(el, off) {
    el.focus();
    var sel = window.getSelection(), r = document.createRange(), node = el.firstChild;
    if (!node) { r.setStart(el, 0); }
    else {
      var walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), n, left = off, done = false;
      while ((n = walk.nextNode())) { if (left <= n.length) { r.setStart(n, left); done = true; break; } left -= n.length; }
      if (!done) { r.selectNodeContents(el); r.collapse(false); }
    }
    r.collapse(true); sel.removeAllRanges(); sel.addRange(r);
  }
  function textOf(el) { return (el.innerText || el.textContent || '').replace(/\r?\n/g, ' ').replace(/ /g, ' '); }

  OS.tabs.pages = function (el, T) {
    var doc = T.doc, cur = -1, statTimer = null;
    function blocks() { return doc.script; }
    function blockHtml(b, i) {
      return '<div class="pg-b ' + esc(b.t) + '" contenteditable="' + (PLAIN ? 'plaintext-only' : 'true') + '" spellcheck="true" data-i="' + i + '" data-ph="' + esc(PH[b.t] || '') + '" data-label="' + esc(SC.NAME[b.t] || '') + '">' + esc(b.x || '') + '</div>';
    }
    function statsHtml() {
      var p = SC.pages(blocks()), w = SC.words(blocks()), scenes = blocks().filter(function (b) { return b.t === 'scene'; }).length, f = OS.FORMATS[T.P.format] || OS.FORMATS.feature;
      return '<span><b>' + p + '</b>pages</span><span><b>~' + Math.max(0, Math.round(p)) + '</b>min</span><span><b>' + scenes + '</b>scenes</span><span><b>' + w + '</b>words</span><span>target ' + f.pages[0] + '–' + f.pages[1] + ' pp</span>';
    }
    function sideHtml() {
      var have = {}; blocks().forEach(function (b) { if (b.s) have[b.s] = 1; });
      var missing = doc.scenes.filter(function (s) { return !have[s.id]; }).length, n = 0;
      return '<h4>Scenes in the pages</h4>' + blocks().map(function (b, i) { return b.t === 'scene' ? '<a href="#" data-jump="' + i + '"><span>' + (++n) + '</span>' + esc(b.x || 'Untitled') + '</a>' : ''; }).join('') +
        (missing ? '<p class="os-help" style="margin-top:12px">' + UI.plural(missing, 'scene card') + ' not in the pages yet.</p><button class="ui-btn sm" data-draft-missing>' + UI.icon('wand') + 'Add them</button>' : '');
    }
    function underHtml() {
      var lines = SC.characterLines(blocks()), names = Object.keys(lines).sort(function (a, b) { return lines[b].words - lines[a].words; }).slice(0, 8);
      return '<div class="ui-card"><h3>Who talks</h3>' + (names.length ? '<table>' + names.map(function (n) { return '<tr><td>' + esc(n) + '</td><td>' + UI.plural(lines[n].lines, 'line') + ' · ' + lines[n].words + ' words</td></tr>'; }).join('') + '</table>'
        : '<p class="muted small">No dialogue yet.</p>') + '</div><div class="ui-card"><h3>Keys</h3><table><tr><td>Next element</td><td>Enter</td></tr><tr><td>Change element</td><td>Tab, or Enter on an empty line</td></tr>' +
        '<tr><td>Scene heading</td><td>type INT. or EXT.</td></tr><tr><td>Element by number</td><td>Ctrl + 1 to 8</td></tr><tr><td>Notes (not printed)</td><td>Ctrl + 8</td></tr></table></div>';
    }
    function suggHtml() {
      var b = blocks()[cur];
      if (!b) return '<span>Click a line to start. Tab changes what kind of line it is.</span>';
      var chips = [];
      if (b.t === 'character') {
        var set = {};
        doc.characters.forEach(function (c) { if (c.name) set[OS.first(c.name).toUpperCase()] = 1; });
        Object.keys(SC.characterLines(blocks())).forEach(function (n) { set[n] = 1; });
        chips = Object.keys(set).slice(0, 12);
        chips = chips.concat(chips.length ? [chips[0] + ' (V.O.)', chips[0] + ' (O.S.)', chips[0] + ' (CONT\'D)'] : []);
      } else if (b.t === 'scene') {
        var heads = {}; doc.scenes.forEach(function (s) { if (s.heading) heads[s.heading.toUpperCase()] = 1; });
        blocks().forEach(function (x) { if (x.t === 'scene' && x.x) heads[x.x.toUpperCase()] = 1; });
        chips = ['INT. ', 'EXT. ', 'INT./EXT. '].concat(Object.keys(heads).slice(0, 10));
      } else if (b.t === 'transition') chips = ['CUT TO:', 'SMASH CUT TO:', 'MATCH CUT TO:', 'DISSOLVE TO:', 'FADE OUT.', 'FADE IN:'];
      else if (b.t === 'paren') chips = ['(beat)', '(quietly)', '(into phone)', '(re: the letter)', '(not looking up)', '(continuing)'];
      else if (b.t === 'shot') chips = ['CLOSE ON ', 'ANGLE ON ', 'INSERT - ', 'POV - ', 'WIDE - ', 'BACK TO SCENE'];
      else return '<span>' + esc(SC.NAME[b.t]) + ' · Enter: next element · Tab: change element</span>';
      return '<span>' + esc(SC.NAME[b.t]) + ':</span>' + chips.map(function (c) { return '<button type="button" data-sugg="' + esc(c) + '">' + esc(c.trim()) + '</button>'; }).join('');
    }
    function toolsHtml() {
      var b = blocks()[cur];
      return '<div class="pg-types" role="toolbar" aria-label="Element type">' + SC.TYPES.map(function (t, i) {
        return '<button type="button" data-type="' + t[0] + '" class="' + (b && b.t === t[0] ? 'on' : '') + '" title="' + esc(t[1]) + ' (Ctrl+' + (i + 1) + ')">' + esc(t[2]) + '</button>';
      }).join('') + '</div><span class="grow"></span>' +
        '<button class="ui-btn sm" data-draft>' + UI.icon('wand') + 'Draft from cards</button><button class="ui-btn sm" data-import>' + UI.icon('upload') + 'Import</button>' +
        '<button class="ui-btn sm" data-export>' + UI.icon('download') + 'Fountain</button><button class="ui-btn sm" data-print>' + UI.icon('print') + 'PDF</button>';
    }
    function draw(focusIndex, focusOff) {
      var B = blocks(), me = T.me || {};
      el.innerHTML = '<div class="pg-tools" data-tools>' + toolsHtml() + '</div><div class="pg-sugg" data-sugg-bar>' + suggHtml() + '</div>' +
        '<div class="pg-layout"><nav class="pg-side ui-card" data-side>' + sideHtml() + '</nav><div><div class="pg-paper os-paper" data-paper>' +
        '<div class="pg-titlepage"><b>' + esc(T.P.title || 'Untitled') + '</b>written by<br>' + esc(T.readonly ? (T.P.author || 'the author') : (me.name || '')) + '</div>' +
        (B.length ? B.map(blockHtml).join('') : '<div class="pg-blank"><h3>The blank page, defeated.</h3><p>' + (doc.scenes.length ? 'You have ' + UI.plural(doc.scenes.length, 'scene card') + '. Turn them into a first draft: headings, action, the characters in each scene, and notes with each goal and conflict.' : 'Start typing, or add scene cards in the Storyline first and draft from them.') + '</p>' +
          '<div class="ui-row" style="justify-content:center">' + (doc.scenes.length ? '<button class="ui-btn primary" data-draft>' + UI.icon('wand') + 'Draft from my cards</button>' : '') + '<button class="ui-btn" data-start>' + UI.icon('edit') + 'Start writing</button><button class="ui-btn" data-import>' + UI.icon('upload') + 'Import Fountain</button></div></div>') +
        '</div><div class="pg-stat" style="max-width:720px;margin:10px auto 0" data-stats>' + statsHtml() + '</div><div class="pg-under" data-under>' + underHtml() + '</div></div></div>';
      if (focusIndex != null) { var n = el.querySelector('[data-i="' + focusIndex + '"]'); if (n) setCaret(n, focusOff == null ? textOf(n).length : focusOff); }
    }
    function refreshChrome() {
      var t = el.querySelector('[data-tools]'), s = el.querySelector('[data-sugg-bar]');
      if (t) t.innerHTML = toolsHtml();
      if (s) s.innerHTML = suggHtml();
    }
    function refreshStats() {
      clearTimeout(statTimer);
      statTimer = setTimeout(function () {
        var s = el.querySelector('[data-stats]'), side = el.querySelector('[data-side]'), u = el.querySelector('[data-under]');
        if (s) s.innerHTML = statsHtml(); if (side) side.innerHTML = sideHtml(); if (u) u.innerHTML = underHtml();
      }, 700);
    }
    function renumber() { el.querySelectorAll('.pg-b').forEach(function (n, k) { n.setAttribute('data-i', k); }); }
    function setType(i, t) {
      var b = blocks()[i], n = el.querySelector('[data-i="' + i + '"]');
      if (!b || !n) return;
      b.t = t;
      if (t === 'paren' && b.x && !/^\(/.test(b.x)) { b.x = '(' + b.x.replace(/^\(|\)$/g, '') + ')'; n.textContent = b.x; }
      n.className = 'pg-b ' + t; n.setAttribute('data-ph', PH[t] || ''); n.setAttribute('data-label', SC.NAME[t] || '');
      T.touch(); refreshChrome(); refreshStats();
    }
    function insertAfter(i, block, off) {
      blocks().splice(i + 1, 0, block);
      var prev = el.querySelector('[data-i="' + i + '"]'), tmp = document.createElement('div');
      tmp.innerHTML = blockHtml(block, i + 1);
      var n = tmp.firstChild;
      if (prev) prev.parentNode.insertBefore(n, prev.nextSibling); else el.querySelector('[data-paper]').appendChild(n);
      renumber(); cur = i + 1; setCaret(n, off || 0); T.touch(); refreshChrome(); refreshStats();
    }
    function removeAt(i, focusPrevAt) {
      blocks().splice(i, 1);
      var n = el.querySelector('[data-i="' + i + '"]'); if (n) n.remove();
      renumber();
      var p = el.querySelector('[data-i="' + (i - 1) + '"]');
      if (p) { cur = i - 1; setCaret(p, focusPrevAt == null ? textOf(p).length : focusPrevAt); }
      T.touch(); refreshChrome(); refreshStats();
    }

    el.addEventListener('focusin', function (e) {
      var n = e.target.closest('.pg-b'); if (!n) return;
      cur = +n.getAttribute('data-i'); refreshChrome();
    });
    el.addEventListener('input', function (e) {
      var n = e.target.closest('.pg-b'); if (!n) return;
      var i = +n.getAttribute('data-i'), b = blocks()[i]; if (!b) return;
      b.x = textOf(n);
      if (b.t === 'action' && /^(INT|EXT|EST|I\/E)[\.\s]/i.test(b.x)) setType(i, 'scene');
      else if (b.t === 'dialogue' && /^\(/.test(b.x)) setType(i, 'paren');
      T.touch(); refreshStats();
    });
    el.addEventListener('paste', function (e) {
      var n = e.target.closest('.pg-b'); if (!n) return;
      var text = (e.clipboardData || window.clipboardData).getData('text');
      if (!text) return;
      e.preventDefault();
      if (/\n\s*\n/.test(text) && text.length > 80) {   // a chunk of script: parse it as Fountain into blocks
        var parsed = SC.parseFountain(text), i = +n.getAttribute('data-i'), empty = !textOf(n).trim(), at = empty ? i : i + 1;
        if (parsed.length) {
          Array.prototype.splice.apply(blocks(), [at, empty ? 1 : 0].concat(parsed));
          T.touch(); draw(at + parsed.length - 1); UI.toast('Pasted ' + UI.plural(parsed.length, 'element') + ', formatted.', 'ok'); return;
        }
      }
      document.execCommand('insertText', false, text.replace(/\r?\n+/g, ' '));
    });
    el.addEventListener('keydown', function (e) {
      var n = e.target.closest('.pg-b'); if (!n) return;
      var i = +n.getAttribute('data-i'), b = blocks()[i], c = caret(n), text = textOf(n);
      if ((e.ctrlKey || e.metaKey) && /^[1-8]$/.test(e.key)) { e.preventDefault(); setType(i, SC.TYPES[+e.key - 1][0]); return; }
      if (e.key === 'Tab') { e.preventDefault(); setType(i, e.shiftKey ? (PREV_TAB[b.t] || 'action') : SC.TAB[b.t]); setCaret(n, c.start); return; }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!text.trim()) { setType(i, SC.TAB[b.t] || 'action'); setCaret(n, 0); return; }
        var before = text.slice(0, c.start), after = text.slice(c.end);
        if (b.t === 'scene' || b.t === 'character' || b.t === 'transition' || b.t === 'shot') before = before.toUpperCase();
        if (b.t === 'action') b.t = SC.guess('action', before);
        b.x = before; n.textContent = before; n.className = 'pg-b ' + b.t;
        var next = SC.NEXT[b.t] || 'action';
        if (b.t === 'paren' && !/\)$/.test(before)) { b.x = before + ')'; n.textContent = b.x; }
        insertAfter(i, { t: next, x: after }, 0);
        return;
      }
      if (e.key === 'Backspace' && c.start === 0 && c.end === 0 && i > 0) {
        e.preventDefault();
        var prev = blocks()[i - 1], join = (prev.x || '').length;
        if (!text) { removeAt(i); return; }
        prev.x = (prev.x || '') + text; var pn = el.querySelector('[data-i="' + (i - 1) + '"]'); if (pn) pn.textContent = prev.x;
        removeAt(i, join); return;
      }
      if (e.key === 'ArrowUp' && c.start === 0 && i > 0) { e.preventDefault(); var p = el.querySelector('[data-i="' + (i - 1) + '"]'); setCaret(p, textOf(p).length); return; }
      if (e.key === 'ArrowDown' && c.end === text.length && i < blocks().length - 1) { e.preventDefault(); setCaret(el.querySelector('[data-i="' + (i + 1) + '"]'), 0); }
    });
    el.addEventListener('mousedown', function (e) { if (e.target.closest('[data-type],[data-sugg]')) e.preventDefault(); });
    el.addEventListener('click', function (e) {
      var t;
      if ((t = e.target.closest('[data-type]'))) { if (cur >= 0) { setType(cur, t.getAttribute('data-type')); var nn = el.querySelector('[data-i="' + cur + '"]'); if (nn) setCaret(nn, textOf(nn).length); } else UI.toast('Click a line in the script first.'); return; }
      if ((t = e.target.closest('[data-sugg]'))) {
        var b = blocks()[cur], n = el.querySelector('[data-i="' + cur + '"]'); if (!b || !n) return;
        b.x = t.getAttribute('data-sugg'); n.textContent = b.x; setCaret(n, b.x.length); T.touch(); refreshStats(); return;
      }
      if ((t = e.target.closest('[data-jump]'))) { e.preventDefault(); var j = el.querySelector('[data-i="' + t.getAttribute('data-jump') + '"]'); if (j) { j.scrollIntoView({ block: 'center', behavior: 'smooth' }); setCaret(j, 0); } return; }
      if (e.target.closest('[data-start]')) { doc.script.push({ t: 'scene', x: '' }); T.touch(); draw(0, 0); return; }
      if (e.target.closest('[data-draft-missing]')) { var add = SC.draft(doc, true); doc.script.push.apply(doc.script, add); T.touch(); draw(); UI.toast('Added ' + UI.plural(add.filter(function (x) { return x.t === 'scene'; }).length, 'scene') + ' from your cards.', 'ok'); return; }
      if (e.target.closest('[data-draft]')) {
        if (!doc.scenes.length) { UI.toast('Add scene cards in the Storyline first.'); return; }
        if (!doc.script.length) { doc.script = SC.draft(doc); T.touch(); draw(); UI.toast('First draft ready. Now make it yours: every line is a starting point.', 'ok'); return; }
        var m = UI.modal('<h2>Draft from your cards</h2><p class="muted">The pages already have text. What should the draft do?</p><div class="ui-stack">' +
          '<button class="ui-btn block" data-dm="missing">' + UI.icon('plus') + 'Add only the scenes that aren\'t in the pages yet</button>' +
          '<button class="ui-btn block danger" data-dm="replace">' + UI.icon('refresh') + 'Replace all the pages with a fresh draft</button></div>');
        m.el.addEventListener('click', function (ev) {
          var d = ev.target.closest('[data-dm]'); if (!d) return;
          if (d.getAttribute('data-dm') === 'missing') { var a = SC.draft(doc, true); doc.script.push.apply(doc.script, a); UI.toast(a.length ? 'Added the missing scenes at the end.' : 'Every card is already in the pages.'); }
          else doc.script = SC.draft(doc);
          T.touch(); m.close(); draw();
        });
        return;
      }
      if (e.target.closest('[data-import]')) {
        var im = UI.modal('<h2>Import a screenplay</h2><p class="muted">Paste Fountain or plain screenplay text, or open a .fountain or .txt file. Final Draft, Highland, WriterDuet and Fade In can all export Fountain.</p>' +
          '<input type="file" accept=".fountain,.txt,.spmd,text/plain" data-file><textarea data-src rows="10" placeholder="INT. KITCHEN - NIGHT&#10;&#10;She pours two cups. Only drinks one.&#10;&#10;NORA&#10;You\'re late."></textarea>' +
          '<div class="ui-row end" style="margin-top:12px"><button class="ui-btn ghost" data-close>Cancel</button>' + (doc.script.length ? '<button class="ui-btn" data-imp="append">Add at the end</button>' : '') + '<button class="ui-btn primary" data-imp="replace">' + (doc.script.length ? 'Replace the pages' : 'Import') + '</button></div>', { wide: true });
        im.el.querySelector('[data-file]').addEventListener('change', function (ev) {
          var f = ev.target.files[0]; if (!f) return;
          if (f.size > 2000000) { UI.toast('That file is too big (2 MB at most).', 'error'); return; }
          var rd = new FileReader(); rd.onload = function () { im.el.querySelector('[data-src]').value = rd.result; }; rd.readAsText(f);
        });
        im.el.addEventListener('click', function (ev) {
          var d = ev.target.closest('[data-imp]'); if (!d) return;
          var parsed = SC.parseFountain(im.el.querySelector('[data-src]').value);
          if (!parsed.length) { UI.toast('Nothing to import there.', 'error'); return; }
          if (d.getAttribute('data-imp') === 'append') doc.script.push.apply(doc.script, parsed); else doc.script = parsed;
          T.touch(); im.close(); draw(); UI.toast('Imported ' + UI.plural(parsed.length, 'element') + '.', 'ok');
        });
        return;
      }
      if (e.target.closest('[data-export]')) {
        var txt = SC.fountain(T.P, T.readonly ? T.P.author : (T.me && T.me.name)), name = (T.P.title || 'screenplay').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'screenplay';
        try {
          var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain;charset=utf-8' })); a.download = name + '.fountain';
          document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
          UI.toast('Downloaded ' + name + '.fountain', 'ok');
        } catch (err) { UI.modal('<h2>Your screenplay as Fountain</h2><textarea rows="16" style="font-family:var(--font-script)">' + esc(txt) + '</textarea>'); }
        return;
      }
      if (e.target.closest('[data-print]')) { if (!doc.script.length) { UI.toast('There are no pages to print yet.'); return; } window.print(); }
    });
    draw();
    return { destroy: function () { clearTimeout(statTimer); } };
  };
})();

(function () {
  var esc = UI.esc;
  OS.tabs.storyline = function (el, T) {
    var doc = T.doc, dragId = null;
    function counts() { var c = {}; doc.scenes.forEach(function (s) { c[s.beat] = (c[s.beat] || 0) + 1; }); return c; }
    function card(s, i, kinds) {
      var k = kinds[s.id], setups = doc.plants.filter(function (p) { return p.setup_scene === s.id; }).length, payoffs = doc.plants.filter(function (p) { return p.payoff_scene === s.id; }).length;
      return '<div class="st-card" draggable="' + (T.readonly ? 'false' : 'true') + '" data-scene="' + esc(s.id) + '"><div class="n"><span>SCENE ' + (i + 1) + '</span><span class="mv">' +
        '<button type="button" data-mv="-1" aria-label="Move earlier">' + UI.icon('back') + '</button><button type="button" data-mv="1" aria-label="Move later">' + UI.icon('arrow') + '</button></span></div>' +
        '<div class="hd">' + esc(s.heading || 'No heading yet') + '</div><p class="sm">' + esc(s.summary || 'What happens here?') + '</p>' +
        '<div class="ft">' + OS.ui.avatars(doc, s.chars, 4) + '<span class="flags">' + (k === 'flashback' ? '<span class="flag">Flashback</span>' : k === 'flashforward' ? '<span class="flag ff">Flash-forward</span>' : '') +
        (setups ? '<span class="flag" title="Plants a setup" style="background:var(--c-accent-soft);color:var(--c-accent)">Setup</span>' : '') + (payoffs ? '<span class="flag" style="background:var(--c-accent-soft);color:var(--c-accent)" title="Pays off a setup">Payoff</span>' : '') +
        (s.done ? '<span class="flag ok">Written</span>' : '') + OS.ui.charge(s.charge_in, s.charge_out) + '</span></div></div>';
    }
    function plants() {
      var opts = function (sel) { return '<option value="">Not placed yet</option>' + doc.scenes.map(function (s, i) { return '<option value="' + s.id + '"' + (sel === s.id ? ' selected' : '') + '>Scene ' + (i + 1) + ': ' + esc((s.heading || s.summary || '').slice(0, 44)) + '</option>'; }).join(''); };
      return '<div class="ui-card" style="margin-top:22px"><div class="pj-sec-title"><div><h3>Setups and payoffs</h3><p class="muted small" style="margin:2px 0 0">Plant it early, pay it off later. The doctor flags any setup that never pays off.</p></div>' +
        '<button class="ui-btn sm" data-addplant>' + UI.icon('plus') + 'Add a setup</button></div><div class="st-plants">' + (doc.plants.length ? doc.plants.map(function (p) {
          var paid = p.payoff && p.payoff.trim();
          return '<div class="st-plant" data-plant="' + esc(p.id) + '"><label>Setup<input type="text" data-pf="setup" value="' + esc(p.setup) + '" maxlength="200" placeholder="The gun in the drawer"></label>' +
            '<label>Payoff ' + (paid ? '' : '<span class="ui-badge warn" style="font-size:.64rem">missing</span>') + '<input type="text" data-pf="payoff" value="' + esc(p.payoff) + '" maxlength="200" placeholder="It goes off in act three"></label>' +
            '<button class="ui-btn ghost icon" data-delplant aria-label="Delete">' + UI.icon('trash') + '</button>' +
            '<label>Planted in<select data-pf="setup_scene">' + opts(p.setup_scene) + '</select></label><label>Paid off in<select data-pf="payoff_scene">' + opts(p.payoff_scene) + '</select></label><span></span></div>';
        }).join('') : '<p class="muted small">No setups yet. Every object, skill or line the audience must remember later belongs here.</p>') + '</div></div>';
    }
    function draw() {
      var beats = OS.beatsOf(T.P.structure), kinds = OS.order(doc), shape = OS.shapeOf(doc.scenes), c = counts(), num = 0, braid = OS.svg.braid(doc);
      var known = {}; beats.forEach(function (b) { known[b.k] = 1; });
      var groups = beats.map(function (b, bi) {
        var list = doc.scenes.filter(function (s) { return s.beat === b.k; });
        var html = '<section class="st-beat" data-beat-group="' + b.k + '" id="st-' + b.k + '"><header><div><span class="os-tc">' + (bi + 1) + ' · ' + Math.round(b.pct * 100) + '%</span><h3>' + esc(b.n) + '</h3><p>' + esc(b.d) + ' <i>' + esc(b.q) + '</i></p></div></header><div class="st-cards">';
        list.forEach(function (s) { html += card(s, doc.scenes.indexOf(s), kinds); num++; });
        if (!list.length) {
          var ideas = OS.pickN(OS.L.scenes, 2);
          html += '<div class="st-empty">No scene for this beat yet.<div class="ideas">' + ideas.map(function (r) { return '<button class="ui-btn sm" data-idea="' + esc(r.t) + '" data-beat="' + b.k + '" title="' + esc(r.d) + '">' + UI.icon('plus') + esc(r.t) + '</button>'; }).join('') + '</div></div>';
        }
        return html + '<button type="button" class="st-add" data-add="' + b.k + '">' + UI.icon('plus') + 'Add a scene</button></div></section>';
      }).join('');
      var orphans = doc.scenes.filter(function (s) { return !known[s.beat]; });
      el.innerHTML = '<div class="pj-sec-title"><div><h2>Storyline</h2><p class="muted small" style="margin:4px 0 0">' + UI.plural(doc.scenes.length, 'scene') + ' in the order we see them, on the ' + esc(OS.STRUCTURES[T.P.structure].name) + '. Drag cards to reorder.</p></div></div>' +
        (doc.scenes.length ? '<div class="st-viz"><div class="ui-card"><h3>Chronology against storyline</h3><p class="muted small" style="margin:0 0 6px">Top: what happened. Bottom: what we see. Crossing lines are the story told out of order.</p>' +
          (braid ? '<div class="os-svg-wrap">' + braid + '</div><div class="st-legend"><span><i style="background:#e0a526"></i>In order</span><span><i style="background:#c8102e"></i>Flashback</span><span><i style="background:#7b4bd6"></i>Flash-forward</span></div>'
            : '<p class="muted small">Link scene cards to chronology events (or rebuild the chronology) to see the braid.</p>') + '</div>' +
          '<div class="ui-card"><h3>Story shape</h3>' + (shape ? '<p style="margin:0"><span class="st-shape">' + esc(shape.name) + '</span> <span class="muted small">' + esc(shape.about) + '</span></p><div class="os-svg-wrap">' + OS.svg.shape(doc.scenes, shape) + '</div>'
            : '<p class="muted small">Set the value at the end of at least four scenes (open a card) and your story\'s shape appears here, matched to Kurt Vonnegut\'s classic shapes.</p>') + '</div></div>' : '') +
        '<div class="ui-card st-bar os-svg-wrap">' + OS.svg.bar(T.P.structure, c) + '</div>' +
        '<div class="st-tools"><button class="ui-btn" data-fill>' + UI.icon('layers') + 'Add a card to every empty beat</button><a class="ui-btn ghost" href="#" data-go-tab="overview">' + UI.icon('wheel') + 'Change structure</a></div>' +
        groups + (orphans.length ? '<section class="st-beat"><header><div><h3>Not on a beat</h3></div></header><div class="st-cards">' + orphans.map(function (s) { return card(s, doc.scenes.indexOf(s), kinds); }).join('') + '</div></section>' : '') +
        plants();
      if (T.sub) { var g = el.querySelector('#st-' + T.sub); if (g) { g.classList.add('focus'); setTimeout(function () { g.scrollIntoView({ block: 'start' }); }, 30); } T.sub = null; }
    }
    function move(s, d) {
      var i = doc.scenes.indexOf(s), j = i + d, other = doc.scenes[j];
      if (!other) return;
      if (other.beat === s.beat) { doc.scenes[i] = other; doc.scenes[j] = s; } else s.beat = other.beat;
      T.sortScenes(); doc = T.doc; T.touch(); draw();
    }
    el.addEventListener('click', function (e) {
      var t, cardEl = e.target.closest('[data-scene]'), s = cardEl ? OS.find(doc.scenes, cardEl.getAttribute('data-scene')) : null;
      if (s && (t = e.target.closest('[data-mv]'))) { move(s, +t.getAttribute('data-mv')); return; }
      if (s) { OS.ui.editScene(T, s, function () { doc = T.doc; draw(); }); return; }
      if ((t = e.target.closest('[data-add]'))) { OS.ui.editScene(T, OS.ui.newScene(t.getAttribute('data-add')), function () { doc = T.doc; draw(); }); return; }
      if ((t = e.target.closest('[data-idea]'))) {
        var r = OS.L.scenes.filter(function (x) { return x.t === t.getAttribute('data-idea'); })[0], ns = OS.ui.newScene(t.getAttribute('data-beat'));
        ns.summary = r.t + ': ' + r.d; doc.scenes.push(ns); T.sortScenes(); doc = T.doc; T.touch(); draw();
        OS.ui.editScene(T, ns, function () { doc = T.doc; draw(); }); return;
      }
      if (e.target.closest('[data-fill]')) {
        var c = counts(), n = 0;
        OS.beatsOf(T.P.structure).forEach(function (b) { if (!c[b.k]) { var x = OS.ui.newScene(b.k); x.summary = b.n + ': ' + b.q; doc.scenes.push(x); n++; } });
        T.sortScenes(); doc = T.doc; if (n) T.touch(); draw(); UI.toast(n ? 'Added ' + UI.plural(n, 'card') + '. Each holds the question its beat must answer.' : 'Every beat already has a scene.', n ? 'ok' : null); return;
      }
      if ((t = e.target.closest('svg [data-beat]'))) { var g = el.querySelector('#st-' + t.getAttribute('data-beat')); if (g) g.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      if (e.target.closest('[data-addplant]')) { doc.plants.push({ id: OS.uid('p'), setup: '', payoff: '', setup_scene: '', payoff_scene: '' }); T.touch(); draw(); return; }
      if ((t = e.target.closest('[data-delplant]'))) { var p = OS.find(doc.plants, t.closest('[data-plant]').getAttribute('data-plant')); doc.plants.splice(doc.plants.indexOf(p), 1); T.touch(); draw(); }
    });
    function plantField(e) {
      var f = e.target.closest('[data-pf]'); if (!f) return;
      var p = OS.find(doc.plants, f.closest('[data-plant]').getAttribute('data-plant'));
      p[f.getAttribute('data-pf')] = f.value; T.touch();
    }
    el.addEventListener('input', plantField);
    el.addEventListener('change', function (e) { plantField(e); if (e.target.matches('select[data-pf]')) draw(); });
    el.addEventListener('dragstart', function (e) {
      var c = e.target.closest('[data-scene]'); if (!c) return;
      dragId = c.getAttribute('data-scene'); c.classList.add('dragging');
      try { e.dataTransfer.setData('text/plain', dragId); e.dataTransfer.effectAllowed = 'move'; } catch (err) {}
    });
    el.addEventListener('dragend', function () { dragId = null; el.querySelectorAll('.dragging,.drop,.over').forEach(function (x) { x.classList.remove('dragging', 'drop', 'over'); }); });
    el.addEventListener('dragover', function (e) {
      if (!dragId) return;
      var g = e.target.closest('[data-beat-group]'); if (!g) return;
      e.preventDefault();
      el.querySelectorAll('.drop,.over').forEach(function (x) { x.classList.remove('drop', 'over'); });
      var c = e.target.closest('[data-scene]');
      if (c && c.getAttribute('data-scene') !== dragId) c.classList.add('drop'); else g.classList.add('over');
    });
    el.addEventListener('drop', function (e) {
      if (!dragId) return;
      var g = e.target.closest('[data-beat-group]'); if (!g) return;
      e.preventDefault();
      var s = OS.find(doc.scenes, dragId), c = e.target.closest('[data-scene]'), target = c ? OS.find(doc.scenes, c.getAttribute('data-scene')) : null;
      doc.scenes.splice(doc.scenes.indexOf(s), 1);
      if (target && target !== s) { s.beat = target.beat; doc.scenes.splice(doc.scenes.indexOf(target), 0, s); }
      else { s.beat = g.getAttribute('data-beat-group'); doc.scenes.push(s); }
      dragId = null; T.sortScenes(); doc = T.doc; T.touch(); draw();
    });
    draw();
  };
})();

(function () {
  var esc = UI.esc, W = 1000, H = 600;
  OS.tabs.web = function (el, T) {
    var doc = T.doc, connect = null, connecting = false, drag = null;
    function svg() {
      var chars = doc.characters, free = chars.some(function (c) { return c.x == null || c.y == null; });
      OS.layout(chars, doc.relations, W, H);
      if (free) setTimeout(T.touch, 0);   // keep the positions the layout picked
      if (!drag || !vb) vb = fit(chars);  // zoom to the cast (frozen while dragging, so nothing jumps)
      var out = '<svg viewBox="' + vb.join(' ') + '" role="img" aria-label="Relationship web">';
      doc.relations.forEach(function (r) {
        var a = OS.find(chars, r.a), b = OS.find(chars, r.b), t = OS.RELTYPE[r.type] || { color: '#888', name: r.type };
        if (!a || !b) return;
        var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
        var cx = mx - dy / len * 26, cy = my + dx / len * 26;   // a gentle curve, so two-way pairs don't overlap
        out += '<g class="edge" data-rel="' + esc(r.id) + '"><path d="M' + a.x + ',' + a.y + ' Q' + cx + ',' + cy + ' ' + b.x + ',' + b.y + '" fill="none" stroke="transparent" stroke-width="18"/>' +
          '<path class="ln" d="M' + a.x + ',' + a.y + ' Q' + cx + ',' + cy + ' ' + b.x + ',' + b.y + '" fill="none" stroke="' + t.color + '" stroke-opacity=".78" stroke-width="' + (1.5 + (r.tension || 0) / 2.2) + '" stroke-linecap="round"' + (r.type === 'secret' ? ' stroke-dasharray="6 6"' : '') + '/>' +
          '<rect x="' + ((a.x + 2 * cx + b.x) / 4 - 42) + '" y="' + ((a.y + 2 * cy + b.y) / 4 - 10) + '" width="84" height="20" rx="10" fill="var(--c-surface)" stroke="' + t.color + '"/>' +
          '<text x="' + ((a.x + 2 * cx + b.x) / 4) + '" y="' + ((a.y + 2 * cy + b.y) / 4 + 4) + '" text-anchor="middle" font-size="11" font-weight="600" fill="var(--c-ink)">' + esc(t.name.length > 13 ? t.name.slice(0, 12) + '…' : t.name) + '</text>' +
          '<title>' + esc((a.name || '?') + ' → ' + (b.name || '?') + ': ' + (r.a_to_b || t.name) + ' / ' + (b.name || '?') + ' → ' + (a.name || '?') + ': ' + (r.b_to_a || t.name) + ' (tension ' + (r.tension || 0) + '/10)') + '</title></g>';
      });
      chars.forEach(function (c) {
        var sel = connect === c.id, col = OS.roleColor(c.role), rad = c.role === 'protagonist' ? 34 : c.role === 'antagonist' ? 30 : 26;
        out += '<g class="node" data-node="' + esc(c.id) + '" transform="translate(' + c.x + ',' + c.y + ')">' +
          (sel ? '<circle r="' + (rad + 8) + '" fill="none" stroke="var(--c-brand)" stroke-width="3" stroke-dasharray="5 4"/>' : '') +
          '<circle r="' + rad + '" fill="' + col + '" stroke="var(--c-surface)" stroke-width="4"/>' +
          '<text y="5" text-anchor="middle" font-size="' + (rad > 28 ? 15 : 13) + '" font-weight="700" fill="#fff">' + esc(UI.initials(c.name || '?')) + '</text>' +
          '<text y="' + (rad + 18) + '" text-anchor="middle" font-size="13" font-weight="600" fill="var(--c-ink)" paint-order="stroke" stroke="var(--c-surface)" stroke-width="4">' + esc(OS.first(c.name || 'Unnamed')) + '</text>' +
          '<text y="' + (rad + 32) + '" text-anchor="middle" font-size="10.5" fill="var(--c-muted)" paint-order="stroke" stroke="var(--c-surface)" stroke-width="3">' + esc(OS.ROLE[c.role] || '') + '</text></g>';
      });
      return out + '</svg>';
    }
    var vb = null;
    function fit(chars) {
      var xs = chars.map(function (c) { return c.x; }), ys = chars.map(function (c) { return c.y; });
      var x0 = Math.min.apply(null, xs) - 90, x1 = Math.max.apply(null, xs) + 90, y0 = Math.min.apply(null, ys) - 60, y1 = Math.max.apply(null, ys) + 80;
      var w = Math.max(560, x1 - x0), h = Math.max(360, y1 - y0);
      var narrow = el.clientWidth && el.clientWidth < 620, hi = narrow ? 1.15 : 1.9, lo = narrow ? 0.9 : 1.4;
      if (w / h > hi) h = w / hi; else if (w / h < lo) w = h * lo;
      var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      return [Math.round(cx - w / 2), Math.round(cy - h / 2), Math.round(w), Math.round(h)];
    }
    function hot() {
      var list = doc.relations.slice().sort(function (a, b) { return (b.tension || 0) - (a.tension || 0); }).slice(0, 4);
      return list.length ? list.map(function (r) {
        var a = OS.find(doc.characters, r.a) || {}, b = OS.find(doc.characters, r.b) || {};
        return '<div><span class="m"><b>' + esc(OS.first(a.name || '?')) + '</b> &amp; <b>' + esc(OS.first(b.name || '?')) + '</b> · ' + esc((OS.RELTYPE[r.type] || {}).name || '') + '</span><span class="os-meter" style="width:70px"><i style="width:' + (r.tension || 0) * 10 + '%"></i></span></div>';
      }).join('') + '<p class="os-help">The highest tension pairs deserve a scene alone together. Do they have one?</p>' : '<p class="muted small">No relationships yet.</p>';
    }
    function draw() {
      if (doc.characters.length < 2) {
        el.innerHTML = '<div class="ui-empty">' + UI.icon('web') + '<h3>The web needs at least two people</h3><p>Add characters in the Cast tab, then connect them here.</p><a class="ui-btn primary" href="#" data-go-tab="cast">' + UI.icon('users') + 'Go to Cast</a></div>';
        return;
      }
      var used = {}; doc.relations.forEach(function (r) { used[r.type] = 1; });
      el.innerHTML = '<div class="pj-cols"><div><div class="wb-tools"><button class="ui-btn' + (connecting ? ' on' : '') + '" data-connect>' + UI.icon('web') + (connecting ? 'Click two people…' : 'Connect two people') + '</button>' +
        '<button class="ui-btn" data-suggest>' + UI.icon('dice') + 'Suggest a relationship</button><button class="ui-btn ghost" data-arrange>' + UI.icon('refresh') + 'Auto-arrange</button></div>' +
        '<div class="wb-canvas" data-canvas>' + svg() + '</div><p class="os-help">Drag people around. Click a person to open them, a line to edit it.</p>' +
        '<div class="wb-legend">' + OS.REL.filter(function (r) { return used[r[0]]; }).map(function (r) { return '<span><i style="background:' + r[2] + '"></i>' + esc(r[1]) + '</span>'; }).join('') + '<span>Thicker line = more tension</span></div>' +
        '<h3 style="margin-top:24px">Every relationship</h3><div class="wb-list">' + (doc.relations.length ? doc.relations.map(function (r) {
          var a = OS.find(doc.characters, r.a) || {}, b = OS.find(doc.characters, r.b) || {}, t = OS.RELTYPE[r.type] || { color: '#888', name: r.type };
          return '<button type="button" class="wb-row" data-rel="' + esc(r.id) + '"><span class="sw" style="background:' + t.color + '"></span><span><b>' + esc(a.name || '?') + '</b> and <b>' + esc(b.name || '?') + '</b> · ' + esc(t.name) +
            '<span class="feel">' + esc([r.a_to_b && OS.first(a.name || '?') + ': ' + r.a_to_b, r.b_to_a && OS.first(b.name || '?') + ': ' + r.b_to_a].filter(Boolean).join(' · ') || t.q) + '</span></span>' +
            '<span class="small muted">' + (r.tension || 0) + '/10</span></button>';
        }).join('') : '<p class="muted">Nothing yet. Use "Connect two people" or let the dice suggest one.</p>') + '</div></div>' +
        '<aside><div class="ui-card"><h3>Hot spots</h3><div class="wb-hot">' + hot() + '</div></div>' +
        '<div class="ui-card"><h3>Questions to ask</h3><ul class="small" style="padding-left:18px;margin:0;display:grid;gap:6px"><li>Who wants the same thing as the protagonist?</li><li>Who knows a secret about whom?</li>' +
        '<li>Which relationship changes the most by the end?</li><li>Is every supporting character a mirror of a path the hero could take?</li></ul></div></aside></div>';
    }
    function toSvg(e) {
      var s = el.querySelector('[data-canvas] svg'), pt = s.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      var p = pt.matrixTransform(s.getScreenCTM().inverse());
      return { x: Math.max(vb[0] + 30, Math.min(vb[0] + vb[2] - 30, Math.round(p.x))), y: Math.max(vb[1] + 30, Math.min(vb[1] + vb[3] - 40, Math.round(p.y))) };
    }
    el.addEventListener('pointerdown', function (e) {
      var n = e.target.closest('[data-node]');
      if (!n) return;
      drag = { id: n.getAttribute('data-node'), moved: false, g: n, start: toSvg(e) };
      n.classList.add('drag');
      try { n.setPointerCapture(e.pointerId); } catch (err) {}
    });
    el.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var p = toSvg(e), c = OS.find(doc.characters, drag.id);
      if (!drag.moved && Math.abs(p.x - drag.start.x) + Math.abs(p.y - drag.start.y) < 4) return;
      drag.moved = true; c.x = p.x; c.y = p.y;
      el.querySelector('[data-canvas]').innerHTML = svg();
    });
    el.addEventListener('pointerup', function () {
      if (!drag) return;
      var d = drag; drag = null;
      if (d.moved) { T.touch(); vb = null; draw(); return; }
      if (connecting) {
        if (!connect) { connect = d.id; draw(); return; }
        if (connect !== d.id) {
          var a = connect; connect = null; connecting = false;
          OS.ui.editRelation(T, { id: OS.uid('r'), a: a, b: d.id, type: 'friends', a_to_b: '', b_to_a: '', tension: 5 }, draw);
          draw(); return;
        }
      } else T.go('cast', d.id);
    });
    el.addEventListener('click', function (e) {
      var t;
      if (e.target.closest('[data-connect]')) { connecting = !connecting; connect = null; draw(); return; }
      if (e.target.closest('[data-arrange]')) { doc.characters.forEach(function (c) { delete c.x; delete c.y; }); vb = null; T.touch(); draw(); return; }
      if (e.target.closest('[data-suggest]')) {
        var s = OS.ui.suggestRelation(doc);
        if (!s) { UI.toast('Everyone is already connected to everyone. Impressive.'); return; }
        OS.ui.editRelation(T, s, draw); return;
      }
      if ((t = e.target.closest('[data-rel]'))) { OS.ui.editRelation(T, OS.find(doc.relations, t.getAttribute('data-rel')), draw); }
    });
    draw();
  };
})();
