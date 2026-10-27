"""The sample screenplays (demo content). Original, clearly fictional stories that show every part of a project:
cast with personalities, a relationship web, a chronology with backstory, scene cards in telling order (with a
flash-forward and a flashback, so the braid crosses), setups and payoffs, and the first pages of the script.

Beat keys match OS.STRUCTURES in web/pages/_engine.html.
"""


def _c(cid, name, role, archetype, age, occupation, traits, arc="positive", **kw):
    o, c, e, a, n = traits
    out = {"id": cid, "name": name, "role": role, "archetype": archetype, "age": str(age), "occupation": occupation, "arc": arc,
           "traits": {"O": o, "C": c, "E": e, "A": a, "N": n}}
    for k in ("want", "need", "wound", "lie", "flaw", "fear", "value", "secret", "quirk", "voice", "condition", "skills", "look",
              "backstory", "notes"):
        out[k] = kw.get(k, "")
    if "x" in kw:
        out["x"], out["y"] = kw["x"], kw["y"]
    return out


def _r(rid, a, b, typ, a_to_b, b_to_a, tension):
    return {"id": rid, "a": a, "b": b, "type": typ, "a_to_b": a_to_b, "b_to_a": b_to_a, "tension": tension}


def _e(eid, when, title, detail, chars, kind="story"):
    return {"id": eid, "when": when, "title": title, "detail": detail, "chars": chars, "kind": kind}


def _s(sid, beat, heading, summary, chars, events, cin, cout, goal="", conflict="", outcome="", done=False):
    return {"id": sid, "beat": beat, "heading": heading, "summary": summary, "chars": chars, "events": events, "charge_in": cin,
            "charge_out": cout, "goal": goal, "conflict": conflict, "outcome": outcome, "done": done}


def _p(pid, setup, payoff, s1, s2):
    return {"id": pid, "setup": setup, "payoff": payoff, "setup_scene": s1, "payoff_scene": s2}


def _script(lines):
    """[("scene", "INT. ..."), ...] -> blocks; a third item links the block to a scene card."""
    return [dict({"t": t, "x": x}, **({"s": rest[0]} if rest else {})) for (t, x, *rest) in lines]


