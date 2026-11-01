/* core.js: the shared front-end engine (window.UI). Same in every app made from APP_MAKER/template;
   app-specific things live in web/app.js (brand, nav, footer) and web/pages/*.html (the pages).

   Pages:   UI.page(name, {title, nav, icon, auth, order, chrome}, mount)
              auth: null (anyone) | 'guest' (signed-out only) | 'user' | 'admin'
              nav: label for the header / phone tab bar (omit to keep it out of the menus)
              mount(view, ctx) draws into `view`; ctx = {args, me, go, api}. Return a Promise (the page
              is "ready" when it resolves) or {ready, destroy}. URLs are #name/arg1/arg2.
   Server:  UI.api(fn, ...args) -> Promise of the server function's return value. A reply of
              {ok: false, error} rejects with that message (shown as a toast unless you .catch it).
            UI.apiQuiet(fn, ...args) is the same without Anvil's loading spinner.
   Auth:    UI.auth('login'|'signup'|'reset'|'logout', {...}) -> Promise of {ok, me, message}
   Helpers: UI.esc, UI.icon, UI.toast, UI.modal, UI.confirm, UI.busy, UI.formData, UI.fmtDate, UI.ago,
            UI.store, UI.setTheme, UI.feedback, UI.go, UI.refresh
   Tests:   window.UI_READY is true when the current page has finished loading. */
(function () {
  'use strict';
  if (window.UI && window.UI.__v) return;
  var UI = window.UI = { __v: 1, pages: {}, me: null, config: { name: 'App', key: 'app', home: 'home', landing: 'landing' } };
  window.UI_READY = false;

  UI.configure = function (cfg) { Object.keys(cfg).forEach(function (k) { UI.config[k] = cfg[k]; }); };

  /* ------------------------------------------------------------------ small helpers */
  UI.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  UI.plural = function (n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); };
  UI.initials = function (name) {
    var p = String(name || '?').trim().split(/\s+/);
    return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  };
  UI.fmtDate = function (iso, opts) {
    if (!iso) return '';
    var d = iso.length <= 10 ? new Date(iso + 'T12:00:00') : new Date(iso);
    return d.toLocaleDateString(undefined, opts || { day: 'numeric', month: 'short', year: 'numeric' });
  };
  UI.fmtDateTime = function (iso) {
    return iso ? new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
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
  UI.store = {
    get: function (k, dflt) { try { var v = localStorage.getItem(UI.config.key + '.' + k); return v == null ? dflt : JSON.parse(v); } catch (e) { return dflt; } },
    set: function (k, v) { try { localStorage.setItem(UI.config.key + '.' + k, JSON.stringify(v)); } catch (e) {} }
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
  /* Disable a button while a Promise runs; returns the Promise. */
  UI.busy = function (btn, promise) {
    if (!btn) return promise;
    btn.disabled = true; btn.classList.add('is-busy');
    var done = function () { btn.disabled = false; btn.classList.remove('is-busy'); };
    promise.then(done, done);
    return promise;
  };

  var ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18 14.7c2.2.6 3.5 2.4 3.5 5.3"/>',
    sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z"/>',
    bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    back: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    bug: '<rect x="7" y="8" width="10" height="12" rx="5"/><path d="M12 8V5M9 5.5 7.5 4M15 5.5 16.5 4M7 13H3M21 13h-4M7.5 18l-3 2M16.5 18l3 2M7.5 9.5l-3-2M16.5 9.5l3-2"/>',
    bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    inbox: '<path d="M3 13h5l1.5 3h5L16 13h5"/><path d="M5 5h14l2 8v6H3v-6z"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
    database: '<ellipse cx="12" cy="5.5" rx="7.5" ry="2.5"/><path d="M4.5 5.5v13c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5v-13"/><path d="M4.5 12c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 20v-4h-4"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
    pin: '<path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v12H4z"/><circle cx="12" cy="13.5" r="3.5"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    filter: '<path d="M4 5h16l-6 7.5V19l-4 1.5v-8z"/>',
    more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>'
  };
  UI.ICONS = ICONS;
  UI.icon = function (name, cls) {
    return '<svg class="ui-ic ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || ICONS.sparkle) + '</svg>';
  };

  /* ------------------------------------------------------------------ toasts, modals */
  UI.toast = function (msg, kind) {
    var box = document.querySelector('.ui-toasts');
    if (!box) { box = document.createElement('div'); box.className = 'ui ui-toasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    var t = document.createElement('div');
    t.className = 'ui-toast' + (kind ? ' ' + kind : '');
    t.innerHTML = (kind === 'error' ? UI.icon('info') : kind === 'ok' ? UI.icon('check') : '') + '<span>' + UI.esc(msg) + '</span>';
    box.appendChild(t);
    setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 300); }, kind === 'error' ? 6500 : 3200);
  };
  UI.modal = function (html, opts) {
    opts = opts || {};
    var prev = document.activeElement;
    var wrap = document.createElement('div');
    wrap.className = 'ui ui-modal-wrap';
    wrap.innerHTML = '<div class="ui-modal' + (opts.wide ? ' wide' : '') + '" role="dialog" aria-modal="true">' +
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
    setTimeout(function () { (first || wrap.querySelector('.ui-modal')).focus && (first || wrap.querySelector('.ui-modal')).focus(); }, 30);
    return { el: wrap.querySelector('.ui-modal'), close: close };
  };
  UI.confirm = function (o) {
    o = typeof o === 'string' ? { title: o } : (o || {});
    return new Promise(function (resolve) {
      var answered = false;
      var m = UI.modal('<h2>' + UI.esc(o.title || 'Are you sure?') + '</h2>' + (o.text ? '<p class="muted">' + UI.esc(o.text) + '</p>' : '') +
        '<div class="ui-row end" style="margin-top:20px"><button class="ui-btn ghost" data-close>' + UI.esc(o.cancel || 'Cancel') + '</button>' +
        '<button class="ui-btn ' + (o.danger ? 'danger solid' : 'primary') + '" data-ok>' + UI.esc(o.ok || 'OK') + '</button></div>',
      { onclose: function () { if (!answered) resolve(false); } });
      m.el.querySelector('[data-ok]').onclick = function () { answered = true; m.close(); resolve(true); };
    });
  };

  /* ------------------------------------------------------------------ theme */
  UI.theme = function () { return UI.store.get('theme', 'auto'); };
  UI.applyTheme = function (t) {
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
    var dark = t === 'dark' || (t !== 'light' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('ui-dark', !!dark);
  };
  UI.setTheme = function (t) { UI.store.set('theme', t); UI.applyTheme(t); };
  UI.applyTheme(UI.theme());
  if (window.matchMedia) {
    try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { UI.applyTheme(UI.theme()); }); } catch (e) {}
  }

  /* ------------------------------------------------------------------ server bridge */
  var bridge = null;
  function send(kind, payload) {
    if (!bridge) return Promise.reject(new Error('The app is still starting.'));
    var out;
    try { out = bridge(kind, JSON.stringify(payload || {})); } catch (e) { return Promise.reject(e); }
    return Promise.resolve(out).then(function (r) {
      r = typeof r === 'string' ? JSON.parse(r) : (r || {});
      if (r.error) {
        var err = new Error(r.error); err.uiApi = true; err.denied = !!r.denied;
        if (r.detail) console.error(kind, payload && payload.fn, r.detail);
        if (r.reload) setTimeout(function () { location.reload(); }, 2500);
        throw err;
      }
      return r.result;
    });
  }
  function apiCall(quiet, fn, args) {
    return send('call', { fn: fn, args: args, quiet: quiet }).then(function (res) {
      if (res && typeof res === 'object' && res.ok === false) {
        var err = new Error(res.error || 'That didn\'t work.'); err.uiApi = true; err.expected = true; err.result = res;
        throw err;
      }
      return res;
    });
  }
  UI.api = function (fn) { return apiCall(false, fn, Array.prototype.slice.call(arguments, 1)); };
  UI.apiQuiet = function (fn) { return apiCall(true, fn, Array.prototype.slice.call(arguments, 1)); };
  /* Errors nobody caught become a toast, so a failed action is never silent. */
  window.addEventListener('unhandledrejection', function (e) {
    if (e.reason && e.reason.uiApi) { e.preventDefault(); UI.toast(e.reason.message, 'error'); }
  });

  /* Sign in / up / out. On success it navigates: to where the visitor was heading (UI.after) or home
     after signing in, to the landing page after signing out. */
  UI.auth = function (kind, payload) {
    return send(kind, payload || {}).then(function (r) {
      if (r && r.ok === false) { var err = new Error(r.error); err.uiApi = true; err.expected = true; throw err; }
      if (r && 'me' in r && (r.me || kind === 'logout')) {
        UI.me = r.me || null;
        var target = r.me ? (UI.after || '#' + UI.config.home) : '#' + UI.config.landing;
        UI.after = null;
        if (location.hash === target) route(); else location.hash = target;
      }
      return r;
    });
  };
  /* Update the signed-in user's details (e.g. a new name) and redraw the header, without reloading the page. */
  UI.setMe = function (me) {
    UI.me = me || null;
    if (shellRoot) renderChrome(current.name);
  };

  /* ------------------------------------------------------------------ pages and routing */
  UI.page = function (name, opts, mount) {
    if (typeof opts === 'function') { mount = opts; opts = {}; }
    opts.name = name; opts.mount = mount;
    UI.pages[name] = opts;
  };
  UI.allowed = function (p) {
    if (!p) return false;
    if (p.auth === 'user') return !!UI.me;
    if (p.auth === 'admin') return !!(UI.me && UI.me.is_admin);
    if (p.auth === 'guest') return !UI.me;
    return true;
  };
  UI.navPages = function () {
    return Object.keys(UI.pages).map(function (k) { return UI.pages[k]; })
      .filter(function (p) { return p.nav && UI.allowed(p) && (!p.when || p.when()); })
      .sort(function (a, b) { return (a.order || 50) - (b.order || 50); });
  };
  UI.parseHash = function () {
    var h = (location.hash || '').replace(/^#!?\/?/, '');
    var parts = h.split('?')[0].split('/').filter(function (x) { return x !== ''; }).map(decodeURIComponent);
    return { name: parts[0] || '', args: parts.slice(1) };
  };
  UI.hashFor = function (name) {
    var args = Array.prototype.slice.call(arguments, 1).filter(function (a) { return a != null && a !== ''; });
    return '#' + [name].concat(args.map(encodeURIComponent)).join('/');
  };
  UI.go = function (name) {
    var h = UI.hashFor.apply(null, arguments);
    if (location.hash === h) route(); else location.hash = h;
  };
  UI.refresh = function () { route(); };
  UI.after = null;  // where to go after signing in

  var shellRoot = null, view = null, current = { name: null, destroy: null }, routeSeq = 0;

  function defaultPage() { return UI.me ? UI.config.home : UI.config.landing; }

  function route() {
    var r = UI.parseHash(), name = r.name || defaultPage(), p = UI.pages[name];
    if (!p) { name = defaultPage(); p = UI.pages[name]; r.args = []; }
    if (p.auth === 'guest' && UI.me) { p = UI.pages[UI.config.home]; name = UI.config.home; r.args = []; }
    if ((p.auth === 'user' || p.auth === 'admin') && !UI.me) {
      UI.after = location.hash && location.hash !== '#' ? location.hash : null;
      p = UI.pages.auth; name = 'auth'; r.args = [];
    }
    if (p.auth === 'admin' && !(UI.me && UI.me.is_admin)) {
      UI.toast('That page is for admins only.', 'error');
      p = UI.pages[UI.config.home]; name = UI.config.home; r.args = [];
    }
    var seq = ++routeSeq;
    window.UI_READY = false;
    if (current.destroy) { try { current.destroy(); } catch (e) { console.error(e); } }
    current = { name: name, args: r.args, destroy: null };
    if (shellRoot) {
      shellRoot.className = 'ui ui-shell page-' + name + (UI.me ? ' signed-in' : ' signed-out') + (p.chrome === false ? ' no-chrome' : '');
      renderChrome(name);
    }
    // A fresh element for every page, so listeners a page adds to `view` never pile up.
    var fresh = view.cloneNode(false);
    view.parentNode.replaceChild(fresh, view);
    view = fresh;
    window.scrollTo(0, 0);
    document.title = (p.title ? (typeof p.title === 'function' ? p.title(r.args) : p.title) + ' · ' : '') + UI.config.name;
    var ctx = { name: name, args: r.args, me: UI.me, go: UI.go, api: UI.api, page: p };
    var out;
    try { out = p.mount(view, ctx); } catch (e) { console.error(e); out = Promise.reject(e); }
    var ready = out && typeof out.then === 'function' ? out : (out && out.ready) || Promise.resolve();
    if (out && out.destroy) current.destroy = out.destroy;
    Promise.resolve(ready).then(function () { if (seq === routeSeq) window.UI_READY = true; },
      function (e) {
        if (seq !== routeSeq) return;
        console.error(e);
        if (!view.innerHTML) view.innerHTML = '<div class="ui-wrap"><div class="ui-empty">' + UI.icon('info') +
          '<h3>This page didn\'t load</h3><p class="muted">' + UI.esc(e && e.message || 'Something went wrong.') + '</p>' +
          '<button class="ui-btn" onclick="UI.refresh()">Try again</button></div></div>';
        window.UI_READY = true;
      });
  }
  UI.current = function () { return current; };

  /* The shell's parts come from web/app.js: UI.shell = {header(me, active), footer(me), tabbar(me, active)} */
  function renderChrome(active) {
    var S = UI.shell || {};
    var hd = shellRoot.querySelector('[data-ui-header]'), ft = shellRoot.querySelector('[data-ui-footer]'), tb = shellRoot.querySelector('[data-ui-tabbar]');
    if (hd) hd.innerHTML = S.header ? S.header(UI.me, active) : '';
    if (ft) ft.innerHTML = S.footer ? S.footer(UI.me, active) : '';
    if (tb) tb.innerHTML = S.tabbar ? S.tabbar(UI.me, active) : '';
  }
  UI.renderChrome = function () { if (shellRoot) renderChrome(current.name); };

  /* Called by client_code/Main.py (and by the local harness) once the page is up. */
  UI.start = function (node, bridgeFn, bootJson) {
    bridge = bridgeFn;
    var boot = typeof bootJson === 'string' ? JSON.parse(bootJson || '{}') : (bootJson || {});
    UI.me = boot.me || null;
    var host = node && node.matches && node.matches('[data-ui-app]') ? node : (node && node.querySelector('[data-ui-app]')) || node || document.body;
    host.innerHTML = '<div class="ui ui-shell">' +
      '<header class="ui-header" data-ui-header></header>' +
      '<main class="ui-main" data-ui-view></main>' +
      '<footer class="ui-footer" data-ui-footer></footer>' +
      '<nav class="ui-tabbar" data-ui-tabbar aria-label="Main"></nav></div>';
    shellRoot = host.firstChild;
    view = host.querySelector('[data-ui-view]');
    if (UI.shell && UI.shell.wire) UI.shell.wire(shellRoot);
    window.addEventListener('hashchange', route);
    route();
  };

  /* ------------------------------------------------------------------ feedback (footer + menu)
     All feedback goes to Prepsto. The widget tag in head.html (data-prepsto="CODE") slides its panel in;
     any [data-feedback] or [data-prepsto-open] element opens it. If the widget hasn't loaded, the panel opens in a new tab.
     There is no in-app feedback form any more: Admin -> Feedback only lists older messages (and app requests). */
  UI.feedback = function () {
    if (window.Prepsto && window.Prepsto.open) { window.Prepsto.open(); return; }
    var tag = document.querySelector('script[data-prepsto]');
    var code = tag && tag.getAttribute('data-prepsto');
    if (code && code.indexOf('__') !== 0) window.open('https://prepsto.com/#f/' + encodeURIComponent(code), '_blank', 'noopener');
    else UI.toast('Feedback is not set up yet.', 'error');
  };

  /* Shared clicks: [data-go="page/arg"], [data-feedback], [data-theme-set] anywhere in the app. */
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-go],[data-feedback],[data-theme-set]');
    if (!el) return;
    if (el.hasAttribute('data-go')) { e.preventDefault(); UI.go.apply(null, el.getAttribute('data-go').split('/')); }
    else if (el.hasAttribute('data-feedback')) { e.preventDefault(); UI.feedback(el.getAttribute('data-feedback') || null); }
    else if (el.hasAttribute('data-theme-set')) { e.preventDefault(); UI.setTheme(el.getAttribute('data-theme-set')); if (UI.shell && UI.shell.onTheme) UI.shell.onTheme(); }
  });
})();


/* app.js: this app's identity and frame: name, header, footer, phone tab bar.
   Pages live in web/pages/*.html. The engine (window.UI) is web/core.js. */
(function () {
  'use strict';
  UI.configure({
    name: 'OScreenplay',
    key: 'oscreenplay',          // prefix for this app's browser storage
    tagline: "A writer's room for one. Sparks, characters, timelines, pages.",   // footer line
    home: 'home',                // first page after signing in
    landing: 'landing'           // first page for visitors who aren't signed in
  });

  var esc = UI.esc;

  function brand() {
    return '<a class="ui-brand" href="#" data-go="' + (UI.me ? UI.config.home : UI.config.landing) + '" aria-label="' + esc(UI.config.name) + ' home">' +
      '<img src="_/theme/icon.svg" alt="" width="32" height="32"><span><b>O</b>Screenplay</span></a>';
  }

  function themeSwitch() {
    var t = UI.theme();
    return '<div class="ui-seg" role="group" aria-label="Appearance">' + [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']].map(function (o) {
      return '<button type="button" data-theme-set="' + o[0] + '" class="' + (t === o[0] ? 'on' : '') + '">' + o[1] + '</button>';
    }).join('') + '</div>';
  }

  function userMenu(me) {
    return '<div class="ui-menu" data-menu hidden>' +
      '<div class="ui-menu-head"><strong>' + esc(me.name) + '</strong><span class="muted small">' + esc(me.email) + '</span></div>' +
      '<a href="#profile" data-go="profile">' + UI.icon('user') + 'Your profile</a>' +
      (me.is_admin ? '<a href="#admin" data-go="admin">' + UI.icon('shield') + 'Admin</a>' : '') +
      '<div class="ui-menu-block"><span class="small muted">Appearance</span>' + themeSwitch() + '</div>' +
      '<button type="button" data-feedback>' + UI.icon('chat') + 'Submit feedback</button>' +
      '<button type="button" data-lk-open="overview">' + UI.icon('lock') + 'Privacy &amp; Terms</button>' +
      '<button type="button" data-signout>' + UI.icon('logout') + 'Sign out</button></div>';
  }

  UI.shell = {
    header: function (me, active) {
      var nav = UI.navPages();
      return '<div class="ui-header-in">' + brand() +
        (me ? '<nav class="ui-nav" aria-label="Main">' + nav.map(function (p) {
          return '<a href="#' + p.name + '" class="' + (p.name === active ? 'on' : '') + '">' + UI.icon(p.icon) + '<span>' + esc(p.nav) + '</span></a>';
        }).join('') + '</nav>' : '') +
        '<div class="ui-header-right">' +
        (me ? '<button type="button" class="ui-avatar-btn" data-menu-toggle aria-label="Your account" aria-haspopup="true">' + esc(UI.initials(me.name)) + '</button>' + userMenu(me)
          : (active === 'auth' ? '' : '<a class="ui-btn ghost" href="#auth" data-go="auth">Sign in</a><a class="ui-btn primary" href="#auth/signup" data-go="auth/signup">Get started</a>')) +
        '</div></div>';
    },
    footer: function (me) {
      return '<div class="ui-footer-in"><div class="ui-footer-brand">' + brand() + '<p class="muted small">' + esc(UI.config.tagline) + '</p></div>' +
        '<div class="ui-footer-links">' +
        '<a href="#landing" data-go="landing">About</a>' +
        '<a href="#learn" data-go="learn">Learn screenwriting</a>' +
        '<a href="https://prepsto.com/#f/bz9rpjj" target="_blank" rel="noopener" data-prepsto-open>Submit feedback</a>' +
        '<button type="button" data-lk-open="overview">Privacy &amp; Terms</button>' +
        '</div><p class="ui-footer-legal small muted">© ' + new Date().getFullYear() + ' ' + esc(UI.config.name) + '</p></div>';
    },
    tabbar: function (me, active) {
      var nav = UI.navPages();
      if (!me || nav.length < 2) return '';
      return nav.slice(0, 4).map(function (p) {
        return '<a href="#' + p.name + '" class="' + (p.name === active ? 'on' : '') + '">' + UI.icon(p.icon) + '<span>' + esc(p.nav) + '</span></a>';
      }).join('') + '<a href="#profile" class="' + (active === 'profile' ? 'on' : '') + '">' + UI.icon('user') + '<span>You</span></a>';
    },
    wire: function (root) {
      root.addEventListener('click', function (e) {
        var t = e.target.closest('[data-menu-toggle]');
        var menu = root.querySelector('[data-menu]');
        if (t && menu) { menu.hidden = !menu.hidden; t.setAttribute('aria-expanded', String(!menu.hidden)); return; }
        if (e.target.closest('[data-signout]')) { UI.auth('logout').then(function () { UI.toast('Signed out. See you soon!'); }); }
        if (menu && !menu.hidden && !e.target.closest('[data-menu] .ui-seg')) menu.hidden = true;
      });
      document.addEventListener('keydown', function (e) {
        var menu = root.querySelector('[data-menu]');
        if (e.key === 'Escape' && menu) menu.hidden = true;
      });
    },
    onTheme: function () {  // redraw the menu's Auto/Light/Dark buttons and keep the menu open
      var menu = document.querySelector('[data-menu]'), open = menu && !menu.hidden;
      UI.renderChrome();
      if (open) document.querySelector('[data-menu]').hidden = false;
    }
  };
})();


