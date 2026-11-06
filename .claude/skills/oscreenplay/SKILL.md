---
name: oscreenplay
description: Context, workflow and recipes for OScreenplay (folder OScreenplay-forms), the user's Anvil app built as native Anvil Forms: a screenwriting studio (Spark story generator, characters with Big Five + reaction engine, relationship web, chronology vs. storyline, six structures, script doctor, screenplay editor with Fountain). Load this before any feature request, bug fix, restyle, content change or deploy for this app.
---

# OScreenplay: working on the app

**What it is:** a private writer's room for one person writing a screenplay (feature, short, TV pilot, vertical micro-drama).
Areas: Desk (library), Spark (remixable story abstracts), Ideas (the idea library), Learn (format, structures, Godfather
masterclass) and the project workspace with six tabs: Overview, Cast, Web, Chronology, Storyline, Pages. No LLM: every
suggestion comes from the lexicon and rules in the JavaScript engine. An LLM may come later: keep generation behind `OS.*`.

**Where it lives:**
- Repo **github.com/arkulinskis/oscreenplay**. The native-Forms version is on branch `forms` (2026-11-06) until the user
  approves it; master still runs the older JavaScript-pages app from `Documents/CLAUDE/OScreenplay` (source + deploy.py).
  After the merge: this folder is the app (layout git), the old folder gets retired (CONVERT.md step 5).
- Live: https://oscreenplay.com. Prepsto feedback code `bz9rpjj`.