# ------------------------------------------------------------------------------------------------ 1. Salt Debt
SALT_DEBT = {
    "title": "Salt Debt", "genre": "Crime", "format": "feature", "structure": "seq", "color": "ember",
    "logline": ("When her father is shot on the night of her sister's wedding, a marine biologist who swore she'd never join the "
                "family's smuggling business must hold the harbour against a rival before he takes it, and becomes the thing she ran from."),
    "doc": {
        "premise": ("In Port Aldwyn, a fishing harbour the Kessels have run (and smuggled through) for a century, the youngest daughter comes home "
                    "for one night and stays for good. A reluctant-heir story told in eight sequences, opening on the ending."),
        "theme": "Can you love your family and still stay good?", "theme_answer": "Not if you're the one holding the knife for them.",
        "tone": "Cold, quiet, operatic underneath. Fog, brass bands, kitchen tables.", "world": "Port Aldwyn: one road in, one ferry out, forty-one boats.",
        "notes": "Study model: a negative change arc. Each sequence is a small movie with its own question.",
        "logline_parts": {"when": "her father is shot on the night of her sister's wedding", "who": "a marine biologist who swore she'd never join the family business",
                          "must": "hold the harbour against a rival", "or": "the family loses everything", "but": "the only way to win is to become what she ran from"},
        "characters": [
            _c("c_nora", "Nora Kessel", "protagonist", "The Reluctant Heir", 29, "Marine biologist", (70, 86, 28, 44, 34), "negative",
               want="To keep her family alive and out of prison", need="To accept she can't save people who don't want saving, and leave",
               wound="Watched her mother go to prison for her father", lie="If I'm in charge, nobody I love gets hurt.", flaw="Need for control",
               fear="Becoming their parent", value="Family", secret="Called the coast guard on her father's boat once, at sixteen",
               quirk="Counts the boats in the harbour every morning", voice="Speaks softly so people lean in",
               skills="Reads tides, people and spreadsheets", look="Wool coat, no jewellery, hands always cold",
               backstory="Left Port Aldwyn at eighteen on a scholarship and never came back for more than a night. Studies cod populations. Has not said her mother's name aloud in eleven years.",
               x=420, y=230),
            _c("c_gus", "Augustin \"Gus\" Kessel", "mentor", "The Ruler", 66, "Harbour master and patriarch", (30, 70, 62, 34, 28), "flat",
               want="To hand the harbour to a Kessel who will keep it", need="To admit what the business cost his wife",
               wound="Let his wife take the fall in 1998", lie="Everything I did, I did for the family.", flaw="Pride", fear="Being forgotten",
               value="Tradition", secret="Has been paying Hale's people for years to stay away from the north pier",
               voice="Says what you'll do, never what they feel", quirk="Never sits with his back to a door", x=250, y=120),
            _c("c_marta", "Marta Kessel", "foil", "The Loyal Lieutenant", 34, "Runs the fish market", (45, 40, 86, 30, 76), "negative",
               want="To be named heir", need="To be loved without having to earn it", wound="Was the golden child who could never fail",
               lie="I'm only worth what I achieve.", flaw="Short temper", fear="Being ordinary", value="Recognition",
               secret="Called Hale the night her father was shot", voice="Blunt, zero filter", x=250, y=360),
            _c("c_eli", "Eli Brandt", "love", "The Innocent", 31, "Music teacher", (76, 55, 62, 86, 50), "flat",
               want="To marry Nora and get her out of Port Aldwyn", need="To see who Nora really is", flaw="Naivety", fear="Losing her",
               value="Truth", voice="Over-explains everything", quirk="Hums when he's nervous", x=600, y=120),
            _c("c_hale", "Viktor Hale", "antagonist", "The Shadow", 52, "Owner of the Hale Cannery", (60, 80, 56, 20, 40), "flat",
               want="To own the harbour and go legitimate", wound="Grew up poor next door to the very rich", lie="Money is the only safety.",
               flaw="Greed", fear="Poverty", value="Power", secret="Is dying, and wants the harbour for his son",
               voice="Polite to power, sharp with everyone else", x=640, y=330),
            _c("c_tomas", "Tomas Futrell", "confidant", "The Fixer", 58, "The family's lawyer", (50, 90, 34, 60, 62), "flat",
               want="To keep the Kessels out of court", wound="Disbarred once, quietly reinstated", flaw="Cowardice", fear="Prison",
               value="Loyalty", voice="Formal words in casual places", x=430, y=40),
            _c("c_ada", "Sgt. Ada Moreno", "shapeshifter", "The Shapeshifter", 40, "Harbour police sergeant", (40, 62, 50, 40, 56), "flat",
               want="To pay for her daughter's college", secret="Is on Hale's payroll", flaw="Dishonesty", value="Family",
               voice="Short, clipped sentences", x=820, y=230),
        ],
        "relations": [
            _r("r1", "c_nora", "c_gus", "family", "Loves him, can't forgive him", "Sees himself in her", 8),
            _r("r2", "c_marta", "c_nora", "rivals", "Resents being passed over", "Protects her from herself", 9),
            _r("r3", "c_nora", "c_eli", "love", "Lies to him to keep him safe", "Trusts her completely", 6),
            _r("r4", "c_gus", "c_hale", "enemies", "Despises him", "Wants everything he has", 10),
            _r("r5", "c_nora", "c_hale", "enemies", "Will destroy him by the book", "Underestimates her", 9),
            _r("r6", "c_tomas", "c_nora", "alliance", "Fears what she'll ask next", "Needs his knowledge", 5),
            _r("r7", "c_ada", "c_hale", "debt", "Hates owing him", "Owns her", 7),
            _r("r8", "c_marta", "c_hale", "secret", "Thinks she's using him", "Is using her", 8),
            _r("r9", "c_tomas", "c_gus", "debt", "Owes him his career", "Trusts him with everything", 4),
        ],
        "events": [
            _e("e1", "1998", "Mother takes the fall", "Ingrid Kessel goes to prison for Gus's smuggling run. Nora is seven.", ["c_gus", "c_nora"], "backstory"),
            _e("e2", "2009", "Nora leaves", "Nora leaves for university and swears she'll never come back.", ["c_nora", "c_gus"], "backstory"),
            _e("e3", "2019", "Hale buys the cannery", "Viktor Hale buys the cannery next to the Kessel docks.", ["c_hale"], "backstory"),
            _e("e4", "Day 1, afternoon", "Marta's wedding", "The whole harbour celebrates. Hale offers to buy the north pier; Gus refuses.",
               ["c_gus", "c_hale", "c_marta", "c_nora", "c_eli", "c_tomas"]),
            _e("e5", "Day 1, night", "Gus is shot on the north pier", "Two shots in the fog. Sgt. Moreno is first on the scene, suspiciously fast.", ["c_gus", "c_ada"]),
            _e("e6", "Day 2", "The empty hospital corridor", "The police guard is gone. Nora moves her father to another room herself.", ["c_nora", "c_gus", "c_ada"]),
            _e("e7", "Day 3", "Nora takes the ledgers", "Tomas hands over the real books, and warns her what reading them means.", ["c_nora", "c_tomas"]),
            _e("e8", "Day 5", "Marta meets Hale in secret", "Marta asks Hale to back her as heir. He agrees, and records the call.", ["c_marta", "c_hale"], "offscreen"),
            _e("e9", "Day 6, night", "Dinner at the lighthouse", "Nora offers Hale the north pier, while her phone records Moreno taking his envelope.", ["c_nora", "c_hale", "c_ada"]),
            _e("e10", "Day 9", "The cannery raid", "Hale is arrested on the evidence Nora fed to the state police.", ["c_hale", "c_ada", "c_nora"]),
            _e("e11", "Day 10", "The phone record", "Tomas shows Nora who called Hale the night of the shooting: Marta.", ["c_nora", "c_tomas", "c_marta"]),
            _e("e12", "Day 12", "Gus dies at home", "His last words to Nora are an order, not an apology.", ["c_gus", "c_nora"]),
            _e("e13", "Day 14", "The funeral and the ferry", "During the funeral, Marta boards the morning ferry alone. She is not coming back.", ["c_nora", "c_marta", "c_eli", "c_tomas"]),
            _e("e14", "Day 30", "Nora runs the harbour", "Eli asks her the question. She lies. The office door closes.", ["c_nora", "c_eli", "c_tomas"]),
        ],
        "scenes": [
            _s("s1", "seq_a", "EXT. PORT ALDWYN HARBOUR - DAWN", "Flash-forward. Nora, alone in her father's office, counts the boats. A black ribbon on his nameplate.",
               ["c_nora"], ["e14"], 0, -1, goal="Get through one more morning", conflict="The office isn't hers, and now it is", outcome="She turns the nameplate face down", done=True),
            _s("s2", "seq_a", "EXT. KESSEL DOCKS - WEDDING RECEPTION - DAY", "Thirty days earlier. Marta's wedding. Every guest wants something from Gus. Nora arrives with Eli: one night only.",
               ["c_nora", "c_eli", "c_gus", "c_marta", "c_tomas"], ["e4"], 1, -1, goal="Stay one night without being pulled in",
               conflict="Gus wants her in the chair; Marta wants her gone", outcome="She sits in the chair", done=True),
            _s("s3", "seq_a", "INT. KESSEL BOATHOUSE - DAY", "Hale makes his offer for the north pier. Gus refuses with a smile. Nora, sent to fetch ice, hears every word.",
               ["c_gus", "c_hale", "c_nora"], ["e4"], 0, -1, goal="Hale wants the pier", conflict="Gus will never sell", outcome="A threat, politely made"),
            _s("s4", "seq_b", "EXT. NORTH PIER - NIGHT", "Fog. Gus walks out to check a mooring line. Two shots. Sgt. Moreno's car is there in under a minute.",
               ["c_gus", "c_ada"], ["e5"], 0, -2, conflict="An ambush", outcome="Gus down, alive"),
            _s("s5", "seq_b", "INT. ST. BRENDAN'S HOSPITAL - CORRIDOR - NIGHT", "Nora finds the police guard gone. With one frightened nurse, she wheels her father to another floor and sits by the door.",
               ["c_nora", "c_gus", "c_ada"], ["e6"], -2, 1, goal="Keep him alive until morning", conflict="Moreno says the guard was 'reassigned'",
               outcome="Nora takes her first decision for the family"),
            _s("s6", "seq_c", "INT. FUTRELL LAW OFFICE - DAY", "Tomas hands Nora the real ledgers. 'Once you read these, you can't unread them.' She reads them.",
               ["c_nora", "c_tomas"], ["e7"], -1, 1, goal="Understand the business", conflict="Tomas wants to protect her from it", outcome="She knows everything"),
            _s("s7", "seq_c", "INT. KESSEL HOUSE - KITCHEN - NIGHT", "Nora tells Eli she's staying 'a few more days'. Marta storms in: who made Nora the boss?",
               ["c_nora", "c_eli", "c_marta"], [], 1, -1, goal="Keep everyone calm", conflict="Marta's pride, Eli's hope", outcome="Marta storms out; Eli unpacks"),
            _s("s8", "seq_d", "INT. STATE PRISON - VISITING ROOM - DAY", "Flashback to 1998. Seven-year-old Nora puts her hand on the glass. Her mother doesn't cry, so Nora doesn't either.",
               ["c_nora"], ["e1"], -1, -2, outcome="The wound, shown not told"),
            _s("s9", "seq_e", "INT. LIGHTHOUSE RESTAURANT - NIGHT", "The dinner. Nora offers Hale the north pier. Under the table, her phone records Sgt. Moreno taking Hale's envelope.",
               ["c_nora", "c_hale", "c_ada"], ["e9"], -1, 2, goal="Get proof without a single shot fired", conflict="Hale tests her loyalty with a toast to her father",
               outcome="She crosses the line, calmly"),
            _s("s10", "seq_f", "EXT. HALE CANNERY - DAWN", "State police raid the cannery. Nora watches from her car, engine off, coffee untouched.",
               ["c_hale", "c_ada", "c_nora"], ["e10"], 1, 2, outcome="Hale in handcuffs; Moreno suspended"),
            _s("s11", "seq_f", "INT. FUTRELL LAW OFFICE - NIGHT", "Tomas slides a phone record across the desk: Marta called Hale twenty minutes before the shooting.",
               ["c_nora", "c_tomas"], ["e11", "e8"], 2, -2, conflict="The traitor is family", outcome="Nora goes very still"),
            _s("s12", "seq_g", "INT. KESSEL HOUSE - GUS'S BEDROOM - DAY", "Gus, dying, finally tells Nora the truth about her mother, then makes her promise to keep it in the family.",
               ["c_gus", "c_nora"], ["e12", "e1"], -1, -2, goal="Nora wants an apology", conflict="Gus can only give orders", outcome="She promises"),
            _s("s13", "seq_g", "EXT. CHURCH OF ST. BRENDAN - DAY", "The funeral, cross-cut with Marta boarding the ferry. Nora's goodbye: 'There's a job for you in Halifax. You start Monday.'",
               ["c_nora", "c_marta", "c_eli", "c_tomas"], ["e13"], -2, -1, goal="Protect the family from Marta", conflict="Marta is the family", outcome="Exile, not forgiveness"),
            _s("s14", "seq_h", "INT. HARBOUR OFFICE - DAY", "Day 30 again. Eli asks: did you have anything to do with the cannery? 'No.' Tomas comes in. Eli watches the door close.",
               ["c_nora", "c_eli", "c_tomas"], ["e14"], 0, -2, goal="Eli wants the truth", conflict="The truth would end them", outcome="She lies, and he knows"),
        ],
        "plants": [
            _p("p1", "Nora counts the boats every morning", "Final image: she counts them as their owner", "s1", "s14"),
            _p("p2", "Marta takes a phone call and leaves the wedding early", "The phone record: she called Hale", "s2", "s11"),
            _p("p3", "At the hospital, Nora records the nurse's statement on her phone", "She records Moreno at the lighthouse", "s5", "s9"),
        ],
        "script": _script([
            ("scene", "EXT. PORT ALDWYN HARBOUR - DAWN", "s1"),
            ("action", "Fog lifts off black water. Forty-one fishing boats, moored in rows. A gull screams once and gives up."),
            ("action", "SUPER: DAY THIRTY."),
            ("scene", "INT. HARBOUR OFFICE - CONTINUOUS"),
            ("action", "NORA KESSEL (29), coat still on, stands at the window with a mug she hasn't touched. Her lips move. She is counting."),
            ("character", "NORA"), ("paren", "(under her breath)"), ("dialogue", "Thirty-nine. Forty. Forty-one."),
            ("action", "On the desk behind her: a brass nameplate. AUGUSTIN KESSEL. Someone has laid a black ribbon across it."),
            ("action", "She turns the nameplate face down."),
            ("transition", "SMASH CUT TO:"),
            ("scene", "EXT. KESSEL DOCKS - WEDDING RECEPTION - DAY", "s2"),
            ("action", "THIRTY DAYS EARLIER. Bunting, a brass band, a hundred fishermen in borrowed suits. MARTA KESSEL (34), radiant and already a little drunk, dances with everyone except her new husband."),
            ("action", "A rental car noses through the crowd. Nora gets out with ELI BRANDT (31), who carries a gift the size of a small fridge."),
            ("character", "ELI"), ("dialogue", "I want it on record that I said a toaster was enough. A toaster is a perfectly normal wedding present. Nobody has ever been offended by toast."),
            ("character", "NORA"), ("dialogue", "One night. We eat, we dance, we leave at seven."),
            ("character", "ELI"), ("dialogue", "Seven. Got it."),
            ("action", "Across the dock, AUGUSTIN \"GUS\" KESSEL (66) holds court at a table nobody else may sit at. Men approach him one at a time, hats in hand. He sees Nora. He doesn't wave. He points at the empty chair beside him."),
            ("character", "ELI"), ("dialogue", "Is that your dad? He's pointing at you. Is that a good point or a bad point?"),
            ("character", "NORA"), ("dialogue", "It's a chair."),
            ("action", "Marta dances past, close enough to whisper."),
            ("character", "MARTA"), ("dialogue", "Look who came home. Don't sit in it. It's not yours."),
            ("action", "Marta's phone buzzes. She reads the screen and the smile drops off her face for one beat. She slips away through the crowd."),
            ("note", "Setup: Marta's phone call. Pays off in the law office (scene 11)."),
            ("character", "GUS"), ("paren", "(across the dock, not loud)"), ("dialogue", "Nora. Sit."),
            ("action", "And she does."),
        ]),
    },
}