/* ===== _data.html ===== */
(function () {
  'use strict';
  var OS = window.OS = window.OS || {};

  function P(list) {
    return list.map(function (s) {
      var p = s.split('|');
      return { t: p[0].trim(), g: (p[1] || '').trim() ? p[1].trim().split(/\s+/) : [], x: (p[2] || '').trim(), y: (p[3] || '').trim() };
    });
  }
  // Idea decks: "title|description|tags|extra"
  function D(list) {
    return list.map(function (s) {
      var p = s.split('|');
      return { t: p[0].trim(), d: (p[1] || '').trim(), g: (p[2] || '').trim() ? p[2].trim().split(/\s+/) : [], x: (p[3] || '').trim() };
    });
  }
  OS.parseItems = P;

  OS.GENRES = [
    ['dr', 'Drama', 'Characters under pressure, choices with weight. The arc is internal.', 'A personal crisis, relationships tested, a real cost.'],
    ['co', 'Comedy', 'A flawed hero with a big want and escalating trouble. Truth delivered by surprise.', 'Rule of three. Make things worse, not darker. Let characters be wrong with total conviction.'],
    ['cr', 'Crime', 'Rules broken, loyalties tested, consequences you can\'t outrun.', 'The family or the crew, the job, the betrayal, the price.'],
    ['th', 'Thriller', 'Danger, a clock, and a hero always one step behind.', 'Suspense over surprise: the audience knows more than the hero.'],
    ['ho', 'Horror', 'Fear is the engine; what the monster means matters more than how it looks.', 'Isolation, clear rules for the threat, a final face-to-face with the thing (or the self).'],
    ['sf', 'Science fiction', 'A "what if" about technology, society or time.', 'One big rule, explored to its consequences. Humanity tested by the new.'],
    ['fa', 'Fantasy', 'Magic with rules and costs.', 'A world bible, the cost of power, a chosen (or unchosen) hero.'],
    ['ro', 'Romance', 'Two people and one obstacle, usually themselves.', 'Meet-cute, forced proximity, the dark moment, the grand gesture.'],
    ['fm', 'Family', 'For every age. Heart first.', 'Clear wants, warm humour, a lesson that never feels like a lecture.'],
    ['ac', 'Action', 'Physical conflict with clear goals and clear geography.', 'Set pieces that escalate; every fight reveals character.'],
    ['my', 'Mystery', 'A question the audience badly wants answered.', 'Fair-play clues, red herrings, a reveal that changes everything before it.'],
    ['we', 'Western', 'Frontiers, codes, and the law against the lawless.', 'Big landscapes, a moral code, the showdown.']
  ];
  OS.GENRE = {};
  OS.GENRES.forEach(function (g) { OS.GENRE[g[0]] = { key: g[0], name: g[1], about: g[2], conventions: g[3] }; });

  /* ======================================================================== Spark slot pools */
  var S = OS.S = {};
  S.setting = P([
    'In a sleepy dairy village|co fa ro fm', 'In a drowned seaside town|dr my ho', 'On the last night of a dying carnival|dr ho fa',
    'Aboard a generation ship that forgot where it\'s going|sf dr', 'In a Montréal laundromat that never closes|co dr ro',
    'In a border town where the river keeps moving|we dr cr', 'Inside a luxury bunker built for billionaires|th sf co',
    'At a ski resort the week before it closes forever|dr co ro', 'In a monastery that brews the world\'s strongest beer|co dr',
    'On a container ship stuck in a canal for forty days|th dr co', 'In a suburb where every lawn is judged|co fm',
    'In a 1970s radio station behind the Iron Curtain|dr th', 'Deep inside a theme park after closing time|ho co fm',
    'In a city where it has rained for nine years|sf my dr', 'In the back kitchen of a famous restaurant|dr co ro',
    'On a remote Arctic research station|th ho sf', 'In a nursing home with a secret poker ring|co dr',
    'In a desert motel on an empty highway|we cr th', 'Inside a high school during the final week of senior year|co dr ro fm',
    'In a kingdom where lying is physically impossible|fa co', 'In an abandoned shopping mall turned into a village|sf dr fm',
    'In a fishing harbour run by one family for a century|cr dr', 'On a reality show filmed on a deserted island|co th',
    'In the waiting room of the afterlife|fa co dr', 'In 1920s Paris, in a jazz club with no licence|dr ro cr',
    'On an island that only appears at low tide|fa my ho', 'On the night shift at a diner on the Moon|sf co',
    'In an Alpine village that elects a new mayor every winter|co dr', 'In a megachurch the week of its biggest scandal|dr co',
    'In a forest that rearranges itself every night|fa ho fm', 'In a hospital where nobody is allowed to die on Sundays|fa dr co',
    'Inside a family-run funeral home|co dr', 'In a forgotten underground metro line|sf th ac', 'At a wedding that lasts three days|co ro dr',
    'In a prison library|dr cr', 'On a sheep farm at the edge of the world|dr fm ro', 'In a casino that never closes|cr th',
    'In a hurricane shelter during the storm of the century|th dr', 'Inside a virtual afterlife run by a startup|sf co',
    'In a cursed opera house|ho dr fa', 'In a small-town cinema on its final night|dr fa ro', 'In a vineyard during the worst frost in fifty years|dr ro fm',
    'On a cruise ship where someone goes missing every night|my th co', 'In a border checkpoint between two invented countries|co dr th'
  ]);
  S.adj = P([
    'lonely||E- N+', 'washed-up||N+ C-', 'overconfident||E+ A- N-', '400-year-old||O+', 'recently divorced||N+', 'nine-year-old||O+ C-',
    'painfully shy||E- N+', 'retired||C+', 'disgraced||N+ A-', 'hopelessly romantic||O+ A+ N+', 'chronically late||C-', 'ruthless||A- C+',
    'kind-hearted||A+', 'paranoid||N+ O-', 'newly widowed||N+ E-', 'ambitious||C+ E+', 'lazy||C-', 'fearless||N- E+', 'superstitious||O- N+',
    'bored||O+ C-', 'honest-to-a-fault||A+ C+', 'charming||E+ A+', 'grumpy||A- E-', 'over-caffeinated||E+ N+', 'small-town||O-',
    'former child-star||E+ N+', 'incurably curious||O+', 'fiercely loyal||A+ C+', 'burned-out||N+ C-', 'rule-obsessed||C+ O-',
    'free-spirited||O+ C-', 'secretly brilliant||O+ E-', 'very polite||A+ C+', 'heartbroken||N+', 'aging||C+', 'newly elected||E+ C+',
    'exiled||N+', 'unemployed||C-', 'self-help-addicted||N+ O+', 'stubborn||A- C+', 'sleep-deprived||N+ C-', 'gentle||A+ N-'
  ]);
  S.hero = P([
    'vampire|ho fa co ro', 'farmer|dr fm co we', 'wedding DJ|co ro', 'lighthouse keeper|dr my fa', 'android nanny|sf fm dr', 'surgeon|dr th',
    'nun|dr co cr', 'ghost|ho fa co ro', 'detective|cr my th', 'sheriff|we cr', 'astronaut|sf dr', 'chef|co dr ro', 'pop star|dr co',
    'magician|fa co my', 'hitman|cr th co ac', 'kindergarten teacher|co fm dr', 'dragon|fa fm co', 'taxi driver|dr cr co',
    'funeral director|co dr', 'grandmother|fm co dr', 'insurance adjuster|co th', 'deep-sea diver|th dr sf', 'AI assistant|sf co th',
    'beekeeper|dr fm', 'con artist|cr co', 'librarian|my co ro', 'prince|fa ro co', 'werewolf|ho fa co', 'boxer|dr ac', 'translator|th dr ro',
    'chess prodigy|dr th', 'ice-cream truck driver|co fm', 'wrestler|co dr ac', 'priest|dr ho', 'spy|th ac ro', 'witch|fa ho co',
    'cowboy|we co', 'barista|co ro', 'submarine captain|th ac', 'zookeeper|co fm', 'mail carrier|co dr fm', 'robot|sf fm co',
    'journalist|th dr cr', 'puppeteer|ho co dr', 'pirate|ac fa co', 'mayor|co dr', 'projectionist|dr fa ro', 'smuggler|cr ac',
    'night nurse|dr', 'ballet dancer|dr ro', 'marine biologist|dr sf cr', 'stand-up comedian|co dr'
  ]);
  S.want = P([
    'falls in love with a cow|co fa ro', 'wants to win the county pie contest|co fm', 'must deliver a coffin across three borders|th co cr',
    'sets out to find their missing twin|my dr th', 'tries to save the family restaurant|dr co fm', 'plans one last heist|cr th ac',
    'wants to be the first to reach the summit|ac dr', 'promises to throw the perfect funeral|co dr', 'needs to pass a driving test by Friday|co',
    'tries to win back their ex at a wedding|ro co', 'searches for the person who stole their name|th my sf', 'wants to become truly human|sf fa fm',
    'keeps a dying town\'s radio station on air|dr co', 'tries to prove a murder nobody reported|my cr th', 'plans to escape the island|th ac',
    'wants their father\'s approval|dr fm', 'protects a witness who won\'t stop talking|cr co ac', 'dreams of opening a jazz club|dr ro',
    'vows to break an ancient curse|fa ho', 'decides to run for mayor|co dr', 'needs to pay off a debt to the wrong people|cr th',
    'wants to adopt a child|dr fm', 'tries to steal back a painting their grandmother made|cr co', 'needs to know what\'s behind the locked door|ho my',
    'wants the whole world to forget one embarrassing video|co sf', 'chases a legendary fish|dr co we', 'reunites a broken band for one last show|co dr',
    'seeks revenge for a burned-down home|we ac dr', 'wants to stay invisible until graduation|co dr fm', 'sets out to bury their father where he was born|dr fm',
    'fights to keep custody of a talking dog|co fm fa', 'wants to be remembered|dr', 'hunts for a cure before the next full moon|ho fa th',
    'tries to sell the haunted family house|ho co', 'wants one perfectly normal day|co dr sf', 'searches the sky for a signal only they heard|sf dr',
    'plans the perfect surprise party for an enemy|co', 'keeps the old cinema open one more night|dr fa ro', 'wants to take over the family business|cr dr'
  ]);
  S.obstacle = P([
    'can\'t fight off a jealous bull|co fa ro|the bull', 'keeps losing to a rival who never sleeps|co dr ac|the rival',
    'is hunted by a debt collector with a sense of humour|cr co th|the debt collector', 'is haunted by a voice nobody else can hear|ho th my|the voice',
    'has a mother who sabotages everything with love|co dr fm|the mother', 'is trapped by a contract they never read|co dr cr|the contract',
    'keeps losing to a machine that learns from them|sf th|the machine', 'can\'t get past a guard who knows their secret|th cr|the guard',
    'has an arch-enemy who is also their best friend|co dr|the best friend', 'is followed by a storm that won\'t leave|fa dr th|the storm',
    'has the whole town betting against them|co dr we|the town', 'is blackmailed by someone who has the photos|th cr|the blackmailer',
    'forgets everything at midnight|sf fa ro|the forgetting', 'has a reflection that acts on its own|ho fa|the reflection',
    'is up against a corporation that owns the water|dr th sf|the corporation', 'can\'t stop telling the truth|co fa|the truth',
    'is shadowed by a detective who\'s always one step ahead|cr th my|the detective', 'has a twin who wants the same life|dr th|the twin',
    'keeps waking up on the same terrible morning|fa co sf|the morning', 'is being replaced, piece by piece, by a better version|sf ho|the better version',
    'must get past a bureaucrat who loves rules|co dr|the bureaucrat', 'has a gang that wants them back|cr ac dr|the gang',
    'is forgotten by everyone they meet|fa ro dr|the curse', 'is outmatched by a wolf pack that hunts by moonlight|ho ac we|the wolves',
    'has an ex who is suddenly the boss|co ro|the ex', 'is trapped in a house that keeps moving its rooms|ho my|the house',
    'competes with a celebrity who wants the same thing|co dr|the celebrity', 'has a body that is slowly turning to glass|fa sf dr|the glass',
    'is up against a developer who already bought the building|dr co|the developer', 'is opposed by a rival family that wants the harbour|cr dr|the rival family'
  ]);
  S.twist = P([
    'the {hero} realizes {enemy} was never there at all', '{enemy} turns out to be the {hero}\'s long-lost sibling',
    'the {hero} discovers {enemy} has been protecting them all along', '{enemy} wants exactly the same thing, for the same reason',
    'the {hero} finds out they caused all of it years ago', '{enemy} disappears, and everything gets much worse',
    'the thing the {hero} wanted turns out to be a trap', 'the {hero}\'s mentor turns out to be working for {enemy}',
    'the {hero} wins, and loses everyone who mattered', '{enemy} comes to the {hero} begging for help',
    'the {hero} learns they\'ve been a ghost the whole time', 'everyone else knew the secret from the start',
    'the {hero} has to become {enemy} to win', 'it turns out the whole town is in on it', '{enemy} is the {hero}\'s own future self',
    'the {hero}\'s best friend switches sides', 'the prize was destroyed decades ago', 'the {hero} realizes they\'re in love with {enemy}',
    'the {hero} finds a letter that changes everything', '{enemy} was only a symptom of something much bigger',
    'the {hero} sees the whole story through {enemy}\'s eyes', 'the rules everyone followed were invented by a child',
    'the {hero} gets exactly what they asked for', 'the {hero}\'s mother arrives with the truth', '{enemy} saves the {hero}\'s life'
  ]);
  S.truth = P([
    'the real enemy was their own insecurity', 'family is whoever shows up', 'you can\'t win love, only give it',
    'growing means losing the story you tell about yourself', 'being right isn\'t the same as being good', 'home is a decision, not a place',
    'the past only has the power you give it', 'strength sometimes means asking for help', 'nothing worth keeping can be controlled',
    'forgiving isn\'t the same as forgetting', 'the monster is whoever stops listening', 'you can\'t save people who don\'t want saving',
    'ordinary days were the whole point', 'courage is just fear that keeps walking', 'winning alone is losing slowly',
    'the truth costs less the sooner you pay it', 'nobody needed them to be perfect, only present', 'some doors are meant to stay closed',
    'what you run from follows you', 'love looks different on everyone', 'you become what you refuse to look at',
    'a legacy is what you leave in people', 'change starts the day you stop waiting', 'there never was a bull, only fear'
  ]);
  S.stakes = P([
    'the village loses its last cow|co fa', 'the family name is gone for good|dr cr', 'the whole town floods|dr th', 'someone they love goes to prison in their place|cr dr',
    'they\'re erased from history|sf fa', 'the only witness disappears|my th cr', 'a war begins at sunrise|ac fa th', 'they\'ll spend forever alone|ro dr fa',
    'the band breaks up for good|co dr', 'the house goes to the bank|dr co fm', 'the base runs out of air|sf th', 'the curse passes to their child|ho fa',
    'nobody will remember the last song|dr', 'the company gets to keep their face|sf co', 'they\'ll turn into their father|dr cr'
  ]);
  S.clock = P(['sunrise', 'the harvest moon', 'the wedding', 'the last ferry leaves', 'the end of summer', 'the polls close', 'the snow melts',
    'the funeral on Sunday', 'the eclipse', 'the bank opens on Monday', 'their 40th birthday', 'the oxygen runs out', 'the final screening',
    'Christmas Eve', 'the tide comes in', 'the building is demolished']);
  S.inciting = P([
    'a stranger arrives with their name tattooed on her arm|my th', 'the town\'s only bridge collapses|dr th', 'their grandmother leaves them a key and a warning|my fa fm',
    'a cow walks into the church during mass|co', 'the lottery ticket in their pocket wins|co dr', 'the radio starts playing tomorrow\'s news|sf th my',
    'a body washes up wearing their jacket|cr my th', 'the factory closes overnight|dr co', 'the power goes out across the whole continent|th sf',
    'a letter arrives forty years late|dr ro my', 'their mother announces she\'s getting married|co fm', 'the ice cracks in the middle of the lake|th dr',
    'a famous director rents their spare room|co dr', 'a child knocks on the door claiming to be their son|dr co fm', 'their father is shot on the night of a wedding|cr dr',
    'a film reel arrives with no label|dr fa my'
  ]);
  S.titleWord = ['Bull', 'Moon', 'Harvest', 'Static', 'Salt', 'Glass', 'Midnight', 'Ash', 'Velvet', 'Thunder', 'Honey', 'Iron', 'Paper', 'Neon',
    'Ghost', 'Winter', 'Copper', 'Feather', 'Echo', 'Ember', 'Tide', 'Smoke', 'Silver', 'Orchard', 'Signal', 'Lantern', 'Marrow', 'Ribbon'];

  /* ======================================================================== idea decks (the Ideas page) */
  var L = OS.L = {};
  L.archetypes = D([
    'The Reluctant Heir|Never wanted the crown, and becomes the best (or the worst) at wearing it. Their slide is the story: watch each choice that makes it possible.|cr dr fa',
    'The Mentor|Has walked the road. Gives the hero a gift, a rule or a push, then leaves (or dies) so the hero has to stand alone.',
    'The Shadow|The dark mirror. Wants what the hero wants and will do what the hero won\'t. Strongest when they\'re right about something.',
    'The Trickster|Breaks the rules and the tension. Comic relief with a sharp edge, often the one who says the truth out loud.|co',
    'The Herald|Brings the call: a letter, a stranger, a phone call at 3 a.m. Their arrival ends the ordinary world.',
    'The Threshold Guardian|Tests whether the hero is serious. A bouncer, a bureaucrat, a parent. Beat them, befriend them or sneak past.',
    'The Shapeshifter|Loyalty and mood keep shifting, so neither the hero nor the audience knows where they stand. Great for love interests and double agents.|ro th',
    'The Ally|Walks beside the hero and reflects their better side. Give them a goal of their own or they\'ll feel like furniture.',
    'The Fallen Hero|Once the champion, now the cautionary tale. They know exactly how this ends, and that knowledge is a weapon.|dr ac',
    'The Innocent|Sees the world as it should be. Their belief either redeems the others or breaks them.|fm dr',
    'The Caregiver|Puts everyone first and quietly runs out of themselves. Their arc: learning to take.|dr fm',
    'The Rebel|Defines themselves against the system. The real question: what do they build after it falls?',
    'The Everyman|An ordinary person in an extraordinary situation, the audience\'s eyes. Make them specific or they\'ll be invisible.',
    'The Fatal Attraction|Desire as danger. Wants something the hero has, and uses the hero\'s own want to get it.|th cr ro',
    'The Loyal Lieutenant|Serves the leader without question, until the day they have to ask one.|cr ac',
    'The Outsider|Doesn\'t belong to the world of the story, so they see it more clearly than anyone inside it.',
    'The Fool|Gets everything wrong for the right reasons, and lands on wisdom by accident.|co',
    'The Ruler|Controls a kingdom: a company, a family, a kitchen. Their fear is chaos, and being replaced.|cr dr',
    'The Seeker|Restless and never at home. The arc is finding, or making, the thing they look for.',
    'The Martyr|Willing to sacrifice everything. The danger: they enjoy it a little.',
    'The Fixer|Solves everyone else\'s problems so they never have to face their own.|cr th',
    'The Prodigal|Left home and comes back changed, or pretending to be. Old wounds open on arrival.|dr fm',
    'The Witness|Saw the crime, the miracle or the truth, and has to decide what to do with it.|th my',
    'The Child Who Knows|Young, overlooked, and the only one who sees what is really going on.|fm ho fa'
  ]);
  OS.ROLES = [
    ['protagonist', 'Protagonist', 'Drives the story; we follow their want.'], ['antagonist', 'Antagonist', 'Wants the opposite, or the same thing first.'],
    ['deuteragonist', 'Deuteragonist', 'The second lead: a parallel or opposite journey.'], ['love', 'Love interest', 'Tests the hero\'s need, not just their want.'],
    ['mentor', 'Mentor', 'Teaches, then steps aside.'], ['ally', 'Ally', 'Helps, and needs something too.'], ['foil', 'Foil', 'Shows the hero by contrast.'],
    ['confidant', 'Confidant', 'The one the hero tells the truth to (so the audience hears it).'], ['trickster', 'Trickster', 'Chaos and comedy with a point.'],
    ['herald', 'Herald', 'Brings the call to adventure.'], ['guardian', 'Threshold guardian', 'Blocks the way to test commitment.'],
    ['shapeshifter', 'Shapeshifter', 'Whose side are they on?'], ['witness', 'Witness', 'Saw something that matters.'], ['supporting', 'Supporting', 'A smaller part with a clear job.']
  ];
  OS.ROLE = {};
  OS.ROLES.forEach(function (r) { OS.ROLE[r[0]] = r[1]; });

  L.occupations = D([
    'Lighthouse keeper|Solitude, ritual, weather. Who visits, and why?', 'Night-shift nurse|Sees people at their most honest, at 4 a.m.',
    'Wedding DJ|Reads every room; never part of the party.', 'Disgraced surgeon|Skill without permission to use it.', 'Funeral director|Comfortable with death, awkward with the living.',
    'Bomb technician|Calm hands; what does the calm cost?', 'Court interpreter|Speaks other people\'s truths and lies, word for word.',
    'Insurance fraud investigator|Professionally suspicious of everyone.', 'Ferry captain|Same route forever; what if they turned left?', 'Hotel concierge|Knows every guest\'s secret.',
    'Pastry chef|Precision and sweetness, under pressure.', 'Tow-truck driver|Arrives at the worst moment of strangers\' days.', 'Taxidermist|Preserves what has already gone.',
    'Child-star turned realtor|Sells dream homes; lives in a rental.', 'Beekeeper|Patience, colonies, stings.', 'Locksmith|Can open any door but their own.',
    'Stunt double|Takes the hits for someone else\'s glory.', 'Air-traffic controller|Holds hundreds of lives in their voice.', 'Radio host (overnight)|The voice lonely people talk to.',
    'Crime-scene cleaner|Erases the evidence of tragedy.', 'Marine biologist|Studies the deep; avoids depths in people.', 'Small-town mayor|Every neighbour is a constituent and a critic.',
    'Ghostwriter|Their words, other people\'s names.', 'Debt collector|Paid to be the villain of other people\'s stories.', 'Projectionist|Lives in the dark, watching other lives.',
    'Sommelier|Can name a vineyard by smell; can\'t name a feeling.', 'Dog walker to the rich|A side door into every mansion.', 'Ice-road trucker|One crack from disaster, every day.'
  ]);
  L.wounds = D([
    'Abandoned by a parent as a child|Someone who should have stayed, didn\'t.|dr fm|If I let people close, they leave.',
    'Took the blame for someone else\'s crime|They carried a punishment that belonged to someone else.|cr dr|Nobody protects me but me.',
    'Survived an accident that killed others|Survivor\'s guilt shapes every choice.|dr th|I don\'t deserve good things.',
    'Humiliated in public at the worst moment|The whole room laughed.|co dr|If I try, they\'ll laugh again.',
    'Betrayed by a best friend|The one person they trusted sold them out.|dr cr th|Trust is for fools.',
    'Grew up poor next door to the very rich|Nose pressed against the glass for years.|dr cr|Money is the only safety.',
    'Lost a child|The unspeakable loss.|dr ho|I failed the only thing that mattered.',
    'Was the golden child who could never fail|Love came with conditions: keep winning.|dr co|I\'m only worth what I achieve.',
    'Caused a tragedy by doing nothing|Froze when it mattered most.|dr th|I\'m a coward at heart.',
    'Raised in a closed community or cult|The outside world was the enemy.|dr th ho|Obedience keeps you safe.',
    'Watched a parent destroyed by love|Love ruined the strongest person they knew.|ro dr|Love makes you weak.',
    'Cheated out of an inheritance|What was theirs was taken, legally.|dr cr we|The system is rigged, so take what you can.',
    'Bullied for being different|Difference was punished every day.|dr co fm|I have to hide who I really am.',
    'Lost everything in a fire, flood or war|Home vanished overnight.|dr we|Nothing lasts, so don\'t hold on.',
    'Told they had no talent|By the one teacher who mattered.|dr co|I\'m not a real artist (or athlete, or chef).',
    'Left at the altar|In front of everyone they knew.|ro co|I\'m unlovable.',
    'Had to parent their own parents|The adult of the house at age eight.|dr fm|If I stop holding everything, it all falls apart.',
    'Failed to save someone|They arrived too late.|dr th ac|I can never fail again.',
    'Found out they were adopted, by accident|The family story was a lie.|dr fm|I don\'t really belong anywhere.',
    'Spent years in prison|Time stolen, guilty or not.|cr dr|The world owes me.',
    'Famous young, then forgotten|Peaked at twelve.|co dr|I\'m nothing without an audience.',
    'Witnessed something they could never talk about|A secret swallowed whole.|th my ho|Some truths would destroy everyone.',
    'Watched their mother go to prison for their father|The family survived because someone paid.|cr dr|If I\'m in charge, nobody I love gets hurt.'
  ]);
  L.flaws = D([
    'Pride|Can\'t admit a mistake, even when it costs everything.', 'Need for control|Has to run everything; delegating feels like falling.',
    'Cowardice|Avoids conflict until it explodes.', 'Jealousy|Measures their life against everyone else\'s.', 'Recklessness|Acts first, regrets later, repeats.',
    'Self-righteousness|Always believes they\'re the good one.', 'People-pleasing|Says yes to everyone and no to themselves.', 'Greed|Enough is never enough.',
    'Vengefulness|Keeps score and collects debts.', 'Dishonesty|Lies even when the truth would be easier.', 'Stubbornness|Once decided, never revisits.',
    'Cynicism|Expects the worst so they\'re never disappointed.', 'Naivety|Trusts everyone, learns nothing.', 'Impatience|Wants it now and skips steps.',
    'Vanity|Obsessed with image.', 'Addiction|Something (a substance, a person, a screen) runs the show.', 'Perfectionism|Nothing is ever finished because nothing is ever good enough.',
    'Self-pity|Their pain is the biggest in every room.', 'Arrogance|Thinks rules and consequences are for other people.', 'Indecision|Waits for a certainty that never comes.',
    'Possessiveness|Holds on to people as if they were property.', 'Secrecy|Lives behind closed doors; even friends don\'t know them.', 'Workaholism|Hides in work from everything else.',
    'Short temper|Small sparks, big fires.', 'Martyrdom|Suffers loudly and refuses help.', 'Manipulation|Gets what they want by pulling strings.',
    'Laziness|Does the minimum and hopes.', 'Fear of commitment|Always has one foot out of the door.', 'Obsession|One thing matters, and everything else burns for it.'
  ]);
  L.lies = D([
    'I\'m only lovable if I\'m useful|', 'Showing feelings is weakness|', 'The world is dangerous, so stay small|', 'If I\'m in charge, nobody gets hurt|',
    'I have to earn rest|', 'Everybody leaves eventually|', 'Being good means being quiet|', 'Success will fill the emptiness|', 'I\'m the only one who can fix this|',
    'It\'s too late for me to change|', 'My worth is how I look|', 'People like me don\'t get happy endings|', 'If they knew the real me, they\'d go|',
    'Anger keeps me safe|', 'The past decides the future|'
  ]);
  L.fears = D([
    'Abandonment|Being left, again.', 'Being ordinary|A life nobody notices.', 'Failure|Trying and not being enough.', 'Losing control|Chaos, and someone else at the wheel.',
    'Intimacy|Being truly seen.', 'Being found out|The impostor unmasked.', 'Death|Their own, or of the people they love.', 'Becoming their parent|The mirror at 50.',
    'Poverty|Going back to nothing.', 'Being forgotten|Erased once they\'re gone.', 'Betrayal|Trust used as a weapon.', 'Responsibility|Being the one it all depends on.',
    'Deep water|And what it stands for.', 'Rejection|The closed door.', 'Change|The ground moving under them.', 'Their own anger|What they might do.',
    'Commitment|Doors closing forever.', 'Powerlessness|Watching, unable to act.', 'Prison|Walls, rules, time.', 'Being alone|Silence in an empty house.'
  ]);
  L.values = D(['Loyalty|', 'Freedom|', 'Justice|', 'Family|', 'Truth|', 'Power|', 'Security|', 'Recognition|', 'Love|', 'Faith|', 'Knowledge|', 'Honour|',
    'Independence|', 'Beauty|', 'Tradition|', 'Adventure|', 'Kindness|', 'Wealth|', 'Order|', 'Creativity|']);
  L.motivations = D([
    'Revenge|Someone has to pay. Scenes: planning, the target\'s humanity showing, the moment of choice.', 'Redemption|Make up for a past wrong. Scenes: the debt remembered, the chance to repay.',
    'Survival|Stay alive, or keep the family alive. Scenes: scarcity, impossible choices.', 'Love|Win, keep or protect someone. Scenes: closeness, distance, the gesture.',
    'Greed|More. Scenes: the score, the split, the double-cross.', 'Duty|Because it\'s their job or their blood. Scenes: orders against conscience.',
    'Curiosity|Need to know. Scenes: clues, forbidden doors, the answer that costs.', 'Belonging|Find the tribe. Scenes: auditions, outsider moments, being chosen.',
    'Recognition|Be seen as great. Scenes: rivals, applause, the empty room after.', 'Justice|Make it right. Scenes: evidence, the system failing, taking it into their own hands.',
    'Protecting family|Whatever it takes. Scenes: threats at home, compromises, the line crossed.', 'Proving someone wrong|Usually a parent. Scenes: the phone call, the trophy, the silence.',
    'Guilt|Can\'t live with what they did. Scenes: avoidance, confession, atonement.', 'Legacy|Leave something behind. Scenes: heirs, monuments, the cost to the living.',
    'Escape|Get out: of the town, the marriage, the life. Scenes: plans, the last night, the turn back.', 'Ambition|Rise. Scenes: ladders, sacrifices, who gets left below.',
    'Faith|Serve something bigger. Scenes: doubt, signs, the test.', 'Obsession|One thing, everything. Scenes: neglect, collapse, the moment it\'s in reach.'
  ]);
  L.secrets = D(['Has a second family in another city|', 'Was the one who called the police|', 'Can\'t read|', 'Isn\'t really a doctor|', 'Is the anonymous author everyone hates|',
    'Started the fire that burned the old house|', 'Is in love with their best friend\'s partner|', 'Has six months to live|', 'Already spent the inheritance|',
    'Was a child star under another name|', 'Works for the other side|', 'Didn\'t really win the medal|', 'Knows where the body is buried|', 'Is broke behind all the luxury|',
    'Has been sending money to their enemy|', 'Lied about their age for twenty years|', 'Faked their own death once before|', 'Is the child\'s real parent|',
    'Still talks to their dead brother every night|', 'Has never been to the country they say they\'re from|']);
  L.quirks = D(['Hums show tunes when lying|', 'Counts steps everywhere|', 'Collects strangers\' lost gloves|', 'Eats dessert first|', 'Only wears one colour|',
    'Names every car they own|', 'Talks to plants, formally|', 'Can\'t sleep without the radio on|', 'Keeps a pocketknife in every coat|', 'Laughs at funerals|',
    'Corrects everyone\'s grammar|', 'Never sits with their back to a door|', 'Writes everything in a tiny notebook|', 'Carries snacks for strangers|',
    'Answers the phone with their full name|', 'Flips a lucky coin for every decision|', 'Knows every train timetable by heart|', 'Wears sunglasses indoors|',
    'Cooks when angry|', 'Wears a wedding ring on a chain|', 'Whistles in empty rooms|', 'Can\'t stand a crooked picture frame|']);
  L.voices = D([
    'Answers questions with questions|Deflects and probes; never commits.||Why would you want to know that?',
    'Short, clipped sentences|Economical and hard: military, or just tired.||Car\'s outside. Get in.',
    'Over-explains everything|Nervous and kind; fills every silence.||What I mean, and it\'s not bad, is that it\'s slightly, a little bit, on fire.',
    'Quotes their mother constantly|Lives by inherited rules.||My mother always said: never trust a man with clean boots.',
    'Formal words in casual places|Old-fashioned, precise, a little lonely.||I find your proposal agreeable. Also, the pizza is here.',
    'Jokes when scared|Humour as armour.||Great. A haunted basement. Love that for us.',
    'Says what you\'ll do, never what they feel|Commanding subtext.||You\'ll stay for dinner.',
    'Talks in sports metaphors|Everything is a game, a play, a season.||We\'re down two in the ninth and you want to bunt?',
    'Speaks softly so people lean in|Power through quiet.||Sit. Closer. I\'m only saying this once.',
    'Mixes two languages mid-sentence|Code-switching shows who they\'re with.||Oui, oui, I\'ll be there, but tell your brother he owes me.',
    'Lists things in threes|An orderly mind with a persuasive rhythm.||We need water, rope, and a very good excuse.',
    'Repeats your words back to you|Stalling, or listening very hard.||"Not a big deal." Not a big deal?',
    'Drifts into the past|Lives in memories.||Back in \'74, this whole street was cherry trees.',
    'Blunt, zero filter|Says the unsayable.||Your haircut is a cry for help.',
    'Polite to power, sharp with everyone else|Shows the pecking order in one breath.||Of course, sir. (turning) You. Coffee. Now.'
  ]);
  L.conditions = D([
    'Insomnia|Days blur and perception slips.||Good for paranoid thrillers and time pressure.', 'Retrograde amnesia|Lost the past, kept the skills.||An identity mystery: who were they?',
    'Early-onset dementia|Losing memories one by one.||A ticking clock on every relationship; a heartbreaking point of view.', 'Chronic pain|Every action has a cost.||Shows will and limits. Don\'t reduce it to a metaphor.',
    'PTSD|The past breaks into the present.||Triggers create scene turns. Research it and portray it with care.', 'OCD|Rituals that hold back unbearable thoughts.||Show the inside, never the punchline.',
    'Terminal diagnosis|Time is finite, and now they know it.||The ultimate ticking clock; it reorders every priority.', 'Face blindness|Can\'t recognise faces.||Brilliant for mysteries and mistaken identity.',
    'Narcolepsy|Falls asleep without warning.||Comedy, danger and vulnerability in one.', 'Agoraphobia|The outside world is a threat.||Contained stories where the front door is the threshold.',
    'Synesthesia|Hears colours, tastes words.||Visual storytelling gold.', 'Haemophilia|A small cut is a big risk.||Raises the stakes of every action scene.',
    'Type 1 diabetes|Life runs on insulin and timing.||Real, physical ticking clocks.', 'Deafness|Lives in a visual language.||Sign-language scenes; cast authentically.',
    'Tinnitus|A ringing nobody else hears.||Sound design becomes character.', 'Stutter|Words fight their way out.||Gives dialogue rhythm. Never make it the joke.',
    'Addiction in recovery|Every day is a choice.||Temptation scenes; a relapse can be the midpoint or the low point.', 'Heart condition|Excitement could kill them.||Comic and dramatic stakes at once.',
    'Severe allergy|One peanut is a weapon.||A perfect setup and payoff (the epinephrine pen).', 'Long grief|Not an illness, a weight carried daily.||Shapes how they react to every loss.',
    'Colour blindness|Sees a different palette.||Clues they miss, and clues only they catch.', 'Bipolar disorder|Moods with their own seasons.||Avoid cliché; show treatment and agency.',
    'Migraine with aura|Light hurts and the world flickers.||Point-of-view shots; unreliable moments.', 'Phantom limb|Feels what isn\'t there.||Shows loss without saying it.',
    'Perfect autobiographical memory|Remembers every day of their life.||They can\'t forget the wound: a gift and a curse.'
  ]);
  L.conflicts = D([
    'Person vs. person|Two wills, one prize. The clearest engine in drama.', 'Person vs. self|The enemy is inside: a fear, a flaw, an addiction, a lie.',
    'Person vs. society|The hero against the rules, the town, the system.', 'Person vs. nature|Storm, sea, mountain, disease. Nature doesn\'t negotiate.',
    'Person vs. technology|The tool turns, or the hero is replaced by it.', 'Person vs. fate|Prophecy, destiny or the supernatural. Can choice beat what\'s written?',
    'Person vs. the unknown|The thing in the dark. Mystery as an enemy.'
  ]);
  L.obstacles = D([
    'A deadline moves up|', 'The key witness takes it back|', 'The money runs out|', 'A storm closes the roads|', 'The plan needs a skill they don\'t have|',
    'An ally names a price|', 'Their secret is about to come out|', 'Two goals that can\'t both be met|', 'The law is on the wrong side|', 'The person they need hates them|',
    'Their body gives out|', 'The map is wrong|', 'They\'re being watched|', 'Someone they love becomes the leverage|', 'They must lie to win|',
    'The only door is guarded by a friend|', 'Success would destroy someone else|', 'An old enemy comes back|', 'Their own rule forbids the solution|'
  ]);
  L.twists = D([
    'The ally is the enemy|Plant it early: one look, one lie that doesn\'t fit.', 'It was all in their head|Play fair: the clues must work on a second viewing.',
    'The victim is the culprit|Sympathy turned into suspicion.', 'The prize is worthless|What they really needed was the journey.',
    'Time isn\'t what it seemed|Two timelines are actually one, or one is actually two.', 'The narrator lied|Make the lie motivated, not just clever.',
    'They were the monster|The hero discovers the harm they did.', 'The dead aren\'t dead|Use it once, mean it.', 'The mentor planned it all|The guide was the puppeteer.',
    'Identity swap|Two people were each other.', 'It was a test|And the hero failed, or passed in a way nobody expected.', 'The real target was someone else|Misdirection by focus.',
    'The rescue is the trap|Help arrives, and it\'s worse.', 'The prophecy was misread|Fate was right; everyone just read it wrong.'
  ]);
  L.stakes = D([
    'Personal|Someone they love.', 'Professional|Career, reputation, life\'s work.', 'Physical|Life, health, body.', 'Moral|Who they are; the line they won\'t cross.',
    'Community|A town, a team, a family business.', 'Global|Everyone. Make it personal anyway.', 'Spiritual|Faith, soul, meaning.', 'Generational|What passes on to the children.'
  ]);
  L.macguffins = D(['A briefcase nobody opens|', 'A family recipe|', 'The master tape of an unreleased album|', 'The deed to the land|', 'A key to a seed vault|',
    'A love letter|', 'The last bottle of a legendary vintage|', 'A hard drive|', 'A stolen painting|', 'A child\'s drawing that is really a map|', 'A ring|', 'A ledger|',
    'A vaccine sample|', 'A ghost\'s last wish|', 'A trophy|', 'An urn of ashes|', 'A winning lottery ticket|', 'A forbidden book|', 'A single vote|', 'An unlabelled film reel|']);
  L.complications = D(['The phone dies.|', 'Someone recognises them.|', 'The rival arrives early.|', 'It starts to rain. Hard.|', 'A child is watching.|',
    'The car won\'t start.|', 'Their ex walks in.|', 'The alarm goes off.|', 'They\'re asked to make a speech.|', 'The expert gets food poisoning.|', 'A news crew shows up.|',
    'The dog eats the evidence.|', 'The power cuts out.|', 'Their mother calls. Twice.|', 'The door locks behind them.|', 'They get what they asked for, too soon.|',
    'Someone confesses something unrelated and huge.|', 'An earlier lie is repeated to the wrong person.|', 'A stranger needs help right now.|', 'The money is fake.|',
    'The wrong person overhears.|', 'They\'re mistaken for someone else.|', 'An old injury flares up.|', 'A gift arrives with no name on it.|', 'Somebody faints.|']);
  L.scenes = D([
    'The dinner from hell|Everyone wants something from the table. Seat enemies together, make leaving impossible, and let the subtext rise with every course.',
    'The interrogation|One wants information, the other wants to hide it. Shift the power at least twice. Whoever controls the silence wins.',
    'The confession|A secret comes out. Delay it with interruptions and false starts. The reaction matters more than the reveal.',
    'The plan|Explain the plan fast, with pictures. The audience should know enough to worry. Plans told in full usually fail.',
    'The reunion|Two people with history. Play what is NOT said, and let an object from the past do the talking.',
    'The chase|Clear geography, escalating obstacles, a choice at the end. A chase is about character: what will they give up?',
    'The breakup|Both of them are right. Write it so we can\'t pick a side.', 'The meet-cute|Opposites collide over a small object. Conflict first, attraction second.',
    'The ticking bomb|Show the bomb (real or not) to the audience before the characters see it. Suspense is information plus waiting.',
    'The temptation|Offer the hero exactly what they want, at a price that costs who they are.', 'The funeral|Grief makes people honest and ridiculous: comedy and tragedy at one table.',
    'The showdown|Hero and antagonist face to face. The outer fight must settle the inner question.', 'The quiet before|A calm scene before the storm: small talk loaded with dread.',
    'The mirror scene|The hero sees who they\'re becoming: a person, a reflection, a photograph.', 'The false victory|They win, and the audience sees the cost before they do.',
    'The return home|Back to the opening location. Show how differently the hero moves through it now.', 'The phone call|One side on screen. Use reactions and silences; cut to the other side only to twist.',
    'The montage|Time passes, skill grows. Give it a shape: start, struggle, success.', 'The cross-cut|Intercut two actions so each comments on the other: a celebration and a crime.',
    'The stranger\'s question|An outsider asks the obvious question everyone has been avoiding.'
  ]);
  L.themes = D(['Can you love your family and still stay good?|', 'Is it ever too late to change?|', 'What do we owe the people who raised us?|', 'Does power always corrupt?|',
    'Can you forgive the unforgivable?|', 'What makes a home?|', 'Is safety worth giving up freedom?|', 'Who are you when nobody is watching?|', 'Can love survive the truth?|',
    'Do we choose our fate?|', 'What is the price of ambition?|', 'Is revenge ever justice?|', 'Can you outrun your past?|', 'What makes us human?|',
    'Is it better to be loved or respected?|', 'Can one person change a system?|', 'What do we lose when we win?|', 'Are we only our memories?|',
    'When does loyalty become a cage?|', 'Is the truth always worth telling?|', 'Can we ever really leave home?|']);
  L.settings = S.setting.map(function (s) { return { t: s.t.replace(/^(In|On|At|Inside|Aboard|Deep inside) (a |an |the )?/i, function (m) { return ''; }).replace(/^./, function (c) { return c.toUpperCase(); }), d: s.t, g: s.g }; });
  L.inciting = S.inciting.map(function (s) { return { t: s.t.charAt(0).toUpperCase() + s.t.slice(1), d: 'Something happens TO the hero that they can\'t ignore.', g: s.g }; });

  OS.DECKS = [
    ['Characters', [['archetypes', 'Archetypes', 'users'], ['occupations', 'Jobs & worlds', 'grid'], ['wounds', 'Wounds', 'heart'], ['lies', 'Lies they believe', 'info'],
      ['flaws', 'Flaws', 'bug'], ['fears', 'Fears', 'moon'], ['values', 'Values', 'star'], ['secrets', 'Secrets', 'lock'], ['quirks', 'Quirks', 'sparkle'],
      ['voices', 'Voices', 'chat'], ['conditions', 'Conditions & illnesses', 'shield']]],
    ['Plot', [['motivations', 'Motivations', 'arrow'], ['conflicts', 'Kinds of conflict', 'x'], ['obstacles', 'Problems', 'filter'], ['inciting', 'Inciting incidents', 'bell'],
      ['twists', 'Twists', 'refresh'], ['stakes', 'Stakes', 'bulb'], ['macguffins', 'MacGuffins', 'inbox'], ['complications', 'Complications deck', 'more']]],
    ['World & scenes', [['settings', 'Settings', 'map'], ['themes', 'Themes', 'globe'], ['scenes', 'Scene recipes', 'camera']]]
  ];

  /* ======================================================================== relationships */
  OS.REL = [
    ['family', 'Family', '#c8102e', 'Blood or chosen. What do they owe each other that they never say?'],
    ['love', 'Love', '#e0457b', 'Who loves more? What would each give up?'],
    ['ex', 'Exes', '#a65b8a', 'What ended it, and what never did?'],
    ['friends', 'Friends', '#2f8f6b', 'What would break this friendship? Put it in the story.'],
    ['rivals', 'Rivals', '#e0a526', 'They want the same thing. Who gets it first?'],
    ['enemies', 'Enemies', '#5b2a86', 'Each thinks they\'re the hero. Write both sides.'],
    ['mentor', 'Mentor & student', '#2c6db3', 'What does the mentor need from the student?'],
    ['alliance', 'Alliance', '#3e9aa8', 'United by a goal, not by love. When does it break?'],
    ['debt', 'Debt', '#8a6d3b', 'One owes the other: money, a life, a lie. When is it called in?'],
    ['secret', 'Shared secret', '#6b6f7a', 'They both know. Who will crack first?'],
    ['boss', 'Boss & worker', '#46505e', 'Power runs one way. Does it ever flip?'],
    ['unrequited', 'Unrequited', '#d07a52', 'One loves, one doesn\'t (or doesn\'t know).'],
    ['protector', 'Protector', '#4a8a3a', 'One shields the other. From what, and at what cost?'],
    ['jealousy', 'Jealousy', '#9c8a1e', 'One wants the other\'s life.']
  ];
  OS.RELTYPE = {};
  OS.REL.forEach(function (r) { OS.RELTYPE[r[0]] = { key: r[0], name: r[1], color: r[2], q: r[3] }; });

  /* ======================================================================== the reaction engine's rules
     Each event: [key, label, icon, scene tip, responses]. A response is "what they do|rules".
     Rules: TRAIT>n:w or TRAIT<n:w (O C E A N, 0-100), field~word|word:w (flaw, fear, value, wound, lie, arc, role contain a word).
     The engine scores each response for a character and shows the top three with the reasons that matched. */
  OS.REACT = [
    ['betrayal', 'Betrayed by someone close', 'x', 'Write the moment they find out. Give their hands something to do.', [
      'Cuts them off without a word and never mentions it again.|A<40:2 E<40:2 N<50:1 flaw~pride|proud|stubborn:2',
      'Confronts them on the spot, loudly, in front of everyone.|E>60:2 A<50:1 N>60:2 flaw~temper|reckless:3',
      'Smiles, says nothing, and starts planning revenge.|C>60:2 A<40:3 flaw~veng|manipul|secre:3 value~power|honour:1',
      'Blames themself and tries harder to be worth keeping.|A>60:2 N>60:2 fear~abandon|reject:3 flaw~pleas|martyr:3',
      'Forgives out loud, but keeps the receipt.|A>55:2 C>55:2 value~loyal|family:2',
      'Turns the betrayal into leverage.|C>60:1 A<40:2 value~power|wealth:3 flaw~greed|manipul:2']],
    ['loss', 'Loses someone or something they love', 'heart', 'Grief in action: what do they DO in the first hour?', [
      'Throws themself into work and refuses to stop.|C>60:3 flaw~work|control:3 E<50:1',
      'Falls apart in public and can\'t function for days.|N>65:3 E>50:1',
      'Goes numb and handles every practical detail perfectly.|C>60:2 N<45:2 flaw~control|secre:2',
      'Looks for someone to blame, and finds them.|A<45:2 N>55:2 flaw~veng|temper|righteous:3',
      'Reaches out to the people they had pushed away.|A>60:2 E>55:1 arc~positive:2',
      'Makes a reckless, life-changing decision overnight.|O>60:2 C<45:2 flaw~reckless|impatien:3']],
    ['threat', 'Someone threatens them or their people', 'shield', 'Show the threat to the audience first, then let them react.', [
      'Strikes first, harder than they need to.|A<40:2 N>55:1 E>55:1 flaw~temper|reckless|veng:3 value~power:2',
      'Negotiates calmly, buys time and studies the enemy.|C>60:2 N<45:2 O>55:1',
      'Hides the threat from everyone to protect them.|flaw~secre|control|martyr:3 value~family:2 A>55:1',
      'Runs: packs a bag and disappears.|N>65:2 fear~death|powerless:2 flaw~coward:3',
      'Goes to the authorities, by the book.|C>60:2 A>55:1 value~justice|order|truth:3',
      'Calls in an old favour from someone dangerous.|O>50:1 value~loyal|family:2 flaw~pride:1 A<50:1']],
    ['temptation', 'Is offered exactly what they want, at a price', 'star', 'Make the offer specific, generous and quiet.', [
      'Takes it immediately and never looks back.|C<45:2 flaw~greed|impatien|addict|reckless:3',
      'Refuses on principle, and regrets it for years.|C>60:2 value~honour|truth|faith|justice:3',
      'Takes it, telling themself it\'s for someone else.|A>50:1 value~family|love:2 flaw~righteous|martyr|dishonest:2',
      'Haggles for a better price.|C>55:1 A<50:2 value~wealth|power:2',
      'Takes it in secret and builds a lie around it.|flaw~dishonest|secre:3 N>55:1',
      'Asks someone they trust what to do.|A>60:2 E>50:1 N>50:1']],
    ['humiliation', 'Is humiliated in front of others', 'users', 'Keep the camera on their face after the laugh.', [
      'Laughs it off, then cries alone in the car.|E>55:1 N>60:2 A>50:1',
      'Makes a cutting joke that turns the room on the other person.|E>60:2 A<45:2 O>55:1',
      'Walks out and cuts off everyone who saw it.|E<45:2 N>60:2 flaw~pride|vanity:3',
      'Plans a public, perfect revenge.|A<40:2 C>60:2 flaw~veng|pride:3',
      'Owns it with grace and wins the room back.|N<40:3 A>55:1 E>55:1',
      'Works obsessively to prove them wrong.|C>60:2 fear~fail|ordinary:3 flaw~perfection|work:2']],
    ['windfall', 'Gets lucky: money, fame, a big break', 'sparkle', 'Good news is a test too. Who calls first?', [
      'Shares it with everyone, generously, maybe too generously.|A>65:3 E>55:1',
      'Tells nobody and keeps living exactly the same way.|E<45:2 C>60:2 flaw~secre:2 fear~poverty|change:2',
      'Spends it fast and loud.|C<45:2 E>60:2 flaw~vanity|reckless|impatien:3',
      'Gets suspicious: what\'s the catch?|N>60:2 O<45:1 flaw~cynic|paranoi:3',
      'Uses it to settle an old score.|A<45:2 flaw~veng:3',
      'Panics that they don\'t deserve it.|N>65:2 fear~found|impostor:3 wound~survived|golden:2']],
    ['love', 'Someone declares their love', 'heart', 'Let the declaration land in the wrong place, at the wrong time.', [
      'Says it back, a little too fast.|E>60:1 A>60:2 N>55:1 flaw~pleas|naiv:2',
      'Makes a joke and changes the subject.|E>50:1 fear~intimacy|commit:3 flaw~commit:3',
      'Runs, literally or emotionally.|fear~intimacy|abandon|commit:3 N>60:2 wound~altar|abandon:2',
      'Asks for time, and really means it.|C>60:2 N<50:1',
      'Uses the confession as power over them.|A<35:3 flaw~manipul:3',
      'Is moved, and admits they\'ve felt it for years.|A>60:1 O>55:1 arc~positive:1']],
    ['accusation', 'Is accused of something, true or not', 'info', 'Let them answer a question nobody asked.', [
      'Denies everything, even the parts that are true.|flaw~dishonest|pride|stubborn:3 N>55:1',
      'Turns the accusation back on the accuser.|A<40:2 E>55:1 flaw~manipul|temper:2',
      'Confesses at once, relieved.|A>60:2 value~truth|faith:3 N>60:1',
      'Goes quiet and gathers evidence to prove their innocence.|C>65:3 N<50:1',
      'Takes the fall to protect someone else.|value~family|loyal|love:3 flaw~martyr:3 wound~blame:2',
      'Leaves town before it gets worse.|N>65:2 fear~found|prison|powerless:2']],
    ['secret', 'Discovers a secret about someone close', 'lock', 'The audience should learn it a beat before, or a beat after, them.', [
      'Keeps it, and it eats them alive.|C>55:1 A>55:1 N>60:2',
      'Tells everyone.|A<40:1 value~truth|justice:3 E>60:1',
      'Quietly keeps it as insurance.|A<40:2 C>55:1 flaw~manipul|secre:3',
      'Confronts the person privately and gives them a chance.|A>55:2 C>55:1 value~loyal|honour:2',
      'Pretends not to know, and watches.|E<45:2 O>55:1 flaw~secre:2',
      'Digs deeper and finds something worse.|O>65:3 flaw~obsess:2']],
    ['order', 'Is given an order they disagree with', 'arrow', 'Put the order in front of witnesses, so the choice is public.', [
      'Obeys to the letter and hates themself for it.|C>65:2 A>55:1 value~order|tradition|loyal:3',
      'Refuses openly, whatever it costs.|A<45:1 value~freedom|justice|truth:3 flaw~stubborn|righteous:2',
      'Says yes, then quietly does the opposite.|O>55:1 C<50:1 flaw~dishonest|secre:2',
      'Obeys, but "improves" it their own way.|O>65:2 C>50:1 flaw~pride|control:2',
      'Asks "why?" until the order falls apart.|O>60:2 N<50:1',
      'Takes it over the boss\'s head.|C>60:2 value~order|justice:2']],
    ['rival', 'A rival succeeds where they failed', 'star', 'Make them watch the rival\'s moment, up close.', [
      'Congratulates them publicly and seethes in private.|A>45:1 N>55:2 flaw~jealous|vanity:3',
      'Doubles down and works twice as hard.|C>65:3 fear~fail|ordinary:2',
      'Sabotages them.|A<35:3 flaw~jealous|veng:3',
      'Gives up and says they never really wanted it.|N>60:1 C<45:2 flaw~cynic|lazi|coward:3',
      'Asks the rival to teach them.|A>60:2 O>60:2 arc~positive:1',
      'Changes direction completely.|O>65:2 fear~ordinary:1']],
    ['plea', 'Someone desperate asks for help', 'bell', 'Make helping cost something the hero wants.', [
      'Drops everything to help, at a cost to themself.|A>65:3 flaw~pleas|martyr:2',
      'Helps, but makes sure they owe them.|A<50:1 C>55:1 value~power|wealth:2 flaw~manipul:2',
      'Refuses: "Not my problem."|A<35:3 flaw~cynic|greed:2',
      'Agrees, panics, and passes it to someone else.|N>60:2 flaw~coward|indecision:3',
      'Helps, but only on their own terms.|C>60:1 flaw~control|pride:3',
      'Sees themself in the person, and is changed by it.|O>55:1 A>55:1 arc~positive:2']]
  ];

  OS.TRAITS = [
    ['O', 'Openness', 'Practical, set in their ways', 'Curious, imaginative, restless'],
    ['C', 'Conscientiousness', 'Spontaneous, messy, late', 'Disciplined, careful, driven'],
    ['E', 'Extraversion', 'Quiet, private, recharges alone', 'Bold, talkative, needs a crowd'],
    ['A', 'Agreeableness', 'Blunt, competitive, suspicious', 'Warm, trusting, avoids conflict'],
    ['N', 'Neuroticism', 'Calm, steady, hard to rattle', 'Anxious, volatile, feels everything']
  ];

  OS.NAMES = {
    first: ['Nora', 'Bernard', 'Lucia', 'Idris', 'Mei', 'Oskar', 'Amara', 'Theo', 'Ines', 'Rafael', 'Greta', 'Kwame', 'Sasha', 'Dmitri', 'Yara', 'Hugo',
      'Priya', 'Elias', 'Marta', 'Jonah', 'Solène', 'Tomas', 'Aiko', 'Malik', 'Freya', 'Mateo', 'Odile', 'Ravi', 'Wren', 'Augustin', 'Zainab', 'Felix',
      'Imogen', 'Kofi', 'Ruth', 'Lior', 'Esme', 'Bastien', 'Noor', 'Caspar', 'Adaeze', 'Ilse', 'Mirela', 'Silas', 'June', 'Vasco', 'Bettina', 'Gus'],
    last: ['Kessel', 'Holm', 'Reyes', 'Okafor', 'Lindqvist', 'Moreau', 'Haddad', 'Novak', 'Varga', 'Castellanos', 'Brandt', 'Achebe', 'Tanaka', 'Petrov',
      'Ozola', 'Fitzgerald', 'Duarte', 'Mensah', 'Rossi', 'Abernathy', 'Kowalski', 'Nakamura', 'Ferreira', 'Halloran', 'Szabo', 'Lefebvre', 'Adeyemi',
      'Marchetti', 'Sorensen', 'Quill', 'Vance', 'Bellweather', 'Hale', 'Darrow', 'Futrell', 'Amsel', 'Iqbal', 'Delacroix', 'Mbeki', 'Grimaldi']
  };

  OS.PROMPTS = [
    'Write a scene where two people argue about a dishwasher, and it\'s really about a death.',
    'Your protagonist lies in the first line they speak. Write the scene.',
    'A character returns something they borrowed twenty years ago.',
    'Write a dinner scene where nobody says what they want, and everyone gets it anyway.',
    'Open on a sound. Don\'t show its source until the last line.',
    'Write a phone call where we only hear one side, and the other side is lying.',
    'Two strangers share an elevator that stops. One of them knows the other.',
    'Write a scene with no dialogue that ends a friendship.',
    'A character has to pack up a parent\'s house in one afternoon.',
    'Somebody receives the wrong letter, and opens it anyway.',
    'Write an interrogation where the suspect is in charge.',
    'Your antagonist does something kind. Write it so we\'re scared.',
    'Start a scene late, mid-argument. End it early, before the answer.',
    'A wedding toast goes off script.',
    'Write the moment your protagonist realises the plan has already failed.',
    'Two characters must share one umbrella. Only one deserves it.',
    'A character practises a confession in the mirror, then does something else.',
    'Write a scene in one location, in real time, with a clock on the wall.',
    'Someone teaches a skill they no longer believe in.',
    'A child asks the question every adult in the room has been avoiding.',
    'The last customer of the night won\'t leave.'
  ];
})();

