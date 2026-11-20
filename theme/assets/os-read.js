/* os-read.js: Table read. The browser's own speech (window.speechSynthesis) reads the screenplay aloud, one voice per
   character, free, offline and with no key. Loaded after os-tabs.js; the Pages tab opens it.

   OS.tableRead(T, api) -> {open(), close(), destroy(), isOpen()}
     T    the workspace (T.doc.script = the blocks, T.readonly, T.touch(), T.P.id)
     api  {start(): the block index to start at (the caret line), paper(): the element holding the .pg-b[data-i] blocks}
   One utterance per block (long blocks in sentence chunks of ~220 characters), which avoids Chrome cutting long speech
   off. Cues are stripped of (V.O.)/(CONT'D); parentheticals and notes are never read. Voices are cast by hashing each
   name over the device's English voices (device voices first, so no text leaves the device unless the writer picks an
   online voice); with fewer voices than characters the pitch varies 0.75-1.35. No gender guessing: the writer can change
   any voice in Voices. Settings: doc.table_read = {narrator, dialogue_only, rate, voices: {NAME: {v, p}}} on the
   writer's own projects (autosaved), browser storage for read-only samples. */
(function () {
  'use strict';
  var OS = window.OS = window.OS || {};
  var esc = function (s) { return UI.esc(s); };
  var PITCHES = [1, 0.8, 1.25, 0.9, 1.15, 0.75, 1.35];
  var RATES = [0.8, 1, 1.2, 1.4, 1.6];

  function synth() { return window.speechSynthesis || null; }
  OS.tableReadSupported = function () { return !!(window.speechSynthesis && window.SpeechSynthesisUtterance); };
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function speaker(x) { return String(x || '').replace(/\s*\(.*\)\s*$/, '').trim().toUpperCase(); }
  function soften(s) { return String(s || '').replace(/\b[A-Z][A-Z'’]+\b/g, function (w) { return w.charAt(0) + w.slice(1).toLowerCase(); }); }
  /* What the narrator says for a block: "INT. KITCHEN - NIGHT" -> "Interior. Kitchen. Night." */
  function spoken(b) {
    var x = String(b.x || '').replace(/\s+/g, ' ').trim();
    if (b.t === 'scene') {
      x = x.replace(/^(INT\.?\s*\/\s*EXT\.?|I\/E\.?)\s*/i, 'Interior, exterior. ').replace(/^INT\.?\s+/i, 'Interior. ').replace(/^EXT\.?\s+/i, 'Exterior. ')
        .replace(/^EST\.?\s+/i, 'Establishing. ').replace(/\s+[-–—]+\s+/g, '. ');
      return soften(x.toUpperCase()).replace(/\.?$/, '.');
    }
    if (b.t === 'transition') return soften(x.toUpperCase()).replace(/:$/, '.');
    if (b.t === 'shot') return soften(x.toUpperCase());
    return soften(x);
  }
  function chunks(text) {
    var parts = String(text || '').match(/[^.!?…]+[.!?…]+["'”’)]*\s*|[^.!?…]+$/g) || [text], out = [], cur = '';
    parts.forEach(function (p) {
      if ((cur + p).length > 220 && cur) { out.push(cur.trim()); cur = ''; }
      while (p.length > 260) { var cut = p.lastIndexOf(' ', 220); cut = cut > 60 ? cut : 220; out.push(p.slice(0, cut).trim()); p = p.slice(cut); }
      cur += p;
    });
    if (cur.trim()) out.push(cur.trim());
    return out.length ? out : [String(text || '')];
  }

  OS.tableRead = function (T, api) {
    var bar = null, playing = false, pos = -1, gen = 0, castMap = null, waitTimer = null, watchdog = null, voicesModal = null;
    var store = T.readonly ? 'tr.' + (T.P.id || 'sample') : null;
    var cfg = (function () {
      var c = store ? UI.store.get(store, null) : T.doc.table_read;
      c = c && typeof c === 'object' ? JSON.parse(JSON.stringify(c)) : {};
      c.voices = c.voices && typeof c.voices === 'object' ? c.voices : {};
      c.rate = RATES.indexOf(+c.rate) >= 0 ? +c.rate : 1;
      c.dialogue_only = !!c.dialogue_only;
      return c;
    })();
    function save() {
      if (store) UI.store.set(store, cfg);
      else { T.doc.table_read = JSON.parse(JSON.stringify(cfg)); T.touch(); }
    }
    function blocks() { return T.doc.script || []; }
    function paper() { return api.paper ? api.paper() : document; }

    /* ---- voices */
    function allVoices() { var s = synth(); try { return (s && s.getVoices && s.getVoices()) || []; } catch (e) { return []; } }
    function englishVoices() { var v = allVoices(), en = v.filter(function (x) { return /^en/i.test(x.lang || ''); }); return en.length ? en : v; }
    function castPool() { var en = englishVoices(), local = en.filter(function (x) { return x.localService; }); return local.length ? local : en; }
    function byName(name) { if (!name) return null; var v = allVoices(); for (var i = 0; i < v.length; i++) if (v[i].name === name) return v[i]; return null; }
    function names() {
      var lines = OS.script.characterLines(blocks());
      return Object.keys(lines).sort(function (a, b) { return lines[b].words - lines[a].words || (a < b ? -1 : 1); });
    }
    function narratorVoice() {
      var pool = castPool();
      return byName(cfg.narrator) || pool.filter(function (v) { return v.default; })[0] || pool[0] || null;
    }
    function buildCast() {
      var pool = castPool(), narr = narratorVoice(), used = {}, reuse = 0, map = {};
      if (narr) used[narr.name] = 1;
      names().forEach(function (n) {
        var saved = cfg.voices[n] || {}, v = null, p = 1;
        if (saved.v && byName(saved.v)) { v = byName(saved.v); used[v.name] = 1; }
        if (!v) {
          var free = pool.filter(function (x) { return !used[x.name]; });
          if (free.length) { v = free[hash(n) % free.length]; used[v.name] = 1; }
          else { v = pool.length ? pool[hash(n) % pool.length] : null; p = PITCHES[1 + (reuse++ % (PITCHES.length - 1))]; }
        }
        if (saved.p) p = Math.max(0.5, Math.min(2, +saved.p || 1));
        map[n] = { voice: v, pitch: p };
      });
      return map;
    }
    function castFor(who) {
      if (!castMap || !castMap[who]) castMap = buildCast();
      return castMap[who] || { voice: narratorVoice(), pitch: 1 };
    }
    function onVoices() { castMap = null; if (voicesModal) drawVoices(); }
    var s0 = synth();
    if (s0 && s0.addEventListener) s0.addEventListener('voiceschanged', onVoices);

    /* ---- what to read */
    function readable(i) {
      var B = blocks();
      for (; i >= 0 && i < B.length; i++) {
        var b = B[i];
        if (!String(b.x || '').trim() || b.t === 'character' || b.t === 'paren' || b.t === 'note') continue;
        if (cfg.dialogue_only && b.t !== 'dialogue') continue;
        return i;
      }
      return -1;
    }
    function whoAt(i) {
      var B = blocks();
      for (var k = i - 1; k >= 0; k--) {
        if (B[k].t === 'character') return speaker(B[k].x);
        if (B[k].t !== 'dialogue' && B[k].t !== 'paren' && B[k].t !== 'note') return null;
      }
      return null;
    }
    function sceneOf(i) { var n = 0, B = blocks(); for (var k = 0; k <= i && k < B.length; k++) if (B[k].t === 'scene') n++; return n; }
    function sceneCount() { return blocks().filter(function (b) { return b.t === 'scene'; }).length; }

    /* ---- the page follows the voice */
    function highlight(i) {
      var root = paper();
      root.querySelectorAll('.pg-b.reading').forEach(function (n) { n.classList.remove('reading'); });
      if (i < 0) return;
      var n = root.querySelector('.pg-b[data-i="' + i + '"]');
      if (!n) return;
      n.classList.add('reading');
      var r = n.getBoundingClientRect();
      if (r.top < 150 || r.bottom > window.innerHeight - 150) n.scrollIntoView({ block: 'center', behavior: UI.reducedMotion && UI.reducedMotion() ? 'auto' : 'smooth' });
    }
    function paint(who) {
      if (!bar) return;
      var play = bar.querySelector('[data-tr="play"]');
      play.innerHTML = UI.icon(playing ? 'pause' : 'play');
      play.setAttribute('aria-label', playing ? 'Pause' : 'Play');
      play.setAttribute('aria-pressed', playing ? 'true' : 'false');
      var B = blocks(), cur = pos >= 0 ? B[pos] : null;
      bar.querySelector('[data-tr-who]').textContent = cur ? (cur.t === 'dialogue' ? (who || whoAt(pos) || 'Someone') : 'Narrator') : (pos === -2 ? 'The end' : 'Table read');
      bar.querySelector('[data-tr-where]').textContent = sceneCount() ? 'Scene ' + Math.max(1, sceneOf(Math.max(0, pos))) + ' of ' + sceneCount() : UI.plural(B.length, 'line');
    }

    /* ---- speaking */
    function stopVoice() {
      gen++; clearTimeout(watchdog); clearTimeout(waitTimer);
      var s = synth(); try { if (s) s.cancel(); } catch (e) {}
    }
    function finish() {
      playing = false; stopVoice(); highlight(-1); pos = -2; paint();
      UI.toast('The end. That\'s the table read.', 'ok');
    }
    function speakBlock() {
      var s = synth();
      if (!s || !playing) return;
      pos = readable(pos);
      if (pos < 0) { finish(); return; }
      var b = blocks()[pos], who = b.t === 'dialogue' ? whoAt(pos) : null, parts = chunks(spoken(b)), k = 0, my = ++gen;
      highlight(pos); paint(who);
      function one() {
        clearTimeout(watchdog);
        if (my !== gen || !playing) return;
        if (k >= parts.length) { pos = readable(pos + 1); if (pos < 0) finish(); else speakBlock(); return; }
        var text = parts[k++], c = who ? castFor(who) : { voice: narratorVoice(), pitch: 1 };
        var u = new window.SpeechSynthesisUtterance(text);
        if (c.voice) { u.voice = c.voice; u.lang = c.voice.lang; } else u.lang = 'en-US';
        u.pitch = c.pitch; u.rate = cfg.rate; u.volume = 1;
        u.onend = function () { if (my === gen) one(); };
        u.onerror = function (e) { if (my !== gen) return; if (e && (e.error === 'interrupted' || e.error === 'canceled')) return; one(); };
        /* some browsers never fire onend for a voice that stalls: move on after twice the expected time */
        watchdog = setTimeout(function () { if (my === gen && playing) one(); }, Math.round(text.length / (8 * cfg.rate) * 1000) + 5000);
        s.speak(u);
      }
      one();
    }
    function play() {
      if (!playing) {
        if (pos < 0) pos = Math.max(0, Math.min(blocks().length - 1, api.start ? api.start() : 0));
        if (readable(pos) < 0) pos = readable(0);
        if (pos < 0) { UI.toast(cfg.dialogue_only ? 'There\'s no dialogue to read yet.' : 'There are no pages to read yet.'); return; }
        playing = true;
        var s = synth();
        stopVoice();
        if (s && !allVoices().length && 'onvoiceschanged' in s) {   // Chrome loads its voices late: wait for them a moment
          var go = function () { clearTimeout(waitTimer); s.removeEventListener('voiceschanged', go); if (playing) speakBlock(); };
          s.addEventListener('voiceschanged', go);
          waitTimer = setTimeout(go, 1200);
          paint();
        } else setTimeout(speakBlock, 60);   // speaking right after cancel() can be dropped
      } else { playing = false; stopVoice(); paint(); }
    }
    function jump(dir) {
      var B = blocks(), at = pos >= 0 ? pos : (api.start ? api.start() : 0), target = -1, k;
      if (dir < 0) { for (k = at - 1; k >= 0; k--) if (B[k].t === 'scene') { target = k; break; } if (target < 0) target = 0; }
      else { for (k = at + 1; k < B.length; k++) if (B[k].t === 'scene') { target = k; break; } }
      if (target < 0) { UI.toast('That was the last scene.'); return; }
      pos = target;
      if (playing) { stopVoice(); setTimeout(speakBlock, 60); }
      else { var r = readable(pos); if (r >= 0) pos = r; highlight(pos); paint(); }
    }

    /* ---- the Voices dialog */
    function firstLine(n) {
      var B = blocks(), who = null;
      for (var i = 0; i < B.length; i++) {
        if (B[i].t === 'character') who = speaker(B[i].x);
        else if (B[i].t === 'dialogue' && who === n && String(B[i].x || '').trim()) return String(B[i].x);
        else if (B[i].t !== 'paren' && B[i].t !== 'note') who = null;
      }
      return 'Hello. This is how I sound.';
    }
    function preview(n) {
      var s = synth(); if (!s) return;
      if (playing) { playing = false; paint(); }
      stopVoice();
      var c = n ? castFor(n) : { voice: narratorVoice(), pitch: 1 };
      var firstScene = blocks().filter(function (b) { return b.t === 'scene' || b.t === 'action'; })[0];
      var u = new window.SpeechSynthesisUtterance(chunks(n ? soften(firstLine(n)) : (firstScene ? spoken(firstScene) : 'I read the scene headings and the action.'))[0]);
      if (c.voice) { u.voice = c.voice; u.lang = c.voice.lang; } else u.lang = 'en-US';
      u.pitch = c.pitch; u.rate = cfg.rate;
      setTimeout(function () { s.speak(u); }, 60);
    }
    function voiceOptions(sel) {
      var v = englishVoices();
      return '<option value="">Automatic</option>' + v.map(function (x) {
        return '<option value="' + esc(x.name) + '"' + (x.name === sel ? ' selected' : '') + '>' + esc(x.name.replace(/^(Microsoft|Google|Apple)\s+/, '')) + ' · ' + esc(x.lang) + (x.localService ? '' : ' · online') + '</option>';
      }).join('');
    }
    function drawVoices() {
      if (!voicesModal) return;
      var cast = buildCast(), ns = names(), lines = OS.script.characterLines(blocks()), have = allVoices().length;
      castMap = cast;
      voicesModal.el.querySelector('[data-tr-cast]').innerHTML =
        '<div class="tr-row"><div class="tr-who"><b>Narrator</b><span>Scene headings and action</span></div>' +
        '<label class="tr-pick"><span class="sr">Narrator voice</span><select data-tr-v="">' + voiceOptions(cfg.narrator || '') + '</select></label><span></span>' +
        '<button type="button" class="ui-btn sm" data-tr-pre="">' + UI.icon('volume') + 'Preview</button></div>' +
        ns.map(function (n) {
          var c = cast[n], saved = cfg.voices[n] || {};
          return '<div class="tr-row"><div class="tr-who"><b>' + esc(n) + '</b><span>' + UI.plural(lines[n].lines, 'line') + ' · ' + esc(c.voice ? c.voice.name.replace(/^(Microsoft|Google|Apple)\s+/, '') : 'your browser\'s voice') + '</span></div>' +
            '<label class="tr-pick"><span class="sr">Voice for ' + esc(n) + '</span><select data-tr-v="' + esc(n) + '">' + voiceOptions(saved.v || '') + '</select></label>' +
            '<label class="tr-pitch"><span>Pitch</span><input type="range" min="0.6" max="1.6" step="0.05" value="' + c.pitch + '" data-tr-p="' + esc(n) + '" aria-label="Pitch for ' + esc(n) + '"></label>' +
            '<button type="button" class="ui-btn sm" data-tr-pre="' + esc(n) + '">' + UI.icon('volume') + 'Preview</button></div>';
        }).join('') + (ns.length ? '' : '<p class="muted small">No dialogue yet: add a character cue and a line, and they get a voice here.</p>') +
        (have ? '' : '<p class="ui-note">Your browser hasn\'t listed its voices (yet). Everyone uses its default voice, with different pitches.</p>');
    }
    function openVoices() {
      voicesModal = UI.modal('<h2>Voices</h2><p class="muted">Every speaking part gets its own voice from the ones your device has. Change any of them: your picks are kept with this ' + (store ? 'browser' : 'screenplay') + '.</p>' +
        '<label class="ui-check tr-donly"><input type="checkbox" data-tr-donly' + (cfg.dialogue_only ? ' checked' : '') + '> <span><b>Dialogue only</b>: skip scene headings and action</span></label>' +
        '<div class="tr-cast" data-tr-cast></div><p class="fine-print tr-fine">Voices marked "online" are spoken by your browser maker\'s servers, so the lines leave your device. The automatic picks use voices on your device first.</p>' +
        '<div class="ui-row end"><button class="ui-btn primary" data-close>Done</button></div>', { wide: true, onclose: function () { voicesModal = null; } });
      drawVoices();
      voicesModal.el.addEventListener('change', function (e) {
        var t = e.target;
        if (t.hasAttribute('data-tr-donly')) { cfg.dialogue_only = t.checked; save(); return; }
        if (t.hasAttribute('data-tr-v')) {
          var n = t.getAttribute('data-tr-v');
          if (!n) cfg.narrator = t.value || '';
          else { cfg.voices[n] = cfg.voices[n] || {}; if (t.value) cfg.voices[n].v = t.value; else delete cfg.voices[n].v; }
          castMap = null; save(); drawVoices();
        }
        if (t.hasAttribute('data-tr-p')) {
          var m = t.getAttribute('data-tr-p'); cfg.voices[m] = cfg.voices[m] || {}; cfg.voices[m].p = Math.round(+t.value * 100) / 100;
          castMap = null; save();
        }
      });
      voicesModal.el.addEventListener('click', function (e) {
        var p = e.target.closest('[data-tr-pre]'); if (p) preview(p.getAttribute('data-tr-pre'));
      });
    }

    /* ---- the bar */
    function open() {
      if (!OS.tableReadSupported()) return;
      if (!bar) {
        bar = document.createElement('div');
        bar.className = 'ui tr-bar';
        bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Table read');
        bar.innerHTML = '<button type="button" class="tr-btn tr-main" data-tr="play" aria-label="Play">' + UI.icon('play') + '</button>' +
          '<button type="button" class="tr-btn" data-tr="prev" aria-label="Previous scene" title="Previous scene">' + UI.icon('skipback') + '</button>' +
          '<button type="button" class="tr-btn" data-tr="next" aria-label="Next scene" title="Next scene">' + UI.icon('skipfwd') + '</button>' +
          '<div class="tr-now" aria-live="polite"><b data-tr-who>Table read</b><span data-tr-where></span></div>' +
          '<label class="tr-rate"><span class="sr">Speed</span><select data-tr-rate>' + RATES.map(function (r) { return '<option value="' + r + '"' + (r === cfg.rate ? ' selected' : '') + '>' + r + '×</option>'; }).join('') + '</select></label>' +
          '<button type="button" class="tr-btn tr-txt" data-tr="voices">' + UI.icon('users') + '<span>Voices</span></button>' +
          '<button type="button" class="tr-btn" data-tr="close" aria-label="Close the table read" title="Close">' + UI.icon('x') + '</button>';
        document.body.appendChild(bar);
        document.documentElement.classList.add('tr-open');
        bar.addEventListener('click', function (e) {
          var b = e.target.closest('[data-tr]'); if (!b) return;
          var what = b.getAttribute('data-tr');
          if (what === 'play') play();
          else if (what === 'prev') jump(-1);
          else if (what === 'next') jump(1);
          else if (what === 'voices') openVoices();
          else if (what === 'close') close();
        });
        bar.querySelector('[data-tr-rate]').addEventListener('change', function (e) {
          cfg.rate = +e.target.value || 1; save();
          if (playing) { stopVoice(); setTimeout(speakBlock, 60); }
        });
      }
      if (!playing) { pos = -1; play(); }
    }
    function close() {
      playing = false; stopVoice(); highlight(-1);
      if (bar) { bar.remove(); bar = null; }
      document.documentElement.classList.remove('tr-open');
      if (voicesModal) voicesModal.close();
    }
    function destroy() {
      close();
      var s = synth(); if (s && s.removeEventListener) s.removeEventListener('voiceschanged', onVoices);
    }
    return { open: open, close: close, destroy: destroy, isOpen: function () { return !!bar; }, playing: function () { return playing; } };
  };
})();
