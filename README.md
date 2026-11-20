# OScreenplay

A screenwriting studio for one writer: from a half-idea to properly formatted pages. Pull a story spark and swap any word, build characters whose personality predicts how they react, map their relationships, line up the chronology (what happened) against the storyline (the order we tell it), lay scene cards on a classic structure, and write in a real screenplay editor while a rule-based script doctor flags what's missing. No AI: everything comes from a hand-built idea library, templates and rules. Built on [Anvil](https://anvil.works).

- **App repo:** github.com/arkulinskis/oscreenplay (branch `master`). Anvil pulls `master`.
- **Live:** https://oscreenplay.com
- **Built as native Anvil Forms** (November 2026, on `master` since the `forms` branch was merged): Python Forms with HTML templates; the story engine and the six project tabs stay JavaScript in `theme/assets/os-*.js`. Facelifted with the APP_MAKER design kit (design check 4/4).

## What it does

**For visitors** (`#landing`): the promise, a **live Spark machine** in the hero (pull, swap words; "Develop this one" leads to sign-up and
keeps the spark), how it works, the Story Circle wheel, features, FAQ. The **Learn** page (`#learn`) is open to everyone.

**For writers** (signed in):
- **Desk** (`#home`): greeting, tonight's writing prompt, "continue" card with the next step, the library as 9:16 posters, three
  **sample screenplays** to study (read-only, one click to copy), latest sparks, new-screenplay dialog (empty / a card for every beat /
  a random spark; format, genre, structure). **Your writing week**: a 28-frame film strip of the words typed in Pages each day
  (empty / some / goal met in tungsten, today outlined in tally red, a dot per finished sprint), the streak, words this week and
  today, daily-goal chips (half a page to 3 pages = 100 / 200 / 400 / 600 typed words) and "Start a sprint".
- **Spark** (`#spark`): the story slot machine. Six story shapes (Until one day, Story spine, Ticking clock, Mystery, Comedy of errors,
  Tragedy), 12 slots (title, setting, trait, hero, want, obstacle, opposition, twist, truth, inciting incident, clock, stakes) that can
  each be swapped (click the word), rolled or locked; genre filter and a weirdness dial; undo and earlier pulls. Shows the logline, the
  8-step Story Circle and a starter cast; **Save** to the vault, **Develop** into a full project (cast of four, relationships, backstory,
  8 events, 8 scene cards, a setup/payoff).
- **Ideas** (`#ideas/<deck>`): 22 decks, ~780 ideas (archetypes, jobs, wounds with their lies, flaws, fears, values, secrets, quirks,
  voices with sample lines, conditions and illnesses with story notes, motivations, conflicts, problems, inciting incidents, twists,
  stakes, MacGuffins, complications, settings, themes, scene recipes). Search, draw a random card, copy.
- **Learn** (`#learn/<section>`): screenplay format with rendered examples, the interactive Story Circle, the other five structures,
  an 11-lesson Godfather masterclass, character, scene and dialogue craft, glossary, how the app works.