/* ===== _engine.html ===== */
(function () {
  'use strict';
  var OS = window.OS = window.OS || {};
  var esc = function (s) { return UI.esc(s); };

  /* extra icons for this app (UI.icon reads UI.ICONS) */
  var IC = UI.ICONS;
  IC.book = '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/><path d="M8 7h7"/>';
  IC.dice = '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.1"/><circle cx="15" cy="15" r="1.1"/><circle cx="15" cy="9" r="1.1"/><circle cx="9" cy="15" r="1.1"/><circle cx="12" cy="12" r="1.1"/>';
  IC.film = '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 8h4M3 12h4M3 16h4M17 8h4M17 12h4M17 16h4"/>';
  IC.clapper = '<path d="M4 9h16v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M4 9 3.3 5.6a1 1 0 0 1 .8-1.2l13.7-2.6a1 1 0 0 1 1.2.8L19.6 6z"/><path d="m8 4.6 2.2 3.6M13 3.7l2.2 3.6"/>';
  IC.web = '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="8" r="2.5"/><circle cx="9" cy="18" r="2.5"/><path d="M8.4 6.4 15.5 7.6M6.6 8.4l1.8 7.2M16.6 10.1l-5.9 6.2"/>';
  IC.timeline = '<path d="M3 12h18"/><circle cx="6" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="18" cy="12" r="2"/><path d="M6 5v5M12 14v5M18 5v5"/>';
  IC.pages = '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M8 13h8M8 17h5"/>';
  IC.mask = '<path d="M4 5c3 1 13 1 16 0v6a8 8 0 0 1-16 0z"/><path d="M8 10h2M14 10h2M9 15c1.5 1 4.5 1 6 0"/>';
  IC.doctor = '<path d="M6 3v6a4 4 0 0 0 8 0V3"/><path d="M10 13v2a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="11" r="2"/>';
  IC.download = '<path d="M12 4v11M7 10l5 5 5-5"/><path d="M5 20h14"/>';
  IC.upload = '<path d="M12 20V9M7 14l5-5 5 5"/><path d="M5 4h14"/>';
  IC.print = '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>';
  IC.wheel = '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v6M12 15v6M3 12h6M15 12h6"/>';
  IC.up = '<path d="m6 15 6-6 6 6"/>';
  IC.down = '<path d="m6 9 6 6 6-6"/>';
  IC.wand = '<path d="m4 20 11-11M14 4v3M19 9h-3M17.5 5.5l-2 2M18 14v2M10 5H8"/>';
  IC.layers = '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>';
  IC.flash = '<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>';

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
    function chip(slot, text, cls) {
      if (asText) return text;
      return '<span role="button" tabindex="0" class="os-chip' + (cls ? ' ' + cls : '') + (st.locked[slot] ? ' locked' : '') + '" data-slot="' + slot + '" title="' +
        esc(SLOT_INFO[slot][0]) + ': click to swap">' + esc(text) + '</span>';
    }
    function fill(text, slot) {   // a twist may mention {hero} and {enemy}
      var parts = String(text).split(/(\{hero\}|\{enemy\})/);
      return parts.map(function (p) {
        if (p === '{hero}') return chip('hero', s.hero, 'echo');
        if (p === '{enemy}') return chip('enemy', s.enemy || 'the opposition');
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
    return { protagonist: '#c8102e', antagonist: '#5b2a86', deuteragonist: '#d07a52', love: '#e0457b', mentor: '#2c6db3', ally: '#2f8f6b', foil: '#9c8a1e',
      confidant: '#3e9aa8', trickster: '#e0a526', herald: '#8a6d3b', guardian: '#46505e', shapeshifter: '#a65b8a', witness: '#6b6f7a' }[role] || '#6b6f7a';
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

/* ===== _studio.html ===== */
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

/* ===== _tab_cast.html ===== */
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

/* ===== _tab_chrono.html ===== */
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

/* ===== _tab_overview.html ===== */
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

/* ===== _tab_pages.html ===== */
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

/* ===== _tab_story.html ===== */
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

/* ===== _tab_web.html ===== */
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

/* ===== admin.html ===== */
(function () {
  var esc = UI.esc;
  var TABS = [['overview', 'Overview', 'grid'], ['feedback', 'Feedback', 'inbox'], ['users', 'Users', 'users'], ['demo', 'Demo data', 'database']];

  UI.page('admin', { title: 'Admin', auth: 'admin' }, function (view, ctx) {
    var tab = TABS.some(function (t) { return t[0] === ctx.args[0]; }) ? ctx.args[0] : 'overview';
    var fbFilter = 'new';
    view.innerHTML = '<div class="ui-wrap"><div class="ui-page-head"><div><h1>Admin</h1><p class="muted">Only admins see this page.</p></div></div>' +
      '<nav class="ui-tabs">' + TABS.map(function (t) {
        return '<a href="#admin/' + t[0] + '" class="' + (t[0] === tab ? 'on' : '') + '">' + UI.icon(t[2]) + t[1] + '</a>';
      }).join('') + '</nav><div data-body><div class="ui-skel"></div></div></div>';
    var body = view.querySelector('[data-body]');

    function overview() {
      return UI.api('admin_overview').then(function (d) {
        var stat = function (n, label, go) { return '<a class="ui-card ui-stat" href="#admin/' + go + '" style="text-decoration:none;color:inherit"><b>' + n + '</b><span>' + label + '</span></a>'; };
        body.innerHTML = '<div class="ad-stats">' + stat(d.users, 'people signed up', 'users') + stat(d.admins, UI.plural(d.admins, 'admin').replace(/^\d+ /, ''), 'users') +
          stat(d.feedback_new, 'new feedback', 'feedback') + stat(d.projects, 'screenplays started', 'overview') +
          stat(d.writers, 'writers with a project', 'users') + stat(d.sparks, 'sparks saved', 'overview') + '</div>' +
          '<p class="muted small" style="margin-top:18px">Demo data is <b>' + esc(d.demo.state) + '</b> (' + d.demo.counts.users + ' demo people). Manage it in the Demo data tab.</p>';
      });
    }

    function feedback() {
      return UI.api('list_feedback', null).then(function (d) {
        var items = d.items.filter(function (i) { return fbFilter === 'all' || i.status === fbFilter; });
        body.innerHTML = '<div class="ui-row" style="margin-bottom:16px"><div class="ui-seg">' + [['new', 'New'], ['read', 'Read'], ['done', 'Done'], ['all', 'All']].map(function (f) {
          var n = f[0] === 'all' ? d.items.length : d.counts[f[0]];
          return '<button data-filter="' + f[0] + '" class="' + (fbFilter === f[0] ? 'on' : '') + '">' + f[1] + ' (' + n + ')</button>';
        }).join('') + '</div></div>' +
          (items.length ? '<div class="ad-fb">' + items.map(function (i) {
            var c = i.context || {};
            return '<div class="ui-item" data-id="' + esc(i.id) + '"><div class="meta"><span class="ui-badge ' + (i.kind === 'bug' ? 'bad' : i.kind === 'idea' ? 'brand' : '') + '">' + esc(i.kind_label) + '</span>' +
              '<b>' + esc(i.name) + '</b>' + (i.email ? '<a href="mailto:' + esc(i.email) + '">' + esc(i.email) + '</a>' : '') + '<span>' + esc(UI.fmtDateTime(i.created)) + '</span></div>' +
              '<p class="msg">' + esc(i.message) + '</p>' +
              '<div class="ctx">' + esc([c.page, c.screen, c.theme, c.browser].filter(Boolean).join(' · ')) + '</div>' +
              '<textarea data-note placeholder="Private note (only admins see it)">' + esc(i.note) + '</textarea>' +
              '<div class="ui-row" style="margin-top:10px">' + ['new', 'read', 'done'].map(function (s) {
                return '<button class="ui-btn sm' + (i.status === s ? ' primary' : '') + '" data-status="' + s + '">' + s[0].toUpperCase() + s.slice(1) + '</button>';
              }).join('') + '<span class="ui-spacer"></span><button class="ui-btn sm danger" data-del-fb>' + UI.icon('trash') + 'Delete</button></div></div>';
          }).join('') + '</div>'
            : '<div class="ui-empty">' + UI.icon('inbox') + '<h3>No ' + (fbFilter === 'all' ? '' : fbFilter + ' ') + 'messages</h3><p>New feedback goes to Prepsto (prepsto.com). Older messages and requests from the app show up here.</p></div>');
      });
    }

    function users(query) {
      return UI.api('list_users', query || null).then(function (d) {
        body.innerHTML = '<form class="ui-row" data-search style="margin-bottom:14px"><input type="search" name="q" placeholder="Search by name or email" value="' + esc(query || '') + '" style="max-width:360px">' +
          '<button class="ui-btn" type="submit">' + UI.icon('search') + 'Search</button><span class="muted small">' + UI.plural(d.total, 'person', 'people') + '</span></form>' +
          '<table class="ad-users"><thead><tr><th>Name</th><th>Email</th><th>Joined</th><th>Admin</th><th>Active</th></tr></thead><tbody>' +
          d.users.map(function (u) {
            return '<tr data-id="' + esc(u.id) + '"><td><b>' + esc(u.name) + '</b></td><td class="email">' + esc(u.email) + '</td><td class="joined muted">' + esc(UI.fmtDate(u.joined)) + '</td>' +
              '<td><label class="ui-check"><input type="checkbox" data-admin' + (u.is_admin ? ' checked' : '') + '> Admin</label></td>' +
              '<td><label class="ui-check"><input type="checkbox" data-enabled' + (u.enabled ? ' checked' : '') + '> Active</label></td></tr>';
          }).join('') + '</tbody></table>';
      });
    }

    function demo() {
      return UI.api('admin_overview').then(function (d) {
        var c = d.demo.counts;
        body.innerHTML = '<div class="ui-card ui-narrow" style="margin:0"><h3>Demo data</h3>' +
          '<p class="muted">Example people and content, so the app never looks empty for the first visitors. Demo rows are flagged, so removing them never touches real data. Once removed, it stays removed until you load it again.</p>' +
          '<p>Status: <b>' + esc(d.demo.state) + '</b> · ' + Object.keys(c).map(function (k) { return c[k] + ' ' + esc(k); }).join(', ') + '</p>' +
          '<div class="ui-row"><button class="ui-btn primary" data-demo="load">' + UI.icon('refresh') + (d.demo.state === 'loaded' ? 'Reload demo data' : 'Load demo data') + '</button>' +
          '<button class="ui-btn danger" data-demo="remove">' + UI.icon('trash') + 'Remove demo data</button></div></div>';
      });
    }

    var DRAW = { overview: overview, feedback: feedback, users: users, demo: demo };

    view.addEventListener('click', function (e) {
      var f = e.target.closest('[data-filter]');
      if (f) { fbFilter = f.getAttribute('data-filter'); feedback(); return; }
      var st = e.target.closest('[data-status]');
      if (st) {
        var card = st.closest('[data-id]');
        UI.api('set_feedback_status', card.getAttribute('data-id'), st.getAttribute('data-status'), card.querySelector('[data-note]').value).then(function () { UI.toast('Saved', 'ok'); feedback(); });
        return;
      }
      var del = e.target.closest('[data-del-fb]');
      if (del) {
        UI.confirm({ title: 'Delete this message?', ok: 'Delete', danger: true }).then(function (yes) {
          if (yes) UI.api('delete_feedback', del.closest('[data-id]').getAttribute('data-id')).then(feedback);
        });
        return;
      }
      var dm = e.target.closest('[data-demo]');
      if (dm) {
        var load = dm.getAttribute('data-demo') === 'load';
        UI.confirm({ title: load ? 'Load the demo data?' : 'Remove the demo data?', text: load ? 'Demo people and content are added (any old demo rows are replaced).' : 'Every demo row is deleted. Real data stays.', ok: load ? 'Load' : 'Remove', danger: !load })
          .then(function (yes) { if (yes) UI.busy(dm, UI.api(load ? 'demo_load' : 'demo_remove')).then(function () { UI.toast('Done', 'ok'); demo(); }); });
      }
    });
    view.addEventListener('change', function (e) {
      var row = e.target.closest('tr[data-id]');
      if (!row) return;
      var id = row.getAttribute('data-id'), box = e.target;
      var fn = box.hasAttribute('data-admin') ? 'set_admin' : box.hasAttribute('data-enabled') ? 'set_enabled' : null;
      if (fn) UI.api(fn, id, box.checked).then(function () { UI.toast('Saved', 'ok'); }, function (err) { box.checked = !box.checked; UI.toast(err.message, 'error'); });
    });
    view.addEventListener('submit', function (e) {
      if (e.target.matches('[data-search]')) { e.preventDefault(); users(UI.formData(e.target).q); }
    });
    return DRAW[tab]();
  });
})();

/* ===== auth.html ===== */
(function () {
  var esc = UI.esc;
  function pw(name, auto) {
    return '<div class="au-pw"><input type="password" name="' + name + '" autocomplete="' + auto + '" required minlength="8">' +
      '<button type="button" data-show>Show</button></div>';
  }
  UI.page('auth', { title: 'Sign in', auth: 'guest' }, function (view, ctx) {
    var mode = ['signup', 'reset'].indexOf(ctx.args[0]) >= 0 ? ctx.args[0] : 'login';
    function draw(msg, isErr) {
      var heading = { login: 'Welcome back', signup: 'Create your account', reset: 'Reset your password' }[mode];
      var sub = { login: 'Sign in to continue to ' + esc(UI.config.name) + '.', signup: 'It\'s free and takes a few seconds.',
        reset: 'We\'ll email you a link to choose a new password.' }[mode];
      view.innerHTML = '<div class="au-wrap"><div class="ui-card au-card">' +
        '<h1>' + heading + '</h1><p class="muted">' + sub + '</p>' +
        (mode !== 'reset' ? '<div class="ui-seg" role="tablist"><button type="button" data-mode="login" class="' + (mode === 'login' ? 'on' : '') + '">Sign in</button>' +
          '<button type="button" data-mode="signup" class="' + (mode === 'signup' ? 'on' : '') + '">Create account</button></div>' : '<div style="height:14px"></div>') +
        '<form class="ui-stack" data-form="' + mode + '" novalidate>' +
        (mode === 'signup' ? '<label class="ui-field"><span>Your name</span><input type="text" name="name" autocomplete="name" required maxlength="60"></label>' : '') +
        '<label class="ui-field"><span>Email</span><input type="email" name="email" autocomplete="email" required></label>' +
        (mode === 'login' ? '<label class="ui-field"><span>Password</span>' + pw('password', 'current-password') + '</label>' : '') +
        (mode === 'signup' ? '<label class="ui-field"><span>Password <em>(at least 8 characters)</em></span>' + pw('password', 'new-password') + '</label>' +
          (window.LegalKit ? '<div>' + LegalKit.consentField() + '</div>' : '') : '') +
        '<div data-msg role="alert"' + (msg ? ' class="' + (isErr ? 'ui-error' : 'ui-note') + '">' + esc(msg) : ' hidden>') + '</div>' +
        '<button class="ui-btn primary block" type="submit">' + { login: 'Sign in', signup: 'Create account', reset: 'Send the link' }[mode] + '</button></form>' +
        '<div class="au-links">' + (mode === 'login' ? '<a data-mode="reset">Forgot your password?</a>' : '<a data-mode="login">' + UI.icon('back') + ' Back to sign in</a>') +
        '<a href="#landing" data-go="landing">About ' + esc(UI.config.name) + '</a></div></div></div>';
      var first = view.querySelector('input');
      if (first && !msg) first.focus();
    }
    view.addEventListener('click', function (e) {
      var m = e.target.closest('[data-mode]');
      if (m) { e.preventDefault(); mode = m.getAttribute('data-mode'); history.replaceState(null, '', '#auth' + (mode === 'login' ? '' : '/' + mode)); draw(); return; }
      var s = e.target.closest('[data-show]');
      if (s) { var i = s.parentNode.querySelector('input'); i.type = i.type === 'password' ? 'text' : 'password'; s.textContent = i.type === 'password' ? 'Show' : 'Hide'; }
    });
    view.addEventListener('submit', function (e) {
      e.preventDefault();
      var form = e.target, v = UI.formData(form);
      var problem = !/^\S+@\S+\.\S+$/.test(v.email || '') ? 'Please enter a valid email address.'
        : mode !== 'reset' && (v.password || '').length < (mode === 'signup' ? 8 : 1) ? (mode === 'signup' ? 'Please choose a password of at least 8 characters.' : 'Please enter your password.')
        : mode === 'signup' && (v.name || '').trim().length < 2 ? 'Please tell us your name.' : null;
      if (problem) { say(problem, true); return; }
      if (mode === 'signup' && window.LegalKit && !LegalKit.consentChecked(form)) return;  // the kit shows its own message
      UI.busy(form.querySelector('[type=submit]'), UI.auth(mode, v)).then(function (r) {
        if (mode === 'reset' || (r && !r.me)) { mode = 'login'; draw(r && r.message, false); restore({ email: v.email }); }
        else UI.toast(mode === 'signup' ? 'Welcome to ' + UI.config.name + '!' : 'Welcome back!', 'ok');
      }, function (err) { say(err.message, true); });
    });
    function say(msg, isErr) {
      var box = view.querySelector('[data-msg]');
      box.className = isErr ? 'ui-error' : 'ui-note'; box.textContent = msg; box.hidden = false;
    }
    function restore(v) {
      ['name', 'email'].forEach(function (k) { var i = view.querySelector('[name=' + k + ']'); if (i && v[k]) i.value = v[k]; });
    }
    draw();
  });
})();

/* ===== home.html ===== */
(function () {
  var esc = UI.esc;
  OS.poster = function (p) {
    var st = p.stats || {}, total = st.beats_total || OS.beatsOf(p.structure).length, done = Math.min(total, st.beats_done || 0), f = OS.FORMATS[p.format] || OS.FORMATS.feature;
    var segs = ''; for (var i = 0; i < Math.min(total, 15); i++) segs += '<i class="' + (i < Math.round(done / total * Math.min(total, 15)) ? 'on' : '') + '"></i>';
    return '<a class="os-poster" href="#project/' + esc(p.id) + '" data-go="project/' + esc(p.id) + '" style="' + OS.posterStyle(p.color) + '">' +
      '<span class="segs">' + segs + '</span><span class="gen">' + esc(p.genre || f.short) + '</span>' +
      (p.sample ? '<span class="tag ui-badge" style="background:rgba(255,255,255,.18);color:#fff">Sample</span>' : '') +
      '<h3>' + esc(p.title) + '</h3><p>' + esc(p.logline || 'No logline yet.') + '</p>' +
      '<span class="meta">' + esc(f.short) + ' · ' + UI.plural(st.scenes || 0, 'scene') + (st.pages ? ' · ' + st.pages + ' pp' : '') + '</span></a>';
  };
  function greet() { var h = new Date().getHours(); return h < 5 ? 'Writing late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }
  function nextFromStats(st) {
    st = st || {};
    if (!st.characters) return 'Meet your protagonist: open Cast and give them a want and a wound.';
    if (!st.scenes) return 'Lay out the story: add a scene card for every beat.';
    if ((st.beats_done || 0) < (st.beats_total || 8)) return 'Fill the empty beats in the Storyline.';
    if (!st.pages) return 'Draft your first pages from the scene cards.';
    return 'Keep writing pages. The doctor will tell you what to fix.';
  }

  function newProject(spark) {
    var m = UI.modal('<h2>New screenplay</h2><p class="muted">Every choice can change later. Not sure? Story Circle and a feature are a great start.</p>' +
      '<form class="ui-stack" data-np><label class="ui-field"><span>Working title</span><input type="text" name="title" maxlength="120" placeholder="Untitled screenplay" value="' + esc(spark ? '' : '') + '"></label>' +
      '<div class="ui-grid two" style="gap:10px"><label class="ui-field"><span>Format</span><select name="format">' + Object.keys(OS.FORMATS).map(function (k) { return '<option value="' + k + '">' + esc(OS.FORMATS[k].name) + '</option>'; }).join('') + '</select></label>' +
      '<label class="ui-field"><span>Genre</span><select name="genre"><option value="">Decide later</option>' + OS.GENRES.map(function (g) { return '<option>' + esc(g[1]) + '</option>'; }).join('') + '</select></label></div>' +
      '<div><span style="font-weight:600;font-size:.9rem;display:block;margin-bottom:6px">Structure</span><div class="np-structs">' + OS.STRUCTURE_ORDER.map(function (k, i) {
        var s = OS.STRUCTURES[k];
        return '<label class="ui-choice"><input type="radio" name="structure" value="' + k + '"' + (i ? '' : ' checked') + '><span><b>' + esc(s.name) + '</b><small>' + esc(s.by) + ' · ' + s.beats.length + ' beats</small></span></label>';
      }).join('') + '</div></div>' +
      '<div><span style="font-weight:600;font-size:.9rem;display:block;margin-bottom:6px">Start with</span><div class="ui-choices">' +
      [['beats', 'A card for every beat', 'layers'], ['empty', 'An empty project', 'pages'], ['spark', 'A random spark', 'dice']].map(function (o, i) {
        return '<label class="ui-choice"><input type="radio" name="start" value="' + o[0] + '"' + (i ? '' : ' checked') + '><span>' + UI.icon(o[2]) + esc(o[1]) + '</span></label>';
      }).join('') + '</div></div>' +
      '<div class="ui-row end"><button type="button" class="ui-btn ghost" data-close>Cancel</button><button class="ui-btn primary" type="submit">' + UI.icon('arrow') + 'Create</button></div></form>', { wide: true });
    var form = m.el.querySelector('[data-np]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = UI.formData(form), seed;
      if (v.start === 'spark') {
        var st = OS.spark.generate(OS.spark.fresh());
        var g = OS.GENRES.filter(function (x) { return x[1] === v.genre; })[0];
        if (g) { st.genre = g[0]; OS.spark.generate(st); }
        seed = OS.spark.toSeed(st, { format: v.format });
        if (v.structure !== 'circle') { OS.remapBeats(seed.doc.scenes, 'circle', v.structure); seed.structure = v.structure; }
        if (v.title.trim()) seed.title = v.title.trim();
      } else {
        var doc = OS.newDoc();
        var hero = OS.blankCharacter('protagonist'); hero.name = 'Protagonist'; doc.characters.push(hero);
        if (v.start === 'beats') OS.beatsOf(v.structure).forEach(function (b) {
          doc.scenes.push({ id: OS.uid('s'), heading: '', summary: b.n + ': ' + b.q, goal: '', conflict: '', outcome: '', beat: b.k, charge_in: null, charge_out: null, chars: [hero.id], events: [], done: false });
        });
        seed = { title: v.title.trim() || 'Untitled screenplay', format: v.format, genre: v.genre, structure: v.structure, color: OS.pick(Object.keys(OS.COLORS)), doc: doc };
      }
      UI.busy(form.querySelector('[type=submit]'), UI.api('create_project', seed)).then(function (r) { m.close(); UI.go('project', r.project.id, 'overview'); });
    });
  }

  UI.page('home', { title: 'Desk', nav: 'Desk', icon: 'home', auth: 'user', order: 10 }, function (view, ctx) {
    view.innerHTML = '<div class="ui-wrap"><div class="ui-skel" style="height:240px"></div><div class="os-posters" style="margin-top:20px"><div class="ui-skel" style="aspect-ratio:9/14"></div><div class="ui-skel" style="aspect-ratio:9/14"></div></div></div>';
    var prompt = OS.daily(OS.PROMPTS);
    function draw(d) {
      var first = OS.first(ctx.me.name), last = d.projects[0];
      var date = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
      view.innerHTML = '<div class="ui-wrap"><div class="dk-head"><div><div class="os-tc"><span class="rec"></span>' + esc(date) + ' · Your desk</div>' +
        '<h1>' + esc(greet()) + ', <em>' + esc(first) + '.</em></h1><p class="muted" style="margin:0">' +
        (d.projects.length ? UI.plural(d.projects.length, 'screenplay') + ' in progress.' : 'Your first screenplay starts here. Pull a spark, or start from a structure.') + '</p></div>' +
        '<div class="ui-row"><a class="ui-btn" href="#spark" data-go="spark">' + UI.icon('sparkle') + 'Pull a spark</a><button class="ui-btn primary" data-new>' + UI.icon('plus') + 'New screenplay</button></div></div>' +
        '<div class="dk-top"><div class="os-night dk-prompt"><div><span class="os-tc">Tonight\'s prompt · five-minute warm-up</span><q data-prompt>' + esc(prompt) + '</q></div>' +
        '<div class="ui-row"><button class="ui-btn night sm" data-another>' + UI.icon('refresh') + 'Another</button><a class="ui-btn night sm" href="#learn" data-go="learn">' + UI.icon('book') + 'How to write a scene</a></div></div>' +
        (last ? '<div class="ui-card dk-continue">' + OS.poster(last) + '<div><span class="os-tc">Continue · edited ' + esc(UI.ago(last.updated)) + '</span><h3>' + esc(last.title) + '</h3>' +
          '<div class="os-meter" title="Readiness"><i style="width:' + ((last.stats && last.stats.readiness) || 5) + '%"></i></div>' +
          '<div class="dk-next">' + UI.icon('doctor') + '<span>' + esc(nextFromStats(last.stats)) + '</span></div>' +
          '<a class="ui-btn primary sm" href="#project/' + esc(last.id) + '" data-go="project/' + esc(last.id) + '">Open ' + UI.icon('arrow') + '</a></div></div>'
          : '<div class="ui-card dk-continue" style="grid-template-columns:1fr"><div><span class="os-tc">Start here</span><h3>Three ways in</h3>' +
            '<ul class="lp-list" style="list-style:none;padding:0;display:grid;gap:8px;margin:10px 0 0"><li>' + UI.icon('sparkle') + ' <span><b>Spark</b>: generate a story and develop it into a project in one click.</span></li>' +
            '<li>' + UI.icon('layers') + ' <span><b>Structure</b>: start with a card for every beat of a classic structure.</span></li>' +
            '<li>' + UI.icon('film') + ' <span><b>Study</b>: open a sample below and see how a finished project fits together.</span></li></ul></div></div>') + '</div>' +
        '<div class="ui-row between"><h2 style="margin:0">Your screenplays</h2></div>' +
        '<div class="os-posters" style="margin-top:14px"><button type="button" class="os-poster new" data-new>' + UI.icon('plus') + '<b>New screenplay</b><span class="small">Empty, by beats, or from a spark</span></button>' +
        d.projects.map(OS.poster).join('') + '</div>' +
        (d.samples.length ? '<section class="dk-sec"><div class="ui-row between"><div><h2>Study the samples</h2><p class="muted small" style="margin:4px 0 0">Finished projects to pull apart. Open one read-only, or make it yours with one click.</p></div></div>' +
          '<div class="dk-strip">' + d.samples.map(OS.poster).join('') + '</div></section>' : '') +
        '<section class="dk-sec"><div class="ui-row between"><h2>Latest sparks</h2><a href="#spark" data-go="spark">Open the vault ' + UI.icon('arrow') + '</a></div>' +
        (d.sparks.length ? '<div class="dk-sparks">' + d.sparks.slice(0, 6).map(function (s) {
          return '<div class="ui-card dk-spark"><h3>' + esc(s.title) + '</h3><p>' + esc(s.text) + '</p><span class="small faint">' + esc(UI.ago(s.created)) + '</span></div>';
        }).join('') + '</div>' : '<div class="ui-empty" style="padding:28px">' + UI.icon('sparkle') + '<h3>No saved sparks</h3><p>Save the ones you like on the Spark page; they wait here.</p></div>') + '</section>' +
        '<section class="dk-sec"><div class="dk-tools"><a class="ui-card" href="#ideas" data-go="ideas">' + UI.icon('bulb') + '<div><b>Idea library</b><span>' + OS.ideaCount() + ' archetypes, wounds, twists, scene recipes…</span></div></a>' +
        '<a class="ui-card" href="#learn" data-go="learn">' + UI.icon('book') + '<div><b>Learn</b><span>Format, structure, and a Godfather masterclass</span></div></a>' +
        '<a class="ui-card" href="#learn/circle" data-go="learn/circle">' + UI.icon('wheel') + '<div><b>The Story Circle</b><span>The 8-step engine, explained</span></div></a></div></section></div>';
    }
    view.addEventListener('click', function (e) {
      if (e.target.closest('[data-new]')) newProject();
      if (e.target.closest('[data-another]')) { prompt = OS.pick(OS.PROMPTS); view.querySelector('[data-prompt]').textContent = prompt; }
    });
    return UI.api('get_desk').then(draw);
  });
})();

/* ===== ideas.html ===== */
(function () {
  var esc = UI.esc;
  var DECK = {};
  OS.DECKS.forEach(function (g) { g[1].forEach(function (d) { DECK[d[0]] = { key: d[0], name: d[1], icon: d[2], group: g[0] }; }); });
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

  function cardHtml(it, deck) {
    var tags = (it.g || []).map(function (g) { return OS.GENRE[g] ? '<span>' + esc(OS.GENRE[g].name) + '</span>' : ''; }).join('');
    return '<div class="ui-card id-card"><h3>' + esc(it.t) + '</h3>' + (it.d ? '<p>' + esc(it.d) + '</p>' : '') +
      (it.x ? '<div class="ex">' + (deck === 'wounds' ? 'Lie: ' : deck === 'voices' ? '“' : deck === 'conditions' ? '' : '') + esc(it.x) + (deck === 'voices' ? '”' : '') + '</div>' : '') +
      (tags ? '<div class="tags">' + tags + '</div>' : '') +
      '<button class="ui-btn ghost" data-copy="' + esc(it.t) + '" aria-label="Copy" title="Copy">' + UI.icon('copy') + '</button></div>';
  }

  UI.page('ideas', { title: 'Ideas', nav: 'Ideas', icon: 'bulb', auth: 'user', order: 30 }, function (view, ctx) {
    var deck = DECK[ctx.args[0]] ? ctx.args[0] : 'archetypes', query = '';
    view.innerHTML = '<div class="ui-wrap"><div class="ui-page-head"><div><div class="os-tc">The idea library · ' + OS.ideaCount() + ' ideas</div>' +
      '<h1 style="margin-top:10px">Never stare at a blank field again.</h1><p class="muted">Every suggestion button in your projects draws from these decks. Browse, search, or let fate deal a card.</p></div></div>' +
      '<div class="id-layout"><nav class="id-nav" aria-label="Decks">' + OS.DECKS.map(function (g) {
        return '<div><h4>' + esc(g[0]) + '</h4>' + g[1].map(function (d) {
          return '<a href="#ideas/' + d[0] + '" data-deck="' + d[0] + '" class="' + (d[0] === deck ? 'on' : '') + '">' + UI.icon(d[2]) + esc(d[1]) + '<span class="n">' + OS.L[d[0]].length + '</span></a>';
        }).join('') + '</div>';
      }).join('') + '</nav><div><select class="id-select" data-pick>' + OS.DECKS.map(function (g) {
        return '<optgroup label="' + esc(g[0]) + '">' + g[1].map(function (d) { return '<option value="' + d[0] + '"' + (d[0] === deck ? ' selected' : '') + '>' + esc(d[1]) + ' (' + OS.L[d[0]].length + ')</option>'; }).join('') + '</optgroup>';
      }).join('') + '</select>' +
      '<div class="id-tools"><input type="search" placeholder="Search every deck…" data-q aria-label="Search ideas"><button class="ui-btn primary" data-draw>' + UI.icon('dice') + 'Draw a card</button></div>' +
      '<div data-body></div></div></div></div>';
    var body = view.querySelector('[data-body]');
    function draw() {
      if (query) {
        var hits = [];
        Object.keys(DECK).forEach(function (k) {
          OS.L[k].forEach(function (it) { if ((it.t + ' ' + (it.d || '') + ' ' + (it.x || '')).toLowerCase().indexOf(query) >= 0) hits.push([k, it]); });
        });
        body.innerHTML = '<h2>' + UI.plural(hits.length, 'idea') + ' for “' + esc(query) + '”</h2>' + (hits.length ? '<div class="id-cards">' + hits.slice(0, 120).map(function (h) {
          return cardHtml(h[1], h[0]).replace('<h3>', '<span class="os-tc">' + esc(DECK[h[0]].name) + '</span><h3>');
        }).join('') + '</div>' : '<div class="ui-empty">' + UI.icon('search') + '<h3>Nothing matches</h3><p>Try a simpler word: "father", "secret", "fire".</p></div>');
        return;
      }
      var d = DECK[deck];
      body.innerHTML = '<div class="eyebrow">' + esc(d.group) + '</div><h2>' + esc(d.name) + '</h2><p class="muted">' + esc(ABOUT[deck] || '') + '</p>' +
        '<div class="id-cards">' + OS.L[deck].map(function (it) { return cardHtml(it, deck); }).join('') + '</div>';
    }
    view.addEventListener('click', function (e) {
      var a = e.target.closest('[data-deck]');
      if (a) { e.preventDefault(); deck = a.getAttribute('data-deck'); query = ''; view.querySelector('[data-q]').value = '';
        view.querySelectorAll('[data-deck]').forEach(function (x) { x.classList.toggle('on', x === a); }); history.replaceState(null, '', '#ideas/' + deck); draw(); return; }
      var c = e.target.closest('[data-copy]');
      if (c) { try { navigator.clipboard.writeText(c.getAttribute('data-copy')); UI.toast('Copied', 'ok'); } catch (err) { UI.toast('Select the text to copy it.'); } return; }
      if (e.target.closest('[data-draw]')) {
        var keys = query ? Object.keys(DECK) : [deck], k = OS.pick(keys), it = OS.pick(OS.L[k]);
        var m = UI.modal('<div class="id-draw id-flip"><span class="os-tc"><span class="rec"></span>' + esc(DECK[k].name) + '</span><h2>' + esc(it.t) + '</h2>' +
          (it.d ? '<p class="muted">' + esc(it.d) + '</p>' : '') + (it.x ? '<p><i>' + esc(it.x) + '</i></p>' : '') +
          '<div class="ui-row" style="justify-content:center;margin-top:20px"><button class="ui-btn" data-again>' + UI.icon('dice') + 'Draw again</button><button class="ui-btn primary" data-copy="' + esc(it.t) + '">' + UI.icon('copy') + 'Copy</button></div></div>');
        m.el.addEventListener('click', function (ev) {
          if (ev.target.closest('[data-again]')) { m.close(); view.querySelector('[data-draw]').click(); }
          var cc = ev.target.closest('[data-copy]');
          if (cc) { try { navigator.clipboard.writeText(cc.getAttribute('data-copy')); UI.toast('Copied', 'ok'); } catch (err) {} }
        });
      }
    });
    view.addEventListener('input', function (e) { if (e.target.matches('[data-q]')) { query = e.target.value.trim().toLowerCase(); draw(); } });
    view.addEventListener('change', function (e) { if (e.target.matches('[data-pick]')) { deck = e.target.value; history.replaceState(null, '', '#ideas/' + deck); draw(); } });
    draw();
  });
})();

/* ===== landing.html ===== */
(function () {
  var COPY = {
    eyebrow: 'A writer\'s room for one',
    title: 'Write the screenplay <em>you keep putting off.</em>',
    lead: 'OScreenplay turns a half-idea into a real script. Pull a story spark and swap any word you don\'t like, build characters who react like people, line up what happened against what we see, and write properly formatted pages, with a script doctor watching your back.',
    cta: 'Start writing, it\'s free',
    proof: ['No AI writing for you', 'Industry-standard format', 'Works on your phone'],
    stepsTitle: 'From "what if" to FADE OUT',
    stepsLead: 'Five rooms, one project. Go in order or jump around; everything stays connected.',
    steps: [['Spark', 'Generate a story abstract. Click any word to swap it, lock the ones you love, and develop it into a project in one click.'],
            ['Cast', 'Want, need, wound, lie, flaw, fear, and Big Five personality. Ask how each character would react to a betrayal, a windfall, a declaration of love.'],
            ['Web', 'A living relationship map: rivals, debts, secrets, love. Tension shows as weight; lonely characters get flagged.'],
            ['Two timelines', 'The chronology (what happened, backstory included) against the storyline (the order we tell it). The braid shows every flashback.'],
            ['Pages', 'A real screenplay editor: Enter and Tab do the formatting. Draft pages from your scene cards, export to Fountain, print to PDF.']],
    featuresTitle: 'It does the heavy lifting',
    features: [['sparkle', 'Spark generator', 'Six story shapes, a dozen swappable slots, a weirdness dial. Every abstract becomes a logline, a Story Circle and a starter cast.'],
               ['mask', 'Characters that react', 'A rule engine reads personality, flaw, fear and values to suggest what a character would logically do, and why.'],
               ['web', 'Relationship web', 'Drag characters around, connect them with 14 kinds of relationship, see tension at a glance.'],
               ['timeline', 'Chronology vs. storyline', 'Rebuild events in order, then tell them out of order on purpose. Flashbacks light up in red.'],
               ['wheel', 'Six structures', 'Story Circle, three acts, Save the Cat, the Hero\'s Journey, eight sequences, Kishōtenketsu. Switch any time; cards follow.'],
               ['doctor', 'Script doctor', 'Scenes that don\'t turn, setups that never pay off, villains without a want. A readiness score and a fix for each note.'],
               ['pages', 'Proper pages', 'Scene headings, action, character, parenthetical, dialogue, transitions. Fountain import and export, page count, runtime.'],
               ['book', 'A masterclass inside', 'Screenplay format, structure theory, and what The Godfather teaches about scenes, subtext and arcs.']],
    circleTitle: 'The Story Circle, built in',
    circleQuote: 'A character in a zone of comfort, wants something, enters an unfamiliar situation, adapts to it, gets what they wanted, pays a heavy price for it, returns to their familiar situation, having changed.',
    circleBy: 'Dan Harmon\'s Story Circle, the engine behind every Rick and Morty episode',
    circlePoints: ['Every project shows its cards on the wheel, so empty steps are obvious.', 'Prefer three acts or Save the Cat? Switch structures and your scenes move to the nearest beat.', 'Each beat comes with the question it has to answer, and ideas when you\'re stuck.'],
    faq: [['Does it use AI to write?', 'No. Every suggestion comes from rules, story templates and a hand-built library of ideas: archetypes, wounds, flaws, conditions, twists, scene recipes. You do the writing; OScreenplay does the bookkeeping, the formatting and the nagging.'],
          ['Is it free?', 'Yes. Create as many screenplays and sparks as you like.'],
          ['Who can read my scripts?', 'Only you. Projects are private to your account. The sample scripts are the only ones everybody can open (read-only).'],
          ['Can I take my script elsewhere?', 'Yes. Export to Fountain (opens in Final Draft, Highland, WriterDuet, Fade In and others) or print a properly formatted PDF. You can import Fountain too.'],
          ['I\'ve never written a screenplay. Is that a problem?', 'That\'s who the Learn page is for: format in ten minutes, the main structures, character craft, and a scene-by-scene masterclass. Every field in a project explains itself.'],
          ['Does it work on my phone?', 'Yes, from spark to pages. A laptop is nicer for long writing sessions.']],
    bandTitle: 'Your first scene is three clicks away.',
    bandLead: 'Pull a spark, develop it, open the pages. The blank page never stood a chance.'
  };

  function reel(st) {
    return '<div class="lp-reel"><div class="os-night"><div class="os-sprocket" aria-hidden="true"></div>' +
      '<div class="segs" aria-hidden="true"><i class="on"></i><i class="on"></i><i class="now"></i><i></i><i></i></div>' +
      '<div class="top"><span class="os-tc"><span class="rec"></span>Spark · ' + UI.esc((OS.GENRE[st.flavor] || {}).name || 'Any genre') + '</span>' +
      '<span class="os-tc" data-count></span></div>' +
      '<h3 class="ttl" data-ttl></h3><p class="abs" data-abs></p>' +
      '<div class="act"><button class="ui-btn primary" data-pull>' + UI.icon('dice') + 'Pull another</button>' +
      '<button class="ui-btn night" data-keep>' + UI.icon('arrow') + 'Develop this one</button></div>' +
      '<p class="hint">Tap any highlighted word to swap it. Lock the ones you love.</p></div></div>';
  }

  UI.page('landing', { title: 'Write a better screenplay' }, function (view, ctx) {
    var me = ctx.me, C = COPY, esc = UI.esc;
    var st = OS.spark.generate({ slots: {}, locked: {}, tpl: 'until', genre: 'any', weird: 15 });
    var primary = me ? '<a class="ui-btn primary lg" href="#home" data-go="home">Open your desk ' + UI.icon('arrow') + '</a>'
      : '<a class="ui-btn primary lg" href="#auth/signup" data-go="auth/signup">' + esc(C.cta) + ' ' + UI.icon('arrow') + '</a>' +
        '<a class="ui-btn lg" href="#auth" data-go="auth">I have an account</a>';
    var counts = { circle: 0 };
    view.innerHTML =
      '<section class="lp-hero"><div class="ui-wrap"><div>' +
        '<div class="os-tc"><span class="rec"></span>' + esc(C.eyebrow) + '</div><h1>' + C.title + '</h1><p class="lp-lead">' + esc(C.lead) + '</p>' +
        '<div class="lp-cta">' + primary + '</div>' +
        '<div class="lp-proof">' + C.proof.map(function (p) { return '<span>' + UI.icon('check') + esc(p) + '</span>'; }).join('') + '</div>' +
      '</div><div data-reel></div></div></section>' +
      '<section class="lp-section" id="how"><div class="ui-wrap"><div class="lp-head"><div class="eyebrow">How it works</div><h2>' + esc(C.stepsTitle) + '</h2><p>' + esc(C.stepsLead) + '</p></div>' +
        '<div class="lp-steps">' + C.steps.map(function (s, i) { return '<div class="lp-step"><span class="os-tc">0' + (i + 1) + ' / 05</span><h3>' + esc(s[0]) + '</h3><p>' + esc(s[1]) + '</p></div>'; }).join('') + '</div></div></section>' +
      '<section class="lp-section"><div class="ui-wrap"><div class="lp-split"><div class="os-night"><div class="lp-wheel">' + OS.svg.wheel({ night: true, labels: true }) + '</div></div>' +
        '<div><div class="eyebrow">Structure</div><h2>' + esc(C.circleTitle) + '</h2><p class="lp-quote">“' + esc(C.circleQuote) + '”</p><p class="muted small">' + esc(C.circleBy) + '</p>' +
        '<ul class="lp-list">' + C.circlePoints.map(function (p) { return '<li>' + UI.icon('check') + '<span>' + esc(p) + '</span></li>'; }).join('') + '</ul></div></div></div></section>' +
      '<section class="lp-section"><div class="ui-wrap"><div class="lp-head"><div class="eyebrow">Inside</div><h2>' + esc(C.featuresTitle) + '</h2>' +
        '<div class="lp-numbers"><div><b>' + OS.ideaCount() + '</b><span>ideas in the library</span></div><div><b>' + OS.REACT.length * 6 + '</b><span>reaction rules</span></div>' +
        '<div><b>' + OS.STRUCTURE_ORDER.length + '</b><span>story structures</span></div><div><b>' + OS.REL.length + '</b><span>kinds of relationship</span></div></div></div>' +
        '<div class="lp-feat">' + C.features.map(function (f) { return '<div class="ui-card lp-feature">' + UI.icon(f[0]) + '<h3>' + esc(f[1]) + '</h3><p>' + esc(f[2]) + '</p></div>'; }).join('') + '</div></div></section>' +
      '<section class="lp-section"><div class="ui-wrap"><div class="lp-head c"><h2>Questions</h2></div><div class="lp-faq">' +
        C.faq.map(function (q) { return '<details><summary>' + esc(q[0]) + '</summary><p>' + esc(q[1]) + '</p></details>'; }).join('') + '</div></div></section>' +
      '<section class="lp-section"><div class="ui-wrap"><div class="os-night lp-band"><div><h2>' + esc(C.bandTitle) + '</h2><p class="muted">' + esc(C.bandLead) + '</p></div>' +
        (me ? '<a class="ui-btn primary lg" href="#spark" data-go="spark">Pull a spark</a>' : '<a class="ui-btn primary lg" href="#auth/signup" data-go="auth/signup">' + esc(C.cta) + '</a>') +
      '</div></div></section>';

    var box = view.querySelector('[data-reel]');
    function draw(changed) {
      box.innerHTML = reel(st);
      box.querySelector('[data-ttl]').textContent = st.slots.title;
      box.querySelector('[data-abs]').innerHTML = OS.spark.render(st);
      box.querySelector('[data-count]').textContent = OS.words(OS.spark.text(st)) + ' words';
      if (changed) { var c = box.querySelector('[data-slot="' + changed + '"]'); if (c) c.classList.add('flash'); }
    }
    draw();
    OS.sparkMachine(box, st, draw);
    box.addEventListener('click', function (e) {
      if (e.target.closest('[data-pull]')) { OS.spark.generate(st); draw(); }
      if (e.target.closest('[data-keep]')) {
        UI.store.set('pendingSpark', { slots: st.slots, tpl: st.tpl, genre: st.genre, flavor: st.flavor });
        if (!me) UI.after = '#spark';
        UI.go(me ? 'spark' : 'auth', me ? '' : 'signup');
      }
    });
    view.addEventListener('click', function (e) {
      var seg = e.target.closest('.os-wheel [data-beat]');
      if (seg) { var b = OS.beat('circle', seg.getAttribute('data-beat')); UI.toast(b.n + ': ' + b.q); }
    });
  });
})();

/* ===== learn.html ===== */
(function () {
  var esc = UI.esc;
  var SECTIONS = [['format', 'Format in 10 minutes'], ['circle', 'The Story Circle'], ['structures', 'Other structures'], ['godfather', 'Godfather masterclass'],
    ['character', 'Character craft'], ['scenes', 'Scene craft'], ['dialogue', 'Dialogue'], ['glossary', 'Glossary'], ['workflow', 'How OScreenplay works']];

  var ELEMENTS = [
    ['Scene heading', 'Also called a slugline. INT. or EXT., the place, then the time. A new heading every time the place or time changes.', '<div class="scene">INT. HARBOUR OFFICE - NIGHT</div>'],
    ['Action', 'What we see and hear, in the present tense. Short paragraphs, three or four lines at most. Introduce a character in CAPS with their age, once.',
      '<div class="action">NORA KESSEL (29) stands at the window, coat still on. She is counting boats.</div>'],
    ['Character', 'The speaker\'s name, in caps, above their line. Extensions in brackets: (V.O.) voice-over, (O.S.) off-screen, (CONT\'D) continuing.', '<div class="character">NORA (V.O.)</div>'],
    ['Parenthetical', 'A short note on how a line is said, or a tiny action. Use rarely: trust the actor.', '<div class="character">GUS</div><div class="paren">(not looking up)</div><div class="dialogue">Sit.</div>'],
    ['Dialogue', 'What they say. Under the name, in a narrow column, so a page of talk reads fast.', '<div class="character">ELI</div><div class="dialogue">Is that a good point or a bad point?</div>'],
    ['Transition', 'How we leave a scene: CUT TO:, SMASH CUT TO:, DISSOLVE TO:. Modern scripts use very few; a new scene heading already means a cut.', '<div class="transition">SMASH CUT TO:</div>']
  ];
  var RULES = [['One page ≈ one minute', 'A feature runs 90 to 120 pages; a half-hour pilot about 30.'], ['Present tense, active voice', '"She opens the door", never "She is opening".'],
    ['Only what we can see or hear', 'No thoughts, no backstory in action lines. Show it, or let someone say it.'], ['White space is pace', 'Short lines read fast. Dense blocks slow the read and the film.'],
    ['Courier 12, standard margins', 'OScreenplay does the layout; export to Fountain or print to PDF.'], ['Don\'t direct the camera', 'Write the moment; a shot only when the story needs that exact image.'],
    ['Special formats', 'MONTAGE, SERIES OF SHOTS, INTERCUT, FLASHBACK, SUPER: (text on screen), PRE-LAP (sound before the cut).'], ['Name your scenes for the reader', 'Keep location names consistent, so the reader always knows where they are.']];

  var LESSONS = [
    ['Open with a ritual that introduces everyone', 'The film begins at a wedding: a bright public party outside, private business in a dark office inside. Every guest who visits the head of the family wants something, so each character is introduced through a request.',
      'Introduce characters through what they want, and set two worlds against each other in one location.'],
    ['Make the hero\'s starting position unmistakable', 'Michael arrives in uniform, with an outsider, and explains his family to her from a distance. His stance is clear: that\'s them, not me. The whole film is the measured destruction of that sentence.',
      'State where the protagonist starts as clearly as you can. An arc is only visible against a clear starting point.'],
    ['The threshold can be a quiet act of care', 'At the hospital, Michael finds his father unprotected and decides to stand guard. No gun is fired. He simply chooses the family for one night, and the audience goes with him because the choice is loving.',
      'Let the point of no return be an action the audience agrees with. They\'ll follow your hero into the dark.'],
    ['Suspense is information plus waiting', 'Before the restaurant scene, we learn exactly where a hidden gun will be. So every second of the dinner is unbearable: will it be there, will he do it? The conversation runs in a language without subtitles, and a passing train swells on the soundtrack as he decides.',
      'Tell the audience what\'s at stake before the characters act, then make them wait. Use sound to make an inner state audible.'],
    ['One image beats a threat speech', 'A powerful man refuses a favour and wakes up to an image so shocking it needs no dialogue at all. The family\'s reach is established for the rest of the film in a single shot.',
      'Escalate with an image, not an explanation. The audience will never forget it, and nobody has to say the threat out loud.'],
    ['Supporting characters as roads not taken', 'Each brother is a version of what Michael could become: one ruled by temper, one by weakness, and the adopted son who has the logic but not the blood. Each fails exactly the way his nature predicts.',
      'Build the supporting cast as mirrors of your hero\'s possible paths. The Web tab is built for this.'],
    ['A mentor\'s last scene is a setup', 'In a quiet garden, the retired father tells Michael how the betrayal will come: whoever brings him a peace meeting is the traitor. Then he dies playing with his grandson. Later the prediction comes true, word for word.',
      'Give the mentor\'s final scene a plant, so their death leaves the hero alone with knowledge they must use.'],
    ['Cross-cut so each action comments on the other', 'The baptism: Michael renounces evil at the altar while, across the city, his enemies are killed on his orders. Sacrament and murder intercut. He becomes a godfather in both senses at once.',
      'Intercut two actions to make the theme visible without anyone stating it.'],
    ['End on a point of view', 'The last scene answers the first. Kay asks the question; Michael lies; a door closes between her and the dark office, seen from her side. The hero has fully entered the room the film opened in.',
      'Let the final image mirror the opening image, changed. Choose whose eyes we end in.'],
    ['A negative arc works when every step is reasonable', 'From war hero who wants no part to head of the family, each of Michael\'s choices makes sense from inside. We half agree with every step, which is why the destination horrifies us.',
      'For a corruption arc, motivate every step so well that the audience is complicit.'],
    ['Think in movements', 'The film moves in self-contained sequences: the wedding, the shooting, the hospital, the restaurant, the exile, the return, the baptism. Each has its own question and its own climax.',
      'The Eight Sequences structure in OScreenplay builds exactly this. The Salt Debt sample uses it.']
  ];

  var GLOSSARY = [['Logline', 'The story in one sentence: hero, goal, obstacle, stakes.'], ['Premise', 'The "what if" behind the story.'], ['Inciting incident', 'The event that starts the story; it happens TO the hero.'],
    ['Plot point', 'A turn that sends the story in a new direction, usually at the act breaks.'], ['Midpoint', 'The middle turn: the hero goes from reacting to acting, or a false victory becomes a defeat.'],
    ['Want', 'The outer goal: what the character is trying to get.'], ['Need', 'The inner truth they must learn, often the opposite of what they want.'], ['Wound (ghost)', 'The past hurt that shaped them.'],
    ['Lie', 'The false belief the wound planted. A positive arc unlearns it.'], ['Arc', 'How a character changes (positive), is corrupted (negative) or changes others while staying the same (flat).'],
    ['Beat', 'A unit of story. In a beat sheet, a structural moment; inside a scene, a single exchange of action and reaction.'], ['Sequence', 'A run of scenes with its own mini-story, about 10 to 15 pages.'],
    ['Setup and payoff', 'Plant something early, use it later. Also "Chekhov\'s gun".'], ['Subtext', 'What a line really means under what it says.'], ['On the nose', 'Dialogue that says exactly what the character feels. Usually a problem.'],
    ['Value charge', 'The emotional value at stake in a scene (love, safety, freedom) and whether it ends positive or negative. Every scene should turn it.'],
    ['Slugline', 'A scene heading: INT./EXT. LOCATION - TIME.'], ['V.O. / O.S.', 'Voice-over (narration, not in the scene) and off-screen (in the scene, out of sight).'],
    ['Cold open', 'A TV teaser before the titles.'], ['Button', 'A last line or image that closes a scene with a snap.'], ['Fountain', 'A plain-text screenplay format that most screenwriting apps can open.'],
    ['Spec script', 'A script written on speculation, not commissioned.'], ['Coverage', 'A reader\'s report on a script for a producer.'], ['MacGuffin', 'The object everyone wants; it matters because they want it.'],
    ['Fabula and syuzhet', 'The events in the order they happened, and the order the story tells them. OScreenplay\'s Chronology and Storyline.']];

  function structureHtml(k) {
    var s = OS.STRUCTURES[k];
    return '<details class="ui-card ln-struct"' + (k === 'seq' ? ' open' : '') + '><summary><div><h3>' + esc(s.name) + '</h3><span>' + esc(s.by) + ' · ' + esc(s.short) + '</span></div>' + UI.icon('chevron') + '</summary>' +
      '<ol>' + s.beats.map(function (b) { return '<li><b>' + esc(b.n) + '</b> <em>(' + Math.round(b.pct * 100) + '%)</em>: ' + esc(b.d) + ' <em>' + esc(b.q) + '</em></li>'; }).join('') + '</ol></details>';
  }

  UI.page('learn', { title: 'Learn screenwriting', nav: 'Learn', icon: 'book', order: 40, when: function () { return !!UI.me; } }, function (view, ctx) {
    var circleBeats = OS.beatsOf('circle'), active = 'you';
    view.innerHTML = '<div class="ui-wrap"><div class="ui-page-head"><div><div class="os-tc">Learn · the masterclass</div><h1 style="margin-top:10px">How to write a screenplay.</h1>' +
      '<p class="muted">Everything a first script needs, and the theory behind the tools. Fifteen minutes of reading saves fifty pages of rewriting.</p></div></div>' +
      '<div class="ln-layout"><nav class="ln-toc" aria-label="Sections">' + SECTIONS.map(function (s) { return '<a href="#learn/' + s[0] + '" data-sec="' + s[0] + '">' + esc(s[1]) + '</a>'; }).join('') + '</nav><article class="ln-art">' +

      '<section class="ln-sec" id="ln-format"><div class="eyebrow">01 · Format</div><h2>Screenplay format in ten minutes</h2><p>A screenplay is a blueprint, not a novel: it describes only what the audience will see and hear, in a strict layout that lets anyone estimate the running time from the page count. Six elements do almost everything.</p>' +
      ELEMENTS.map(function (e) { return '<div class="ln-el"><div><h4>' + esc(e[0]) + '</h4><p>' + esc(e[1]) + '</p></div><div class="os-paper ln-page os-scr">' + e[2] + '</div></div>'; }).join('') +
      '<h3>A page, put together</h3><div class="os-paper ln-page os-scr"><div class="scene">EXT. KESSEL DOCKS - WEDDING RECEPTION - DAY</div><div class="action">A brass band. A hundred fishermen in borrowed suits. MARTA KESSEL (34), radiant and already a little drunk, dances with everyone except her new husband.</div>' +
      '<div class="character">MARTA</div><div class="paren">(close, a whisper)</div><div class="dialogue">Look who came home. Don\'t sit in it. It\'s not yours.</div><div class="action">Her phone buzzes. The smile drops off her face for one beat.</div><div class="transition">CUT TO:</div></div>' +
      '<h3>Rules of thumb</h3><div class="ln-rules">' + RULES.map(function (r) { return '<div><b>' + esc(r[0]) + '</b>' + esc(r[1]) + '</div>'; }).join('') + '</div>' +
      '<p class="muted">In the Pages tab, Enter and Tab move between elements the way professional software does: after a character name comes dialogue, Tab on an empty action line makes a character, and typing INT. turns a line into a scene heading.</p></section>' +

      '<section class="ln-sec" id="ln-circle"><div class="eyebrow">02 · Structure</div><h2>The Story Circle</h2><p>Dan Harmon, co-creator of Rick and Morty and Community, boiled Joseph Campbell\'s hero\'s journey down to eight steps on a circle. His writers\' rooms famously break episodes on it: a full circle can fit in eleven minutes or two hours, and the A story and B story can each run their own.</p>' +
      '<div class="ln-circle"><div class="os-night" data-wheel></div><div class="ln-step" data-step></div></div>' +
      '<h3>Why it works</h3><ul><li><b>Order above, chaos below.</b> Steps 1 and 2 (and 8) are the familiar world; steps 3 to 7 descend into the unfamiliar and climb back out. Every story is a trip down and back up.</li>' +
      '<li><b>Opposites face each other.</b> You (1) and Find (5) mirror each other, as do Need (2) and Take (6), Go (3) and Return (7), Search (4) and Change (8). If step 5 doesn\'t echo step 1, the circle wobbles.</li>' +
      '<li><b>Get, then pay.</b> The hero gets what they wanted at the halfway point, and it costs them. That cost is what changes them.</li>' +
      '<li><b>It\'s fractal.</b> A whole film, an act, a scene, even a single joke can run the circle.</li></ul>' +
      '<p>Try it: the <b>There Is No Bull</b> sample is an eight-scene circle that grew from a single Spark. Every project shows its scene cards on the wheel, so an empty step is impossible to miss.</p></section>' +

      '<section class="ln-sec" id="ln-structures"><div class="eyebrow">03 · Structure</div><h2>The other structures</h2><p>Every structure describes the same animal from a different angle. Pick the one that helps you think; switch later and OScreenplay moves each card to the nearest beat. The percentages show where each beat usually falls.</p>' +
      OS.STRUCTURE_ORDER.filter(function (k) { return k !== 'circle'; }).map(structureHtml).join('') + '</section>' +

      '<section class="ln-sec" id="ln-godfather"><div class="eyebrow">04 · Masterclass</div><h2>What The Godfather teaches</h2><p>Francis Ford Coppola and Mario Puzo\'s 1972 film is studied in film schools for its structure, its scenes and its arc. Here are eleven lessons you can use tomorrow, scene by scene. (Watch the film; the lessons describe it rather than quote it.)</p>' +
      LESSONS.map(function (l, i) { return '<div class="ln-lesson"><div class="no">' + (i + 1) + '</div><div><h4>' + esc(l[0]) + '</h4><p>' + esc(l[1]) + '</p><p class="take"><b>Use it:</b> ' + esc(l[2]) + '</p></div></div>'; }).join('') + '</section>' +

      '<section class="ln-sec" id="ln-character"><div class="eyebrow">05 · Character</div><h2>Character craft</h2><p>A character is a set of pressures. OScreenplay asks for the ones that produce behaviour:</p>' +
      '<div class="ln-chain"><span>Wound<small>what happened</small></span><i>→</i><span>Lie<small>what they believe</small></span><i>→</i><span>Flaw<small>how it shows</small></span><i>→</i><span>Want<small>what they chase</small></span><i>↔</i><span>Need<small>what would heal them</small></span></div>' +
      '<ul><li><b>Want and need pull apart.</b> The want drives the plot (get the money, win the duel); the need drives the arc (accept help, stop running). The climax forces a choice between them.</li>' +
      '<li><b>Arcs come in three shapes.</b> Positive: the hero unlearns the lie. Negative: the hero doubles down and is corrupted (Michael Corleone). Flat: the hero already knows the truth and changes the world around them.</li>' +
      '<li><b>Personality is a tool, not a horoscope.</b> The Big Five (openness, conscientiousness, extraversion, agreeableness, neuroticism) predict how people react under stress. The reaction engine in every character uses them, with the flaw, fear and values, to suggest what that person would logically do.</li>' +
      '<li><b>Every villain is the hero of their own story.</b> Give the antagonist a want, a wound and a reason they think they\'re right.</li>' +
      '<li><b>Voice is character.</b> Cover the names on a page of dialogue: can you still tell who\'s talking?</li>' +
      '<li><b>Conditions and illnesses</b> belong to people, not plots. Research them, talk to people who live with them, and never use them as a punchline or a twist.</li></ul></section>' +

      '<section class="ln-sec" id="ln-scenes"><div class="eyebrow">06 · Scenes</div><h2>Scene craft</h2><ul>' +
      '<li><b>Goal, conflict, outcome.</b> Someone wants something in this scene; someone or something is in the way; it ends with "yes, but", "no, and", or a clean win or loss.</li>' +
      '<li><b>Every scene turns.</b> A value (safety, love, hope) starts positive or negative and ends differently. If nothing changed, the scene can go. Each scene card has a charge in and a charge out; the Storyline draws them as your story\'s shape.</li>' +
      '<li><b>Arrive late, leave early.</b> Skip the hellos and the goodbyes; cut in when the conflict is already running.</li>' +
      '<li><b>Two jobs per scene.</b> Move the plot and reveal character, or plant a setup and pay off another.</li>' +
      '<li><b>Alternate.</b> Up, down, up. Four bleak scenes in a row numb an audience; the doctor flags it.</li>' +
      '<li><b>Tell it out of order on purpose.</b> The Chronology holds what happened; the Storyline holds what we see. A flash-forward opening, a flashback at the midpoint: the braid shows each one.</li></ul>' +
      '<p>Stuck? The <a href="#ideas/scenes" data-go="ideas/scenes">scene recipes</a> and the <a href="#ideas/complications" data-go="ideas/complications">complications deck</a> are made for this.</p></section>' +

      '<section class="ln-sec" id="ln-dialogue"><div class="eyebrow">07 · Dialogue</div><h2>Dialogue</h2><ul>' +
      '<li><b>People rarely say what they mean.</b> Write the surface, and let the subtext do the work. "Sit." can mean "I love you", "obey me" and "I\'m dying".</li>' +
      '<li><b>Never let characters tell each other what they both know.</b> If the audience needs it, create a reason for someone not to know it.</li>' +
      '<li><b>Conflict in every exchange.</b> Even friends disagree about something small.</li>' +
      '<li><b>Short beats long.</b> Interruptions, unfinished sentences and silence are dialogue too.</li>' +
      '<li><b>Read it out loud.</b> Your ear catches what your eye forgives.</li></ul></section>' +

      '<section class="ln-sec" id="ln-glossary"><div class="eyebrow">08 · Words</div><h2>Glossary</h2><div class="ln-gloss">' + GLOSSARY.map(function (g) { return '<div><b>' + esc(g[0]) + '</b>' + esc(g[1]) + '</div>'; }).join('') + '</div></section>' +

      '<section class="ln-sec" id="ln-workflow"><div class="eyebrow">09 · The app</div><h2>How OScreenplay works</h2><div class="ln-flow">' +
      [['spark', 'Spark', 'Generate an abstract, swap the words, develop it: you get a logline, a cast, a chronology and eight scene cards.'],
       ['home', 'Overview', 'Logline builder, theme, structure and the script doctor\'s notes with a readiness score.'],
       ['home', 'Cast', 'Want, need, wound, lie, flaw, fear, values, voice, Big Five. Ask how they\'d react to a betrayal or a windfall.'],
       ['home', 'Web', 'Connect characters with relationships and tension. Lonely characters get flagged.'],
       ['home', 'Chronology', 'Events in the order they happened, backstory included. Rebuild it from scene cards in one click.'],
       ['home', 'Storyline', 'Scene cards in telling order, grouped by beat, with the braid, the story shape and setups and payoffs.'],
       ['home', 'Pages', 'Write the script, or draft it from the cards. Export Fountain, print to PDF.']].map(function (s) {
        return '<a class="ui-card" href="#' + s[0] + '" data-go="' + s[0] + '"><div><b>' + esc(s[1]) + '</b><span>' + esc(s[2]) + '</span></div></a>';
      }).join('') + '</div></section></article></div></div>';

    function drawCircle() {
      view.querySelector('[data-wheel]').innerHTML = OS.svg.wheel({ night: true, active: active, labels: true });
      var i = circleBeats.map(function (b) { return b.k; }).indexOf(active), b = circleBeats[i], opp = circleBeats[(i + 4) % 8];
      view.querySelector('[data-step]').innerHTML = '<span class="os-tc">Step ' + (i + 1) + ' of 8 · ' + (i < 2 || i === 7 ? 'order' : 'chaos') + '</span><h4>' + esc(b.n) + '</h4><p><b>' + esc(b.d) + '</b></p><p>' + esc(b.q) + '</p>' +
        '<p class="muted small">Mirrors step ' + ((i + 4) % 8 + 1) + ', ' + esc(opp.n) + ': ' + esc(opp.d.toLowerCase()) + '</p>' +
        '<div class="ui-row"><button class="ui-btn sm" data-step-move="-1">' + UI.icon('back') + 'Previous</button><button class="ui-btn sm" data-step-move="1">Next ' + UI.icon('arrow') + '</button></div>';
    }
    drawCircle();
    view.addEventListener('click', function (e) {
      var seg = e.target.closest('[data-wheel] [data-beat]');
      if (seg) { active = seg.getAttribute('data-beat'); drawCircle(); return; }
      var mv = e.target.closest('[data-step-move]');
      if (mv) { var i = circleBeats.map(function (b) { return b.k; }).indexOf(active); active = circleBeats[(i + 8 + +mv.getAttribute('data-step-move')) % 8].k; drawCircle(); return; }
      var a = e.target.closest('[data-sec]');
      if (a) { e.preventDefault(); go(a.getAttribute('data-sec')); history.replaceState(null, '', '#learn/' + a.getAttribute('data-sec')); }
    });
    function go(sec, instant) {
      var el = view.querySelector('#ln-' + sec);
      if (el) el.scrollIntoView({ behavior: instant ? 'auto' : 'smooth', block: 'start' });
      view.querySelectorAll('[data-sec]').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-sec') === sec); });
    }
    var onScroll = function () {
      var cur = SECTIONS[0][0];
      SECTIONS.forEach(function (s) { var el = view.querySelector('#ln-' + s[0]); if (el && el.getBoundingClientRect().top < 140) cur = s[0]; });
      view.querySelectorAll('[data-sec]').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-sec') === cur); });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    if (ctx.args[0]) setTimeout(function () { go(ctx.args[0], true); }, 60); else onScroll();
    return { ready: Promise.resolve(), destroy: function () { window.removeEventListener('scroll', onScroll); } };
  });
})();

/* ===== profile.html ===== */
(function () {
  var esc = UI.esc;
  UI.page('profile', { title: 'Your profile', auth: 'user' }, function (view, ctx) {
    var me = ctx.me;
    view.innerHTML = '<div class="ui-wrap ui-narrow"><div class="pf-head"><span class="ui-avatar">' + esc(UI.initials(me.name)) + '</span>' +
      '<div><h1>' + esc(me.name) + '</h1><div class="muted">' + esc(me.email) + (me.joined ? ' · member since ' + esc(UI.fmtDate(me.joined, { month: 'long', year: 'numeric' })) : '') + '</div></div></div>' +
      '<div class="pf-grid"><form class="ui-card ui-stack" data-name><h3>Your name</h3><label class="ui-field"><span>Shown to other people</span>' +
      '<input type="text" name="name" value="' + esc(me.name) + '" maxlength="60" required></label><button class="ui-btn primary" type="submit">Save</button></form>' +
      '<div class="ui-card ui-stack"><h3>Appearance</h3><p class="muted small">Follow your device, or pick one.</p><div data-theme-box></div>' +
      '<h3 style="margin-top:22px">Password</h3><p class="muted small">We\'ll email you a link to choose a new one.</p>' +
      '<button class="ui-btn" data-reset>' + UI.icon('mail') + 'Email me a reset link</button></div></div>' +
      '<div class="ui-card" style="margin-top:16px"><div class="pf-links">' +
      (me.is_admin ? '<a href="#admin" data-go="admin">' + UI.icon('shield') + 'Admin</a>' : '') +
      '<button data-feedback>' + UI.icon('chat') + 'Submit feedback</button>' +
      '<button data-lk-open="overview">' + UI.icon('lock') + 'Privacy &amp; Terms, and your data</button>' +
      '<button data-signout-here>' + UI.icon('logout') + 'Sign out</button></div></div></div>';
    function themeBox() {
      var t = UI.theme();
      view.querySelector('[data-theme-box]').innerHTML = '<div class="ui-seg">' + [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']].map(function (o) {
        return '<button type="button" data-theme-pick="' + o[0] + '" class="' + (t === o[0] ? 'on' : '') + '">' + o[1] + '</button>';
      }).join('') + '</div>';
    }
    themeBox();
    view.addEventListener('click', function (e) {
      var t = e.target.closest('[data-theme-pick]');
      if (t) { UI.setTheme(t.getAttribute('data-theme-pick')); themeBox(); UI.renderChrome(); return; }
      if (e.target.closest('[data-reset]')) {
        UI.busy(e.target.closest('[data-reset]'), UI.auth('reset', { email: me.email })).then(function (r) { UI.toast(r.message, 'ok'); });
      }
      if (e.target.closest('[data-signout-here]')) UI.auth('logout');
    });
    view.querySelector('[data-name]').addEventListener('submit', function (e) {
      e.preventDefault();
      var v = UI.formData(e.target);
      UI.busy(e.target.querySelector('[type=submit]'), UI.api('update_profile', v.name)).then(function (r) {
        UI.setMe(r.me); ctx.me = r.me; UI.toast('Saved', 'ok');
        view.querySelector('.pf-head h1').textContent = r.me.name;
      });
    });
  });
})();

/* ===== project.html ===== */
(function () {
  var esc = UI.esc;
  var TABS = [['overview', 'Overview', 'grid'], ['cast', 'Cast', 'users'], ['web', 'Web', 'web'], ['chronology', 'Chronology', 'timeline'],
    ['storyline', 'Storyline', 'film'], ['pages', 'Pages', 'pages']];
  OS.cache = OS.cache || {};

  UI.page('project', { title: function () { var p = OS.cache.project; return p ? p.title : 'Project'; }, auth: 'user' }, function (view, ctx) {
    var id = ctx.args[0], tab = TABS.some(function (t) { return t[0] === ctx.args[1]; }) ? ctx.args[1] : 'overview', sub = ctx.args[2] || null;
    var P = null, T = null, dirty = false, timer = null, inflight = null, again = false, current = null;
    view.innerHTML = '<div class="ui-wrap"><div class="ui-skel" style="height:70px"></div><div class="ui-skel" style="height:420px;margin-top:16px"></div></div>';

    function status(kind, text) {
      var el = view.querySelector('[data-save]');
      if (!el) return;
      el.className = 'pj-save ' + kind;
      el.innerHTML = '<i></i>' + esc(text);
    }
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
        if (!err.expected) console.warn(err);
        else UI.toast(err.message, 'error');
      });
      return inflight;
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
    function refreshBar() {
      var d = OS.doctor(P), ring = view.querySelector('[data-ring]');
      if (ring) { ring.style.setProperty('--v', d.score); ring.querySelector('b').textContent = d.score; }
      var counts = { cast: P.doc.characters.length, web: P.doc.relations.length, chronology: P.doc.events.length, storyline: P.doc.scenes.length, pages: OS.script.pages(P.doc.script) };
      view.querySelectorAll('[data-tab]').forEach(function (a) { var c = a.querySelector('.count'); var n = counts[a.getAttribute('data-tab')]; if (c) c.textContent = n || ''; if (c) c.hidden = !n; });
      document.title = (P.title || 'Untitled') + ' · ' + UI.config.name;
    }
    function go(t, s) {
      tab = t; sub = s || null;
      history.replaceState(null, '', UI.hashFor('project', P.id, tab, sub));
      view.querySelectorAll('[data-tab]').forEach(function (a) { a.classList.toggle('on', a.getAttribute('data-tab') === tab); });
      drawTab();
      var bar = view.querySelector('.pj-tabs');
      if (bar && window.scrollY > bar.offsetTop) window.scrollTo(0, Math.max(0, bar.offsetTop - 70));
    }
    function drawTab() {
      if (current && current.destroy) { try { current.destroy(); } catch (e) { console.error(e); } }
      var body = view.querySelector('[data-tabbody]'), el = document.createElement('div');
      body.innerHTML = ''; body.appendChild(el);
      T.sub = sub;
      current = OS.tabs[tab](el, T) || null;
    }
    function shell() {
      view.innerHTML = '<div class="ui-wrap" style="padding-top:22px">' +
        '<div class="pj-bar"><span class="pj-dot" style="' + OS.posterStyle(P.color) + '"></span><div class="pj-title"><span class="os-tc">' +
        esc((OS.FORMATS[P.format] || OS.FORMATS.feature).name) + (P.genre ? ' · ' + esc(P.genre) : '') + (P.sample ? ' · sample by ' + esc(P.author || 'a writer') : '') + '</span>' +
        '<input type="text" data-title value="' + esc(P.title) + '" maxlength="120" aria-label="Title"' + '></div>' +
        '<span class="pj-save" data-save><i></i>' + (P.readonly ? 'Read-only sample' : 'Saved') + '</span>' +
        '<a class="pj-score" href="#" data-go-tab="overview" title="Readiness, from the script doctor"><span class="os-ring" data-ring style="--v:0"><b>0</b></span><span class="muted">ready</span></a></div>' +
        (P.readonly ? '<div class="pj-ro"><span>' + UI.icon('lock') + ' <b>You\'re studying a sample.</b> Change anything to see how the tools react; nothing is saved until you make your own copy.</span>' +
          '<button class="ui-btn primary sm" data-copy-sample>' + UI.icon('copy') + 'Make it mine</button></div>' : '') +
        '<nav class="ui-tabs pj-tabs" aria-label="Project">' + TABS.map(function (t) {
          return '<a href="#project/' + esc(P.id) + '/' + t[0] + '" data-tab="' + t[0] + '" class="' + (t[0] === tab ? 'on' : '') + '">' + UI.icon(t[2]) + t[1] + '<span class="count" hidden></span></a>';
        }).join('') + '</nav><div data-tabbody></div></div>';
      refreshBar();
    }

    view.addEventListener('click', function (e) {
      var a = e.target.closest('[data-tab]');
      if (a && view.querySelector('.pj-tabs').contains(a)) { e.preventDefault(); go(a.getAttribute('data-tab')); return; }
      var g = e.target.closest('[data-go-tab]');
      if (g) { e.preventDefault(); var parts = g.getAttribute('data-go-tab').split('/'); go(parts[0], parts[1]); return; }
      var cp = e.target.closest('[data-copy-sample]');
      if (cp) UI.busy(cp, UI.api('duplicate_project', P.id)).then(function (r) { UI.toast('"' + r.project.title + '" is now in your library.', 'ok'); OS.cache = {}; UI.go('project', r.project.id, tab); });
    });
    view.addEventListener('input', function (e) {
      if (e.target.matches('[data-title]')) { P.title = e.target.value; touch(); }
    });

    function start(project) {
      P = project;
      P.doc = OS.normalize(P.doc);
      OS.cache = { id: P.id, project: P };
      T = { P: P, doc: P.doc, me: ctx.me, readonly: !!P.readonly, touch: touch, go: go, flush: flush, sortScenes: sortScenes, refreshBar: refreshBar,
        setStructure: function (k) { if (k === P.structure) return; OS.remapBeats(P.doc.scenes, P.structure, k); P.structure = k; sortScenes(); touch(); },
        retitle: function () { var i = view.querySelector('[data-title]'); if (i) i.value = P.title; refreshBar(); } };
      shell();
      drawTab();
    }
    var ready = OS.cache.id === id && OS.cache.project ? Promise.resolve(start(OS.cache.project))
      : UI.api('get_project', id).then(function (r) { start(r.project); });
    window.addEventListener('beforeunload', warn);
    function warn(e) { if (dirty && P && !P.readonly) { flush(); e.preventDefault(); e.returnValue = ''; } }
    return { ready: ready, destroy: function () {
      window.removeEventListener('beforeunload', warn);
      if (current && current.destroy) { try { current.destroy(); } catch (e) { console.error(e); } }
      if (P && dirty) flush();
      if (P && P.readonly) OS.cache = {};
    } };
  });
})();

/* ===== spark.html ===== */
(function () {
  var esc = UI.esc;
  UI.page('spark', { title: 'Spark', nav: 'Spark', icon: 'sparkle', auth: 'user', order: 20 }, function (view, ctx) {
    var st = OS.spark.fresh(), history = [], vault = [], format = UI.store.get('sparkFormat', 'feature');
    var pending = UI.store.get('pendingSpark', null);
    if (pending && pending.slots) { st.slots = pending.slots; st.tpl = pending.tpl || 'until'; st.genre = pending.genre || 'any'; st.flavor = pending.flavor; UI.store.set('pendingSpark', null); }
    else { st.genre = UI.store.get('sparkGenre', 'any'); st.weird = UI.store.get('sparkWeird', 20); st.tpl = UI.store.get('sparkTpl', 'until'); OS.spark.generate(st); }

    view.innerHTML = '<div class="ui-wrap"><div class="ui-page-head"><div><div class="os-tc"><span class="rec"></span>Spark · the story slot machine</div>' +
      '<h1 style="margin-top:10px">Pull a story out of thin air.</h1><p class="muted">Every highlighted word is a slot. Click it to swap, lock what you love, pull again for the rest.</p></div></div>' +
      '<div class="sk-grid"><div><div class="os-night sk-machine" data-machine></div>' +
      '<div class="sk-become" data-become></div></div>' +
      '<aside class="ui-stack"><div class="ui-card sk-ctrl" data-ctrl></div><div class="ui-card"><h3>Every slot</h3><p class="os-help" style="margin:-4px 0 8px">Roll one slot at a time, or lock it.</p><div class="sk-slots" data-slots></div></div></aside></div>' +
      '<div data-history style="margin-top:26px"></div>' +
      '<div style="margin-top:30px"><div class="ui-row between"><h2 style="margin:0">Your vault</h2><span class="muted small" data-vcount></span></div><p class="muted">Sparks you saved. Reopen one to keep swapping, or develop it into a project.</p><div class="sk-vault" data-vault><div class="ui-skel"></div></div></div></div>';
    var machine = view.querySelector('[data-machine]');

    function drawMachine(changed) {
      machine.innerHTML = '<div class="head"><span class="os-tc"><span class="rec"></span>' + esc((OS.GENRE[st.flavor] || {}).name || 'Any genre') + ' · ' + esc(OS.spark.TEMPLATES[st.tpl].name) + '</span>' +
        '<span class="os-tc">' + OS.words(OS.spark.text(st)) + ' words</span></div>' +
        '<h2 class="sk-title"><span role="button" tabindex="0" class="os-chip' + (st.locked.title ? ' locked' : '') + '" data-slot="title">' + esc(st.slots.title) + '</span></h2>' +
        '<p class="sk-abs">' + OS.spark.render(st) + '</p>' +
        '<div class="sk-act"><button class="ui-btn primary lg sk-lever" data-pull>' + UI.icon('dice') + 'Pull</button>' +
        '<button class="ui-btn night" data-undo' + (history.length ? '' : ' disabled') + '>' + UI.icon('back') + 'Back</button><span class="grow"></span>' +
        '<button class="ui-btn night" data-save>' + UI.icon('heart') + 'Save</button><button class="ui-btn tungsten" data-develop>' + UI.icon('arrow') + 'Develop</button></div>';
      if (changed) { var c = machine.querySelector('[data-slot="' + changed + '"]'); if (c) c.classList.add('flash'); }
    }
    function drawCtrl() {
      view.querySelector('[data-ctrl]').innerHTML = '<label class="ui-field"><span>Genre</span><select data-genre><option value="any">Any (surprise me)</option>' +
        OS.GENRES.map(function (g) { return '<option value="' + g[0] + '"' + (st.genre === g[0] ? ' selected' : '') + '>' + esc(g[1]) + '</option>'; }).join('') + '</select></label>' +
        '<label><span>Weirdness <em class="muted" data-wv>' + st.weird + '</em></span><input type="range" min="0" max="100" step="5" value="' + st.weird + '" data-weird>' +
        '<span class="os-help" style="display:flex;justify-content:space-between;font-weight:400"><i>makes sense</i><i>vampire loves cow</i></span></label>' +
        '<div><span style="font-weight:600;font-size:.88rem;display:block;margin-bottom:6px">Story shape</span><div class="sk-shapes">' +
        Object.keys(OS.spark.TEMPLATES).map(function (k) { return '<button type="button" data-tpl="' + k + '" class="' + (st.tpl === k ? 'on' : '') + '">' + esc(OS.spark.TEMPLATES[k].name) + '</button>'; }).join('') + '</div></div>' +
        '<label class="ui-field"><span>Develop as</span><select data-format>' + Object.keys(OS.FORMATS).map(function (k) {
          return '<option value="' + k + '"' + (format === k ? ' selected' : '') + '>' + esc(OS.FORMATS[k].name) + '</option>'; }).join('') + '</select></label>';
    }
    function drawSlots() {
      view.querySelector('[data-slots]').innerHTML = OS.spark.ORDER.map(function (k) {
        var v = k === 'twist' ? OS.spark.resolve(st, st.slots[k]) : st.slots[k];
        return '<div class="sk-slot"><span class="k">' + esc(OS.spark.SLOTS[k][0]) + '</span><span class="v">' + esc(v || '') + '</span>' +
          '<button type="button" class="ui-btn" data-roll="' + k + '" aria-label="Roll ' + esc(OS.spark.SLOTS[k][0]) + '" title="Roll this slot">' + UI.icon('dice') + '</button>' +
          '<button type="button" class="ui-btn' + (st.locked[k] ? ' on' : '') + '" data-lock="' + k + '" aria-label="Lock ' + esc(OS.spark.SLOTS[k][0]) + '" title="Lock">' + UI.icon('lock') + '</button></div>';
      }).join('');
    }
    function drawBecome() {
      var lines = OS.spark.circle(st), cast = OS.spark.cast(st);
      view.querySelector('[data-become]').innerHTML =
        '<div class="ui-card"><div class="eyebrow">Logline</div><p class="sk-logline">' + esc(OS.spark.logline(st)) + '</p><button class="ui-btn sm" data-copy>' + UI.icon('copy') + 'Copy</button>' +
        '<div class="eyebrow" style="margin-top:18px">Theme</div><p style="margin:0">' + esc(OS.cap(st.slots.truth)) + '.</p></div>' +
        '<div class="ui-card sk-circle"><div class="eyebrow">Story Circle</div><ol>' + lines.map(function (l, i) { return '<li><b>' + esc(OS.beatsOf('circle')[i].n) + ':</b> ' + esc(l) + '</li>'; }).join('') + '</ol></div>' +
        '<div class="ui-card"><div class="eyebrow">Starter cast</div><div class="sk-cast">' + cast.map(function (c) {
          return '<div class="who"><span class="ui-avatar" style="background:' + OS.roleColor(c.role) + ';color:#fff">' + esc(UI.initials(c.name)) + '</span><div><b>' + esc(c.name) + '</b><span>' +
            esc(OS.ROLE[c.role] + (c.occupation ? ' · ' + c.occupation : '') + (c.want ? ' · ' + c.want : '')) + '</span></div></div>';
        }).join('') + '</div><p class="os-help" style="margin-top:12px">Names and details are fresh each time you develop. Everything is editable later.</p></div>';
    }
    function drawHistory() {
      var h = view.querySelector('[data-history]');
      h.innerHTML = history.length ? '<div class="eyebrow">Earlier pulls</div><div class="sk-history">' + history.slice().reverse().map(function (x, i) {
        return '<button type="button" data-restore="' + (history.length - 1 - i) + '"><em>' + esc(x.slots.title) + '</em>' + esc(OS.cap(x.slots.adj) + ' ' + x.slots.hero) + '</button>';
      }).join('') + '</div>' : '';
    }
    function drawAll(changed) { drawMachine(changed); drawSlots(); drawBecome(); drawHistory(); }
    function snapshot() { history.push(JSON.parse(JSON.stringify({ slots: st.slots, locked: st.locked, tpl: st.tpl, flavor: st.flavor }))); if (history.length > 20) history.shift(); }
    function pull() { snapshot(); OS.spark.generate(st); drawAll(); }

    function drawVault() {
      var box = view.querySelector('[data-vault]');
      view.querySelector('[data-vcount]').textContent = vault.length ? UI.plural(vault.length, 'spark') : '';
      box.innerHTML = vault.length ? vault.map(function (s) {
        return '<article class="ui-item" data-id="' + esc(s.id) + '"><div class="grow"><h3>' + esc(s.title) + '</h3><p>' + esc(s.text) + '</p>' +
          '<p class="small faint" style="margin-top:6px">' + esc(UI.ago(s.created)) + '</p></div><div class="ui-row" style="flex-direction:column;align-items:stretch">' +
          '<button class="ui-btn sm" data-open-spark>' + UI.icon('refresh') + 'Reopen</button><button class="ui-btn sm" data-dev-spark>' + UI.icon('arrow') + 'Develop</button>' +
          '<button class="ui-btn sm ghost danger" data-del-spark aria-label="Delete">' + UI.icon('trash') + '</button></div></article>';
      }).join('') : '<div class="ui-empty">' + UI.icon('heart') + '<h3>Nothing saved yet</h3><p>Hit Save on a spark you like. It waits here until you\'re ready.</p></div>';
    }
    function fromSaved(s) {
      var slots = {}, out = OS.spark.fresh();
      Object.keys(s.slots || {}).forEach(function (k) { if (k.charAt(0) !== '_') slots[k] = s.slots[k]; });
      out.slots = slots; out.tpl = s.slots._tpl || 'until'; out.flavor = s.slots._flavor || 'dr'; out.genre = s.slots._genre || 'any';
      return out;
    }
    function develop(spark) {
      var seed = OS.spark.toSeed(spark, { format: format });
      return UI.api('create_project', seed).then(function (r) {
        UI.toast('Developed into "' + r.project.title + '". Your cast, timeline and cards are waiting.', 'ok');
        UI.go('project', r.project.id, 'overview');
      });
    }

    OS.sparkMachine(machine, st, function (changed) { drawAll(changed); });
    view.addEventListener('click', function (e) {
      var t;
      if (e.target.closest('[data-pull]')) return pull();
      if (e.target.closest('[data-undo]')) { var prev = history.pop(); if (prev) { st.slots = prev.slots; st.locked = prev.locked; st.tpl = prev.tpl; st.flavor = prev.flavor; drawAll(); drawCtrl(); } return; }
      if ((t = e.target.closest('[data-restore]'))) { var h = history[+t.getAttribute('data-restore')]; snapshot(); st.slots = JSON.parse(JSON.stringify(h.slots)); st.tpl = h.tpl; st.flavor = h.flavor; drawAll(); drawCtrl(); return; }
      if ((t = e.target.closest('[data-tpl]'))) { st.tpl = t.getAttribute('data-tpl'); UI.store.set('sparkTpl', st.tpl); drawCtrl(); drawMachine(); return; }
      if ((t = e.target.closest('[data-roll]'))) {
        var k = t.getAttribute('data-roll'), opts = OS.spark.options(k, st, 1);
        if (opts[0]) { snapshot(); OS.spark.set(st, k, opts[0]); drawAll(k); }
        return;
      }
      if ((t = e.target.closest('[data-lock]'))) { var key = t.getAttribute('data-lock'); st.locked[key] = !st.locked[key]; drawAll(); return; }
      if (e.target.closest('[data-copy]')) { try { navigator.clipboard.writeText(OS.spark.logline(st)); UI.toast('Logline copied', 'ok'); } catch (err) { UI.toast('Copy it from the card.'); } return; }
      if ((t = e.target.closest('[data-save]'))) {
        var slots = Object.assign({}, st.slots, { _tpl: st.tpl, _genre: st.genre, _flavor: st.flavor });
        UI.busy(t, UI.api('save_spark', st.slots.title, OS.spark.text(st), slots)).then(function (r) { vault.unshift(r.spark); drawVault(); UI.toast('Saved to your vault', 'ok'); });
        return;
      }
      if ((t = e.target.closest('[data-develop]'))) { UI.busy(t, develop(st)); return; }
      var card = e.target.closest('[data-id]');
      if (card && view.querySelector('[data-vault]').contains(card)) {
        var sp = vault.filter(function (x) { return x.id === card.getAttribute('data-id'); })[0];
        if (e.target.closest('[data-open-spark]')) { snapshot(); var o = fromSaved(sp); st.slots = o.slots; st.tpl = o.tpl; st.flavor = o.flavor; st.locked = {}; drawAll(); drawCtrl(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
        else if (e.target.closest('[data-dev-spark]')) UI.busy(e.target.closest('[data-dev-spark]'), develop(fromSaved(sp)));
        else if (e.target.closest('[data-del-spark]')) {
          UI.confirm({ title: 'Delete this spark?', text: sp.title, ok: 'Delete', danger: true }).then(function (yes) {
            if (yes) UI.api('delete_spark', sp.id).then(function () { vault = vault.filter(function (x) { return x.id !== sp.id; }); drawVault(); });
          });
        }
      }
    });
    view.addEventListener('change', function (e) {
      if (e.target.matches('[data-genre]')) { st.genre = e.target.value; UI.store.set('sparkGenre', st.genre); pull(); }
      if (e.target.matches('[data-format]')) { format = e.target.value; UI.store.set('sparkFormat', format); }
    });
    view.addEventListener('input', function (e) {
      if (e.target.matches('[data-weird]')) { st.weird = +e.target.value; view.querySelector('[data-wv]').textContent = st.weird; UI.store.set('sparkWeird', st.weird); }
    });
    drawAll(); drawCtrl();
    return UI.api('list_sparks').then(function (r) { vault = r.sparks; drawVault(); });
  });
})();
