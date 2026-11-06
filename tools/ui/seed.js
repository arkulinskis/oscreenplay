/* For screenshots of member pages: sign up a fresh account and add one item. Resolves to window.SEED.
   Extend it so every member page has something to show (the app's own main objects). */
(async function () {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function until(fn, what, ms) {
    const end = Date.now() + (ms || 30000);
    while (Date.now() < end) { try { const v = fn(); if (v) return v; } catch (e) {} await sleep(150); }
    throw new Error('timed out waiting for: ' + what);
  }
  const $ = (s) => document.querySelector(s), $$ = (s) => Array.from(document.querySelectorAll(s));
  function type(input, value) {
    input.focus(); input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  try {
    if (location.hash !== '#auth/signup') window.UI_READY = false;
    location.hash = '#auth/signup';
    await until(() => window.UI_READY && $$('.au-card input').length >= 3, 'sign-up');
    const inputs = $$('.au-card input[type=text], .au-card input[type=email], .au-card input[type=password]');
    type(inputs[0], 'Sam Rivera'); type(inputs[1], 'shots' + Date.now() + '@example.com'); type(inputs[2], 'Hb-' + Math.random().toString(36).slice(2) + '-Kq7');
    const tick = $('.au-card input[type=checkbox]'); if (tick && !tick.checked) tick.click();
    $$('.anvil-role-btn-block button').find((b) => /Create account/.test(b.textContent)).click();
    await until(() => location.hash === '#home' && window.UI_READY, 'home', 60000);
    // a project from a spark + a saved spark, so every member page has something to show
    const st = window.OSF.reelState();
    const r = JSON.parse(await window.OS_SERVER('create_project', JSON.stringify([JSON.parse(window.OSF.sparkSeed(st, 'feature'))]), true));
    await window.OS_SERVER('save_spark', window.OSF.sparkSaveArgs(window.OSF.reelState()), true);
    const pid = r.result.project.id;
    window.SEED = { home: '#home', project: '#project/' + encodeURIComponent(pid) };
    window.UI_READY = false; location.hash = '#profile';  // leave the Desk, so its screenshot loads fresh with the new screenplay
    await until(() => window.UI_READY && location.hash === '#profile', 'profile');
    return window.SEED;
  } catch (e) {
    return { error: String(e && e.message || e) };
  }
})();