- **A project** (`#project/<id>/<tab>`), autosaved a second after each change:
  - **Overview:** logline + builder (When / a / must / or else / but) + checklist, theme as a question and its answer, premise, tone,
    world, format, genre (with conventions), poster colour, structure picker (wheel or beat bar with scene counts), **script doctor**
    (notes with Fix links, readiness score), numbers, duplicate / delete.
  - **Cast:** character cards; the editor has role, archetype, want, need, wound (fills in the lie), lie, flaw, fear, value, secret,
    quirk, voice (sample line), condition, skills, look, arc, Big Five sliders + radar + plain-language read, the **reaction
    simulator** (12 situations, top 3 reactions with reasons), backstory drafter, relationships, scenes and events they're in.
    Dice and idea-list buttons on every field; roll a whole character; "suggest the missing role".
  - **Web:** draggable relationship graph (14 relationship types, tension as line weight), connect mode, suggest a relationship,
    auto-arrange, hot spots, full list.
  - **Chronology:** events in story-world order (backstory, on screen, off screen), timeline or character lanes, which scenes show
    each event; rebuild events from scene cards; add backstory from the cast's wounds.
  - **Storyline:** scene cards in telling order grouped by beat (drag and drop, up/down), flashback / flash-forward flags, the
    **braid** (chronology vs. storyline), the **story shape** (charge per scene matched to Vonnegut's shapes), empty-beat scene
    recipes, fill every empty beat, setups and payoffs. Scene editor: heading builder, summary, goal, conflict (+ complication dice),
    outcome, beat, value in/out, characters, events.
  - **Pages:** screenplay editor (scene heading, action, character, parenthetical, dialogue, transition, shot, note). Enter / Tab /
    Ctrl+1-8 / INT. auto-detect; suggestions for character names, headings, transitions, parentheticals; pasting a chunk of script
    formats it. Draft pages from the cards (all, or only missing scenes), Fountain import/export, page count, runtime, who talks most.
    **Replacing the pages** (a fresh draft, or an import's "Replace") asks first, keeps the old pages as an earlier version
    (`doc.pages_backup`), offers Undo, and "Bring them back" restores them later.
    **PDF export:** a dialog with title-page fields (written by, contact, draft label, registration number), presets (standard spec,
    blind-read contest 80-125 pp, short film, TV pilot), blind read, scene numbers, Letter/A4, a live **contest check** (length,
    name/contact leaks, notes left out, headings without INT./EXT. or a time of day, NORA/NORAH-style cue names, long action and
    parentheticals, logline) and a scaled preview of the title page and page 1. "Download PDF" prints real paginated pages: Courier
    12 pt, 1.5-inch left margin, 55 lines a page (58 on A4), page numbers top right from page 2, the title page on its own, (MORE) /
    (CONT'D) on dialogue that breaks, scene headings never at the bottom of a page. No watermark.
    **Table read:** the browser's own speech reads the script, one voice per character (auto-cast from the device's voices, pitch
    varied when there are more characters than voices), a narrator for headings and action, "dialogue only", speed 0.8-1.6x,
    previous/next scene, the line being read highlighted. **Sprint:** 10/20/30 minutes with a countdown chip and the words typed,
    ending in "Cut. 20 minutes, 318 words: about 1½ pages."

**For everyone:** a landing page, sign-up with email and password or Google, feedback through Prepsto ("Submit feedback" in the footer and menu opens its panel),
and the Privacy & Terms page (footer link, `#legal`).

**For admins** (`#admin`; your admin email (App Secret `admin_emails`) becomes an admin on first sign-in):
- **Feedback inbox:** New / Read / Done, private notes.
- **Users:** search, make admin, disable an account.
- **Overview:** writers, screenplays, sparks, feedback.
- **Demo data:** the three sample screenplays (Salt Debt, The Last Projectionist, There Is No Bull) and their demo writers; remove or reload them.

## Setting it up in Anvil (once)

1. In the Anvil editor: **Create app → Clone from GitHub**, and paste `https://github.com/arkulinskis/oscreenplay`.
2. **Users** service: email + password and "Continue with Google", sign-up allowed (already set in `anvil.yaml`; check it).
3. Open the app in the editor. If it shows a **Schema Mismatch** alert, choose **"The schema of the source code is correct"** so Anvil creates the tables.
4. **Run** it and sign up with **your admin email** (App Secret `admin_emails`) straight away (that account becomes the admin).
5. **Publish** (Publish → public URL, or your own domain).

<!-- libraries:start -->
## Libraries and outside services

What this project uses besides its own code. Generated by `APP_MAKER/tools/libraries.py`; to change it, edit `APP_MAKER/libraries/catalog.py` and re-run the script.

| Name | How it gets in | Used here for |
|---|---|---|
| [YouTube embeds](https://developers.google.com/youtube/player_parameters) | Outside web service | Plays a YouTube video inside the page (the privacy-friendlier youtube-nocookie address). |
| [Google Fonts](https://fonts.google.com) | Loaded from a CDN | Courier Prime, Fraunces, Inter |

**Built into the browser:** Speech synthesis, Web Audio API, localStorage, Clipboard, File downloads (Blob).

**Anvil platform:** Anvil, Anvil Data Tables, Anvil Email, Anvil JS bridge (anvil.js), Anvil Secrets, Anvil Users, Anvil Google service, Anvil HTTP, Anvil timezones (anvil.tz).

**Build and test tools (not shipped):** axe-core, Node.js, Headless Chrome (DevTools Protocol), PyYAML.

<!-- libraries:end -->

## Working on it

See `.claude/skills/oscreenplay/SKILL.md`. In short:

```
python tools/check.py                    # Anvil's validator, JS syntax, asset hashes, server tests, design check -> ALL CHECKS PASSED
python -I tools/ui_test.py               # the real app in the Anvil App Server (Docker) + headless Chrome:
                                         # journeys, phone width, admin, accessibility (axe), design check -> ALL UI TESTS PASSED
python -I tools/ui_test.py --shots DIR   # screenshots of every page, desktop + phone, light + dark
git push origin <branch>                 # pushing is the deploy (Anvil pulls master)
```

## Project layout

```
client_code/   startup.py, router.py (pages, menu), state.py, auth.py, os_engine.py (the bridge to the JS engine), legal.py
               Layouts/Shell, Pages/ (Landing, Auth, Home = the Desk, Spark, Ideas, Learn, Project, Profile, Admin),
               Items/ (Poster, SparkCard, SlotRow, VaultRow, IdeaCard, StructureCard...), Dialogs/ (NewProject, DrawCard),
               Components/ (SparkMachine, Wheel, Workspace)
server_code/   common.py, Accounts.py, Feedback.py, Admin.py, DemoData.py + Samples.py, Projects.py, Sparks.py, legal_server.py
theme/assets/  app.css (tokens, design kit, engine look, pages, role layer), icons.css, app-kit.js, os-ui.js (UI helpers +
               OSF read-outs + OS.workspace), os-data.js (lexicon), os-engine.js, os-studio.js, os-tabs.js, icons, legal-kit.js
tools/         check.py, assets.py, build_icons.py, make_icons.py, ui_test.py + ui/ (flow, phone, admin, a11y, design, seed), testing/
```