# ------------------------------------------------------------------------------------------------ 2. The Last Projectionist
PROJECTIONIST = {
    "title": "The Last Projectionist", "genre": "Drama", "format": "feature", "structure": "three", "color": "tungsten",
    "logline": ("On the last night before his small-town cinema is demolished, a 71-year-old projectionist receives an unlabelled reel showing "
                "the life he'd have had if he'd left the booth, and has until the final screening ends to walk out and find the woman in it."),
    "doc": {
        "premise": "A man who has watched life from a projection booth for 46 years gets one night, and one impossible reel, to step into it.",
        "theme": "Is it ever too late to change?", "theme_answer": "Change starts the day you stop waiting.",
        "tone": "Warm, funny, a little magic. Dust in the projector beam.", "world": "The Orpheum, 1931, 400 seats, one Wurlitzer organ that hasn't worked since 1989.",
        "logline_parts": {"when": "his cinema is about to be demolished", "who": "a 71-year-old projectionist", "must": "leave the booth and find the woman from a mysterious reel",
                          "or": "live out the rest of his life in the dark", "but": "the demolition is moved up to midnight"},
        "characters": [
            _c("c_bernie", "Bernard \"Bernie\" Holm", "protagonist", "The Fallen Hero", 71, "Projectionist", (55, 90, 15, 72, 60), "positive",
               want="To get through the final screening with dignity", need="To step out of the booth and live", wound="Missed the train with Ruth in 1974 because he wouldn't leave the late show",
               lie="Watching is safer than living.", flaw="Cowardice", fear="Change", value="Tradition", quirk="Names every projector he has ever run",
               voice="Drifts into the past", look="Cardigan, white cotton gloves, reading glasses on a cord", x=420, y=220),
            _c("c_lucia", "Lucia Reyes", "deuteragonist", "The Ally", 17, "Usher", (90, 45, 76, 66, 55), "positive",
               want="To get into film school in Montréal", need="To stop asking permission", flaw="Impatience", fear="Being ordinary",
               value="Creativity", voice="Jokes when scared", quirk="Films everything on a cracked phone", x=200, y=120),
            _c("c_darrow", "Graham Darrow", "antagonist", "The Threshold Guardian", 48, "Property developer", (35, 86, 60, 34, 45), "positive",
               want="To demolish the Orpheum on schedule and build condos", need="To remember why he loved movies", wound="His father's cinema went bankrupt in 1996",
               lie="Nostalgia is a luxury.", flaw="Cynicism", value="Security", voice="Talks in sports metaphors", x=660, y=110),
            _c("c_ruth", "Ruth Abernathy", "love", "The Innocent", 70, "Retired pianist", (82, 50, 56, 76, 30), "flat",
               want="To play the Orpheum's organ one last time", fear="Being forgotten", value="Beauty", condition="Early-onset dementia",
               voice="Quotes their mother constantly", x=640, y=360),
            _c("c_reel", "The Reel", "herald", "The Herald", 0, "A film can with no label, a handwritten R on the lid", (50, 50, 50, 50, 50), "flat",
               notes="An object character. It never explains itself; it only shows.", x=230, y=360),
        ],
        "relations": [
            _r("r1", "c_bernie", "c_lucia", "mentor", "Sees his younger self", "Thinks he's a fossil, loves him anyway", 4),
            _r("r2", "c_darrow", "c_bernie", "enemies", "Pities him", "Despises everything he stands for", 7),
            _r("r3", "c_bernie", "c_ruth", "unrequited", "Never stopped loving her", "Waited at the station, then stopped waiting", 9),
            _r("r4", "c_darrow", "c_lucia", "debt", "Offers her a paid summer job", "Needs the money", 5),
            _r("r5", "c_reel", "c_bernie", "secret", "Knows what he gave up", "Afraid to look", 8),
        ],
        "events": [
            _e("e1", "Summer 1974", "The plan", "Bernie and Ruth plan to leave town together on the 11:40 train.", ["c_bernie", "c_ruth"], "backstory"),
            _e("e2", "Summer 1974", "The missed train", "Bernie stays to run the late show. Ruth leaves alone.", ["c_bernie", "c_ruth"], "backstory"),
            _e("e3", "1996", "Darrow's father goes bankrupt", "The Darrow Palace closes; Graham, twenty, carries out the seats.", ["c_darrow"], "backstory"),
            _e("e4", "Last day, 9 a.m.", "The notice", "A demolition notice is taped to the Orpheum's glass doors.", ["c_bernie", "c_darrow"]),
            _e("e5", "Last day, 4 p.m.", "The reel arrives", "A courier leaves an unlabelled film can. Nobody ordered it.", ["c_bernie", "c_lucia", "c_reel"]),
            _e("e6", "Last day, 5 p.m.", "The first screening of the reel", "It shows Bernie at the station in 1974, getting on the train.", ["c_bernie", "c_reel"]),
            _e("e8", "Last day, 6 p.m.", "Midnight", "Darrow moves the demolition up to midnight.", ["c_darrow", "c_bernie"]),
            _e("e7", "Last day, 7 p.m.", "Lucia finds Ruth", "Ruth is alive, at the Maplewood care home across town.", ["c_lucia", "c_ruth"]),
            _e("e9", "Last day, 8 p.m.", "The final screening", "Four hundred seats, fifty people. The reel keeps changing.", ["c_bernie", "c_lucia", "c_reel"]),
            _e("e10", "Last day, 9:30 p.m.", "Bernie leaves the booth", "For the first time in 46 years, in the middle of a show.", ["c_bernie", "c_lucia"]),
            _e("e11", "Last day, 10:30 p.m.", "Maplewood", "Ruth doesn't recognise him. Then she does.", ["c_bernie", "c_ruth"]),
            _e("e12", "Last day, 11:50 p.m.", "The organ", "Ruth plays the Wurlitzer. Darrow lets the night run long.", ["c_ruth", "c_bernie", "c_darrow", "c_lucia"]),
        ],
        "scenes": [
            _s("s1", "hook", "INT. ORPHEUM - PROJECTION BOOTH - DAY", "Bernie cleans the lens of a 1952 projector he calls Marguerite. Through the booth window: workers taping a notice to the doors.",
               ["c_bernie"], ["e4"], 0, -1, goal="Keep the routine", outcome="The end has a date", done=True),
            _s("s2", "inciting", "EXT. ORPHEUM - DAY", "A courier hands Lucia an unlabelled film can. 'For the projectionist.' Bernie has never seen it before.",
               ["c_bernie", "c_lucia", "c_reel"], ["e5"], 0, 1, outcome="A mystery", done=True),
            _s("s3", "pp1", "INT. PROJECTION BOOTH - LATER", "Bernie threads the reel alone. On the little screen: himself, at nineteen, stepping onto the 11:40 train.",
               ["c_bernie", "c_reel"], ["e6", "e1"], 1, -1, conflict="He can't stop watching, and he can't bear to", outcome="He decides to run it once more, tonight"),
            _s("s4", "pinch1", "INT. ORPHEUM - LOBBY - DAY", "Darrow tours investors through the lobby and tells Bernie the wrecking crew comes at midnight, not morning.",
               ["c_bernie", "c_darrow"], ["e8"], -1, -2, goal="Bernie wants one more week", conflict="Darrow has a schedule and a bank", outcome="A clock"),
            _s("s5", "mid", "INT. PROJECTION BOOTH - EVENING", "Lucia watches the reel with him. Now it shows Ruth, today, alone at a piano. 'She's real? She's alive?' Lucia finds her in a phone book.",
               ["c_bernie", "c_lucia", "c_reel"], ["e7"], -1, 2, goal="Lucia wants the truth", conflict="Bernie wants to change the subject", outcome="The reel isn't the past; it's a choice"),
            _s("s6", "pinch2", "INT. ORPHEUM - AUDITORIUM - NIGHT", "The final screening begins. Between reels, the mystery film shows Bernie's empty booth, years from now. Dust. Nobody.",
               ["c_bernie", "c_lucia", "c_reel"], ["e9"], 1, -1, outcome="If he stays, nothing changes"),
            _s("s7", "pp2", "INT. PROJECTION BOOTH - NIGHT", "Bernie teaches Lucia the changeover in thirty seconds, gives her his gloves, and walks out of the door in the middle of the show.",
               ["c_bernie", "c_lucia"], ["e10"], -1, 1, goal="Get to Ruth before midnight", conflict="Every instinct he has", outcome="He leaves"),
            _s("s8", "climax", "INT. MAPLEWOOD CARE HOME - COMMON ROOM - NIGHT", "Ruth doesn't know him. He sits at the piano and plays the one song he knows, badly. She corrects his left hand. Then she knows him.",
               ["c_bernie", "c_ruth"], ["e11", "e2"], -1, 2, goal="Be recognised", conflict="Her memory, his fear", outcome="'You're late, Bernard.'"),
            _s("s9", "resolution", "INT. ORPHEUM - AUDITORIUM - LATER", "Ruth plays the old organ for an audience of fifty. Darrow, in the back row, tells the crew to wait. Bernie sits in a seat for the first time.",
               ["c_ruth", "c_bernie", "c_darrow", "c_lucia"], ["e12"], 1, 2, outcome="The last show, from the audience"),
        ],
        "plants": [
            _p("p1", "Bernie never sits in the auditorium: 'A projectionist doesn't sit.'", "He sits in row F for the last song", "s1", "s9"),
            _p("p2", "Lucia can't spot the changeover cue dots", "She hits the changeover perfectly, alone", "s2", "s7"),
            _p("p3", "The organ hasn't played since 1989", "Ruth makes it play", "s5", "s9"),
        ],
        "script": _script([
            ("scene", "INT. ORPHEUM - PROJECTION BOOTH - DAY", "s1"),
            ("action", "A shaft of window light, full of dust. BERNARD \"BERNIE\" HOLM (71), white cotton gloves, polishes a lens the size of a saucer."),
            ("action", "The projector beside him is older than most of the town. A strip of masking tape on its side reads MARGUERITE."),
            ("character", "BERNIE"), ("dialogue", "Easy, old girl. Saturday matinee. You remember Saturdays."),
            ("action", "Through the booth's little window: two WORKERS in hi-vis vests tape a sheet of paper to the lobby doors. NOTICE OF DEMOLITION."),
            ("action", "Bernie stops polishing. Then he starts again, slower."),
            ("scene", "EXT. ORPHEUM - DAY", "s2"),
            ("action", "LUCIA REYES (17), usher's vest over a band T-shirt, films the notice on a phone with a spider-web crack."),
            ("character", "LUCIA"), ("paren", "(to the phone)"), ("dialogue", "Day one of the end of the world. The Orpheum, 1931 to tonight. Please like and subscribe, it's for my grief."),
            ("action", "A COURIER on a bicycle skids up and holds out a round, dented film can. No label. A single letter on the lid, in pen: R."),
            ("character", "COURIER"), ("dialogue", "For the projectionist."),
            ("character", "LUCIA"), ("dialogue", "We don't get film anymore. It's all hard drives. Who sent it?"),
            ("action", "But the courier is already gone."),
        ]),
    },
}

