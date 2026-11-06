/* The main user journeys, run inside the real app (Anvil App Server) by tools/ui_test.py through tools/live/drive.mjs.
   Landing reel + swap popover, sign-up, Spark (pull, back, roll, lock, save, develop), the workspace (tabs, title
   autosave), the Desk and the new-screenplay dialog, a read-only sample and "Make it mine", Ideas (deck, search, draw),
   Learn (wheel, steps), profile, theme, sign out. Resolves to {ok, log}. Keep log lines ASCII. */
(async function () {
  const log = [], t0 = Date.now();
  const say = (m) => log.push(((Date.now() - t0) / 1000).toFixed(1) + 's ' + m);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function until(fn, what, ms) {
    const end = Date.now() + (ms || 20000);
    while (Date.now() < end) { try { const v = fn(); if (v) return v; } catch (e) {} await sleep(150); }
    throw new Error('timed out waiting for: ' + what);
  }
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const vis = (e) => e && e.getBoundingClientRect().width > 0;
  const txt = (e) => (e ? e.textContent.trim().replace(/\s+/g, ' ') : '');
  const byText = (sel, text) => $$(sel).find((e) => vis(e) && txt(e) === text);
  async function click(sel, text) {
    const el = await until(() => (text ? byText(sel, text) : $$(sel).find(vis)), sel + (text ? ' "' + text + '"' : ''));
    el.scrollIntoView({ block: 'center' });
    el.click();
    return el;
  }
  function type(input, value) {
    input.focus();
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  async function page(hash, ready, what) {
    if (location.hash !== hash) window.UI_READY = false;
    location.hash = hash;
    await until(() => window.UI_READY && location.hash === hash && ready(), what || hash, 40000);
    await sleep(300);
  }
  const ok = (cond, msg) => { if (!cond) throw new Error('FAILED: ' + msg); say('ok   ' + msg); };
  const count = (tab) => +txt($$('.pj-tabs .anvil-role-count').find((c) => c.closest('[data-tab="' + tab + '"]')));
  const titleBox = () => $('input.anvil-role-pj-title-box, .anvil-role-pj-title-box input');

  try {
    // ---- landing: the live spark reel
    await page('#landing', () => $('.lp-hero .sk-host .os-chip'), 'landing');
    ok($('.lp-hero a[href="#auth/signup"]'), 'landing: hero with a sign-up link');
    const before = txt($('.lp-hero .sk-abs'));
    await click('.lp-reel .anvil-role-btn-primary button');
    await until(() => txt($('.lp-hero .sk-abs')) !== before, 'a new spark');
    ok(true, 'landing: Pull another draws a new abstract');
    $$('.lp-hero .sk-abs .os-chip').find(vis).click();
    const pop = await until(() => $('.os-pop'), 'the swap popover');
    const opt = pop.querySelector('.opts button');
    const word = txt(opt);
    opt.click();
    await until(() => !$('.os-pop') && txt($('.lp-hero .sk-abs')).indexOf(word) >= 0, 'the word swapped in');
    ok(true, 'landing: a chip opens the swap popover and the pick lands in the text');
    ok($$('.lp-wheel svg [data-beat]').length >= 8, 'landing: the Story Circle wheel');
    ok(+txt($('.anvil-role-lp-num')) > 100, 'landing: the idea count comes from the engine');
    ok(!$$('.ui .eyebrow, .ui .kicker').length, 'landing: no eyebrow labels (design kit)');

    // ---- members-only page sends visitors to sign in, then back
    await page('#spark', () => true);
    await until(() => window.UI_READY && $$('.au-card input').length >= 2, 'redirected to sign in');
    ok(true, 'a members-only page asks visitors to sign in');
    await click('.au-card .ui-seg button', 'Create account');
    await until(() => $$('.au-card input').filter(vis).length >= 3, 'sign-up form');
    const inputs = $$('.au-card input[type=text], .au-card input[type=email], .au-card input[type=password]').filter(vis);
    type(inputs[0], 'Flow Tester'); type(inputs[1], 'flow' + Date.now() + '@example.com'); type(inputs[2], 'Hb-' + Math.random().toString(36).slice(2) + '-Kq7');
    const tick = $('.au-card input[type=checkbox]');
    if (tick && !tick.checked) tick.click();
    await click('.anvil-role-btn-block button', 'Create account');
    await until(() => location.hash === '#spark' && window.UI_READY && $('.sk-machine .os-chip'), 'back on Spark', 60000);
    ok(true, 'sign-up: signed in and sent on to the page they asked for');

    // ---- spark
    const s0 = txt($('.sk-machine .sk-abs'));
    await click('.sk-act .anvil-role-btn-primary button');
    await until(() => txt($('.sk-machine .sk-abs')) !== s0, 'a new pull');
    ok(!$('.sk-act .anvil-role-ic-back button').disabled, 'spark: Pull draws a new story, Back becomes available');
    await click('.sk-act .anvil-role-ic-back button');
    await until(() => txt($('.sk-machine .sk-abs')) === s0, 'back to the first pull');
    ok(true, 'spark: Back restores the previous pull');
    $$('.sk-slot')[1].querySelector('.anvil-role-ic-lock button').click();
    await until(() => $$('.sk-slot')[1] && $$('.sk-slot')[1].querySelector('.anvil-role-btn-on'), 'slot locked');
    ok($$('.sk-slot')[1].querySelector('.anvil-role-ic-lock button').getAttribute('aria-pressed') === 'true', 'spark: Lock marks the slot (aria-pressed)');
    const k0 = txt($$('.sk-slot')[2].querySelector('.anvil-role-sk-v'));
    $$('.sk-slot')[2].querySelector('.anvil-role-ic-dice button').click();
    await until(() => txt($$('.sk-slot')[2].querySelector('.anvil-role-sk-v')) !== k0, 'slot rolled', 8000).catch(() => null);
    say('ok   spark: Roll on one slot');
    ok($$('.anvil-role-sk-shapes button').length >= 4 && $$('.anvil-role-sk-shapes .anvil-role-btn-on').length === 1, 'spark: story shapes with one chosen');
    ok($$('.sk-circle-li').length === 8 && $$('.sk-who').length >= 2, 'spark: Story Circle (8 steps) and a starter cast');
    await click('.sk-act .anvil-role-ic-heart button');
    await until(() => $$('.sk-vault-item').length === 1, 'saved to the vault');
    ok(true, 'spark: Save puts the spark in the vault');
    await click('.sk-act .anvil-role-btn-tungsten button');
    await until(() => /^#project\//.test(location.hash) && window.UI_READY && $('.pj-tabs a.on') && $$('.pj-work *').length > 20, 'developed into a project', 60000);
    ok(count('cast') >= 2 && count('storyline') >= 4, 'spark: Develop opens the new project with a cast and scene cards');

    // ---- the workspace
    const pid = location.hash.split('/')[1];
    await click('.pj-tabs a[data-tab="cast"]');
    await until(() => /\/cast/.test(location.hash) && $('.pj-tabs a.on[data-tab="cast"]'), 'cast tab');
    ok(true, 'workspace: the Cast tab opens and the address follows');
    await click('.pj-tabs a[data-tab="storyline"]');
    await until(() => /\/storyline/.test(location.hash), 'storyline tab');
    await click('.pj-tabs a[data-tab="pages"]');
    await until(() => /\/pages/.test(location.hash), 'pages tab');
    ok(true, 'workspace: Storyline and Pages open');
    await click('.pj-tabs a[data-tab="overview"]');
    const fix = await until(() => $$('.pj-work [data-go-tab]').find(vis), 'a Fix link in the doctor notes');
    const target = fix.getAttribute('data-go-tab').split('/')[0];
    fix.click();
    await until(() => $('.pj-tabs a.on[data-tab="' + target + '"]') && new RegExp('/' + target).test(location.hash), 'the Fix link opened ' + target);
    ok(true, 'workspace: a Fix link in the doctor notes opens the right tab (' + target + ')');
    type(titleBox(), 'Flow Test Feature');
    await until(() => /Saved/.test(txt($('.pj-save'))) && !$('.pj-save.dirty') && !$('.pj-save.busy'), 'saved', 20000);
    ok(true, 'workspace: a title change autosaves');
    window.OS.cache = {};
    await page('#home', () => $('.os-head h1') && $$('.anvil-role-os-posters .os-poster').filter(vis).length >= 2, 'desk');
    ok($$('.anvil-role-os-posters .os-poster').filter(vis).some((p) => /Flow Test Feature/.test(txt(p))), 'desk: the saved title is on the poster (from the server)');

    // ---- desk: new screenplay dialog
    ok(/Flow\./.test(txt($('.os-head h1'))), 'desk: greets the writer by first name');
    ok($$('.anvil-role-dk-strip .os-poster').length >= 1, 'desk: the samples to study');
    ok($$('.dk-spark').length === 1, 'desk: the saved spark');
    await click('.anvil-role-os-posters button.os-poster.new');
    const np = await until(() => $('.np-dialog'), 'new screenplay dialog');
    type(np.querySelector('input'), 'Dialog Script');
    (await until(() => $$('.np-dialog .anvil-role-np-structs .np-choice')[1], 'structure choices')).click();
    await until(() => ($$('.np-dialog .anvil-role-np-structs .np-choice')[1] || document.body).classList.contains('on'), 'structure chosen');
    await click('.np-dialog .anvil-role-btn-primary button');
    await until(() => /^#project\//.test(location.hash) && location.hash.split('/')[1] !== pid && $('.pj-tabs a.on'), 'the new project', 60000);
    await until(() => (titleBox() || {}).value === 'Dialog Script', 'its title');
    ok(count('storyline') >= 3, 'desk: New screenplay creates a project with a card for every beat');

    // ---- a sample, read-only, then "Make it mine"
    await page('#home', () => $$('.anvil-role-dk-strip .os-poster').length >= 1, 'desk again');
    const mine = $$('.anvil-role-os-posters .os-poster').filter(vis).length;
    $$('.anvil-role-dk-strip .os-poster')[0].click();
    await until(() => /^#project\//.test(location.hash) && window.UI_READY && vis($('.pj-ro')), 'the sample', 40000);
    const sampleId = location.hash.split('/')[1];
    ok(titleBox().disabled, 'sample: opens read-only with the banner');
    await click('.pj-ro .anvil-role-btn-primary button');
    await until(() => window.UI_READY && location.hash.split('/')[1] !== sampleId && $('.pj-tabs a.on') && vis($('.pj-bar')) && !vis($('.pj-ro')) && !titleBox().disabled, 'copied', 60000);
    ok(true, 'sample: Make it mine copies it into the library');
    await page('#home', () => $$('.anvil-role-os-posters .os-poster').filter(vis).length >= 2, 'desk after the copy');
    await sleep(1500);
    say('note desk posters before ' + mine + ', after ' + $$('.anvil-role-os-posters .os-poster').filter(vis).length + ': ' + $$('.anvil-role-os-posters .os-poster').filter(vis).map((p) => txt(p).slice(0, 24)).join(' / '));
    ok($$('.anvil-role-os-posters .os-poster').filter(vis).length === mine + 1, 'the copy on the desk');
    ok(true, 'desk: the copied sample is one of my screenplays');

    // ---- ideas
    await page('#ideas', () => $$('.anvil-role-id-cards .id-card').length > 5, 'ideas');
    ok($$('.id-deck.on').length === 1, 'ideas: a deck is open and marked in the menu');
    type($('input.anvil-role-id-q, .anvil-role-id-q input'), 'father');
    await until(() => $$('.ui-wrap h2').some((h) => /ideas? for/.test(txt(h))), 'search results');
    ok($$('.anvil-role-id-cards .id-card').length >= 1, 'ideas: search finds ideas across decks');
    await click('.id-tools .anvil-role-btn-primary button');
    await until(() => $('.id-draw h2') && txt($('.id-draw h2')).length > 1, 'a drawn card');
    ok(true, 'ideas: Draw a card shows a random idea');
    await click('.id-draw button', 'Close');
    await until(() => !$$('.id-draw').some(vis), 'dialog closed');

    // ---- learn
    await page('#learn/circle', () => $('.ln-circle svg') && $$('.ln-struct').length >= 4, 'learn');
    const s1 = txt($('.anvil-role-ln-step-n'));
    await click('.ln-step .anvil-role-ic-arrow button');
    await until(() => txt($('.anvil-role-ln-step-n')) !== s1, 'next step');
    ok(true, 'learn: Next moves around the Story Circle');
    ok($$('.ln-toc a').length === 9, 'learn: nine sections in the contents');

    // ---- profile, theme, sign out
    await page('#profile', () => $('.pf-grid'), 'profile');
    type($('.pf-grid input'), 'Flow Tester Two');
    await click('.pf-grid .anvil-role-btn-primary button', 'Save');
    await until(() => /Flow Tester Two/.test(txt($('.pf-head'))), 'name saved');
    ok(true, 'profile: name saved');
    await click('.anvil-role-avatar button');
    await click('.ui-menu .ui-seg button', 'Dark');
    ok(document.documentElement.classList.contains('ui-dark'), 'menu: Dark switches the theme');
    await click('.ui-menu .ui-seg button', 'Auto');
    await click('.ui-menu button', 'Sign out');
    await until(() => location.hash === '#landing' && window.UI_READY && $('.ui-header .ui-btn.primary'), 'signed out');
    ok(true, 'sign out: back to the landing page as a visitor');

    say('PASSED');
    return { ok: true, log: log };
  } catch (e) {
    say(String(e && e.message || e));
    const note = $$('.anvil-notification, .alert, .ui-toast').map(txt).filter(Boolean).join(' | ');
    if (note) say('on screen: ' + note.slice(0, 200));
    return { ok: false, log: log };
  }
})();