**What the user wants:** "Projection Room": serious but modern (books, paper, cinema, reels), elevated. Warm paper
`#f3eee4` in light, screening-room black `#0e0d0c` in dark, always-dark `.os-night` panels, tally red `#c8102e` (dark
`#ef3b4f`), tungsten `#e0a526` (as text `--c-accent` #865e13). Fonts: Fraunces (headings, italic titles), Inter (UI),
Courier Prime (script pages, timecode labels): the user's choice, kept in the facelift (marked `design-ok`). 9:16 poster
covers with story-style progress segments, sprocket strips, film grain. Lots of generated suggestion material, swappable
spark words, Story Circle, The Godfather as a masterclass. Claude assumes details, builds and deploys. Mobile-first (390px).

## Workflow for any change

1. `git pull --ff-only` (Anvil commits "Edited ..." when the user changes things in the IDE).
2. Edit a page's template and Python side by side (`client_code/Pages/X/`), or the engine (`theme/assets/os-*.js`).
3. `python tools/check.py` -> **ALL CHECKS PASSED** (Anvil's validator, JS syntax, asset hashes, server tests, design check).
   After any theme/assets change: `python tools/assets.py` (cache-busting hashes + icons.css).
4. `python -I tools/ui_test.py` (Docker Desktop running) -> **ALL UI TESTS PASSED**: flow.js (every journey), phone.js
   (390px, every page incl. the six tabs of a sample), admin.js, a11y.js (axe WCAG 2.2 AA, light + dark), design.js
   (APP_MAKER design kit, desktop + phone). `--only flow.js` runs one; server edits need `--restart`;
   `--shots DIR` = screenshots of every page: read them.
5. Design kit (APP_MAKER/design/README.md) for anything visual: `python -I APP_MAKER/tools/design_check.py <folder>`
   must stay `DESIGN CHECK CLEAN`.
6. Commit only your files as arkulinskis with the Co-Authored-By line; push (branch `forms` until merged, then master).

## Architecture

```
client_code/
  startup.py        get_me, legal kit, window.OS_SERVER = os_engine.server_bridge, router.start()
  router.py         PAGES (landing, auth, home, spark, ideas, learn, project, profile, admin), NAV (Desk, Spark, Ideas, Learn)
  os_engine.py      data(fn, ...) = json of window.OSF.fn; js(dict); obj(**fns); server_bridge (the engine's server calls,
                    only ENGINE_CALLS); copy_text
  state.py, auth.py, legal.py, Layouts/Shell (brand with the italic O, footer with Learn)
  Pages/Landing     static copy + Components/SparkMachine (the live reel) + Components/Wheel; numbers from OSF.numbers
  Pages/Home        the Desk: get_desk -> Items/Poster (projects, "new" tile = {"new": True}, samples), Items/SparkCard;
                    Dialogs/NewProject (seed from OSF.seed -> create_project)
  Pages/Spark       the spark state is a JS object (OSF.sparkState); views from OSF.sparkView; Items/SlotRow, ShapeChip,
                    CircleLine, CastRow, HistoryChip (20 snapshots as JSON text), VaultRow (list/save/delete_spark)
  Pages/Ideas       OSF.decks / deck / searchIdeas; Items/DeckGroup > DeckLink, IdeaCard; Dialogs/DrawCard (OSF.drawIdea)
  Pages/Learn       copy in the template (from the old learn.html arrays); Wheel + step card (OSF.circleStep);
                    Items/StructureCard > BeatLine (OSF.structures); scroll-following contents
  Pages/Project     bar (title TextBox, autosave state, readiness ring), sample banner + "Make it mine", tab links with counts;
                    Components/Workspace = OS.workspace (os-ui.js) around OS.tabs (os-tabs.js)
server_code/        unchanged by the conversion (Projects, Sparks, Samples, DemoData, Accounts, Feedback, Admin, common)
theme/assets/
  os-ui.js          1. UI helpers the engine expects (toast, modal, confirm, busy, formData, go, api via OS_SERVER, data-go)
                    2. OSF read-outs for the Forms  3. OS.workspace (tabs + 1.1 s autosave, data-go-tab links)  4. Watch video
  os-data.js        the lexicon (OS.S, OS.L, OS.REACT, OS.REL, OS.GENRES, names, prompts)
  os-engine.js      structures, Spark, reactions, doctor, script/Fountain, SVG (wheel, braid, shape, radar), popovers
  os-studio.js      fields with dice/idea buttons, scene/event/relationship editors (their dialogs are JS: UI.modal)
  os-tabs.js        OS.tabs.overview/cast/web/chronology/storyline/pages = function (el, T)
  app.css           tokens, design kit, shared pieces, engine look, project tabs, pages, role layer
```

Load order in head_html: app-kit.js, os-ui.js, os-data.js, os-engine.js, os-studio.js, os-tabs.js (the engine reads
OS.REACT at load). The engine's extra icons live in app-kit.js `UI.ICONS` so icons.css has them.

**The project document** (`projects.doc`, normalised by `OS.normalize`): premise, theme, theme_answer, tone, world, notes,
logline_parts; characters[{id, name, role, archetype, want, need, wound, lie, flaw, fear, value, secret, quirk, voice,
traits{O,C,E,A,N}, x, y, ...}]; relations; events (array order = chronology); scenes (array order = telling order, sorted by
beat with `T.sortScenes()`); plants; script[{t, x, s?}]. Columns beside it: title, logline, genre, format, structure,
color, stats. Tables: users, app_settings, feedback, projects, sparks (all server-only).

## Recipes

- **New page:** `Pages/X` (template with the Shell layout + `class X(XTemplate)` taking `args`), register in router.py
  (PAGES, _form, NAV if it belongs in the menu), add it to phone.js, a11y.js, design.js and a journey in flow.js.
- **Engine data on a page:** add a function to `OSF` in os-ui.js that returns `JSON.stringify(...)`, read it with
  `os_engine.data("name", ...)`. Keep heavy loops in JS; never loop over JS arrays in Python per frame.
- **New project tab:** a function in os-tabs.js `OS.tabs.x = function (el, T) {...}` (T: P, doc, touch(), go(tab, sub),
  flush(), sortScenes(), setStructure(), retitle(), readonly, me), call `T.touch()` after every change, return
  `{destroy}`; add a tab link to the Pages/Project template (with a count Label `c_<tab>`), add it to TABS in
  Pages/Project/__init__.py, and to the tests.
- **The engine calls the server:** only names in `os_engine.ENGINE_CALLS`; add new ones there.
- **More ideas / reactions / structures / doctor checks:** os-data.js and os-engine.js as before (see the comments there):
  slot pools `"text|tags|extra"`, `OS.REACT` rules without spaces, `OS.STRUCTURES` + `STRUCTURES` in Projects.py.
- **New sample:** a dict in Samples.py appended to SAMPLES; then Admin -> Demo data -> Reload on the live app.
- **Restyle:** tokens at the top of app.css (light + dark), fonts in head_html, spinner in theme.css, LEGAL_THEME in
  startup.py. Every transition uses the design kit's tokens (--ease-out, --dur-fast ...).

## Gotchas

- Reading a JS property that doesn't exist raises AttributeError in Python: `getattr(window.OS, "cache", None)`.
- A Label renders `<div class="anvil-label"><span class="anvil-label-text">`: line clamps need the inner text inline
  (`.anvil-role-x .anvil-label-text { display: inline }`), font rules on roles must also hit `.anvil-label-text`.
- RepeatingPanel roles become `anvil-role-<role>` (not the bare class): grids go on `.anvil-role-x > div`.
- Items/Poster holds the poster link AND a hidden "new" tile: tests must count visible posters only.
- The twist/truth chip is a button; the hero/enemy words inside it are not (axe nested-interactive).
- Role colours (OS.roleColor) carry white initials: keep them at 4.5:1.
- Shell heredocs eat backslashes: write patch scripts with the Write tool.
- Fraunces misdraws Latvian macrons (ANVIL_NOTES): keep user-typed text in Inter.

## Privacy & Terms (legal kit)

From APP_MAKER/legal-kit (`apps/oscreenplay.json` for this app's facts): `python -I build.py oscreenplay`, then install
(after the merge `python -I install.py oscreenplay`; before it, into this folder as in ANVIL_NOTES "unregistered folder"),
then `python tools/assets.py`. Sign-up keeps the consent tick box (template Auth page); consent is stored in
users.legal_version, legal_accepted_at, legal_source.