# ------------------------------------------------------------------------------------------------ 3. There Is No Bull
NO_BULL = {
    "title": "There Is No Bull", "genre": "Comedy", "format": "short", "structure": "circle", "color": "rose",
    "logline": ("A 400-year-old vampire falls in love with a dairy cow but keeps losing duels to a jealous bull, until he realizes there is no "
                "bull and he has been fighting his own insecurity."),
    "doc": {
        "premise": ("Born from a Spark: 'A vampire falls in love with a cow, but has trouble fighting off a bull, until one day he realizes there "
                    "is no bull, and he was battling his own insecurities.' A Story Circle in eight scenes, about twelve pages."),
        "theme": "Can you be loved without winning?", "theme_answer": "There never was a bull, only fear.",
        "tone": "Deadpan gothic comedy. Think a nature documentary narrated by a very sad aristocrat.", "world": "A sleepy dairy village below a crumbling castle.",
        "logline_parts": {"when": "he sees a dairy cow in the moonlight", "who": "a 400-year-old vampire", "must": "win her heart", "or": "spend eternity alone",
                          "but": "a jealous bull keeps beating him"},
        "characters": [
            _c("c_vasco", "Count Vasco", "protagonist", "The Fool", 400, "Vampire (retired)", (60, 55, 40, 62, 86), "positive",
               want="To win Bettina's heart", need="To believe he's worth loving without a fight", wound="Left at the altar", lie="I'm unlovable.",
               flaw="Vanity", fear="Rejection", value="Love", quirk="Practises his entrance in a mirror he can't see himself in",
               voice="Formal words in casual places", x=420, y=220),
            _c("c_bettina", "Bettina", "love", "The Innocent", 6, "Dairy cow", (50, 40, 30, 92, 5), "flat",
               want="Grass, mostly", notes="Never does anything except chew. Every reaction is Vasco's projection.", x=640, y=120),
            _c("c_brutus", "Brutus", "antagonist", "The Shadow", 0, "A bull (allegedly)", (50, 50, 50, 50, 50), "flat",
               want="To keep Bettina for himself, according to Vasco", notes="Never seen clearly: a shadow, a snort, hoofprints that are actually Vasco's.", x=640, y=340),
            _c("c_june", "June Ozola", "trickster", "The Trickster", 58, "Dairy farmer", (70, 82, 50, 55, 30), "flat",
               want="To find out who keeps leaving roses in the milking shed", voice="Bluntly honest, zero filter", quirk="Talks to every cow by full name", x=200, y=330),
        ],
        "relations": [
            _r("r1", "c_vasco", "c_bettina", "unrequited", "Worships her", "Is a cow", 6),
            _r("r2", "c_vasco", "c_brutus", "enemies", "Must defeat him", "(does not exist)", 10),
            _r("r3", "c_june", "c_vasco", "secret", "Suspects something", "Hides behind the hay bales", 5),
        ],
        "events": [
            _e("e1", "1712", "Left at the altar", "Vasco's bride runs off with a lute player. He hasn't been to a wedding since.", ["c_vasco"], "backstory"),
            _e("e2", "Night 1", "The moonlit pasture", "Vasco sees Bettina and forgets to be sad for eleven seconds.", ["c_vasco", "c_bettina"]),
            _e("e3", "Night 2", "The first duel", "A shadow, a snort. Vasco is thrown into the duck pond.", ["c_vasco", "c_brutus"]),
            _e("e4", "Night 3", "Lessons", "Vasco studies bullfighting from June's old VHS tapes through her window.", ["c_vasco", "c_june"]),
            _e("e5", "Night 4", "The perfect evening", "He reads Bettina poetry. She chews in rhythm. He takes it as a yes.", ["c_vasco", "c_bettina"]),
            _e("e6", "Night 5", "The rematch", "Worst defeat yet. He nearly sees the sunrise.", ["c_vasco", "c_brutus"]),
            _e("e7", "Night 6", "June asks", "June finds him in the hay. 'We don't have a bull. We've never had a bull.'", ["c_june", "c_vasco"]),
            _e("e8", "Night 7", "No bull", "He walks into the pasture unarmed and sits down next to Bettina.", ["c_vasco", "c_bettina"]),
        ],
        "scenes": [
            _s("s1", "you", "INT. CASTLE VASCO - GREAT HALL - NIGHT", "Vasco rehearses a dramatic entrance into an empty hall, in front of a mirror that shows nothing.",
               ["c_vasco"], [], 0, -1, goal="Feel impressive", outcome="Nobody is there to see it", done=True),
            _s("s2", "need", "EXT. OZOLA FARM - PASTURE - NIGHT", "Moonlight. Bettina lifts her head and looks at him. (She's looking at a moth.) Vasco is in love.",
               ["c_vasco", "c_bettina"], ["e2"], -1, 1, goal="Be noticed", outcome="He is smitten", done=True),
            _s("s3", "go", "EXT. PASTURE FENCE - NIGHT", "He climbs the fence with a single rose. A snort in the dark. A huge shadow. He is thrown into the duck pond.",
               ["c_vasco", "c_brutus"], ["e3"], 1, -1, conflict="The bull", outcome="Wet, humiliated, more determined"),
            _s("s4", "search", "EXT. OZOLA FARMHOUSE - WINDOW - NIGHT", "Vasco watches June's bullfighting tapes through her window and copies every move with a curtain.",
               ["c_vasco", "c_june"], ["e4"], -1, 1, goal="Learn to fight", conflict="June nearly catches him", outcome="He thinks he's ready"),
            _s("s5", "find", "EXT. PASTURE - NIGHT", "He reads Bettina his poetry. She chews in rhythm. No bull tonight. It's the best night of his very long life.",
               ["c_vasco", "c_bettina"], ["e5"], 1, 2, outcome="False victory"),
            _s("s6", "take", "EXT. PASTURE - PRE-DAWN", "The rematch. He loses so badly he has to sprint for the castle as the sky turns pink. Smoke rises from his cape.",
               ["c_vasco", "c_brutus"], ["e6"], 2, -2, conflict="The bull, worse than ever", outcome="He gives up"),
            _s("s7", "return", "INT. OZOLA BARN - HAYLOFT - DAY", "June finds him hiding in the hay with an umbrella. 'We don't have a bull. We've never had a bull.'",
               ["c_june", "c_vasco"], ["e7"], -2, -1, goal="Hide", conflict="June's bluntness", outcome="The truth, which is worse"),
            _s("s8", "change", "EXT. PASTURE - NIGHT", "Under the moon he sees the 'bull': his own shadow, horned by his collar. He laughs, drops his sword and sits beside Bettina.",
               ["c_vasco", "c_bettina"], ["e8"], -1, 2, outcome="Loved, or at least not chased away"),
        ],
        "plants": [
            _p("p1", "The castle mirror shows nothing (vampires have no reflection)", "His shadow is the only image of himself he's ever seen, and it's the bull", "s1", "s8"),
            _p("p2", "His high, pointed cape collar", "The collar makes the shadow's horns", "s3", "s8"),
        ],
        "script": _script([
            ("scene", "INT. CASTLE VASCO - GREAT HALL - NIGHT", "s1"),
            ("action", "Cobwebs. A single candle. COUNT VASCO (400, looks a well-kept 55) bursts through the double doors, cape flaring."),
            ("character", "VASCO"), ("dialogue", "Good evening."),
            ("action", "He checks the enormous mirror on the wall. It shows an empty hall and an open door. He frowns, goes back out, and bursts in again."),
            ("character", "VASCO"), ("paren", "(lower)"), ("dialogue", "Good evening."),
            ("action", "The mirror, still, shows nothing. The candle gutters out."),
            ("character", "VASCO"), ("dialogue", "Thank you. That will be all."),
            ("scene", "EXT. OZOLA FARM - PASTURE - NIGHT", "s2"),
            ("action", "A full moon over a field of sleeping cows. Vasco drifts along the fence, hands behind his back, a man on an unhappy walk."),
            ("action", "One cow is awake. BETTINA (6, black and white, superb). She lifts her head and looks straight at him."),
            ("action", "A moth flutters away from Vasco's shoulder. Bettina watches the moth. Vasco does not notice the moth."),
            ("character", "VASCO"), ("paren", "(a hand on his heart)"), ("dialogue", "Madam."),
            ("character", "BETTINA"), ("dialogue", "Moo."),
            ("action", "Vasco staggers as if struck."),
        ]),
    },
}

SAMPLES = [("maya.demo@example.com", SALT_DEBT), ("theo.demo@example.com", PROJECTIONIST), ("ines.demo@example.com", NO_BULL)]
