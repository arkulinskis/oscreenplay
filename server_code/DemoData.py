"""Demo content, so the app never looks empty. Loaded automatically the first time anyone opens the Desk
(ensure_loaded), removed or reloaded from Admin -> Demo data. Removing it is remembered: it doesn't come back.

The demo is three sample screenplays (Samples.py), each "written" by a demo writer. Every signed-in writer
sees them on the Desk under "Study the samples", can open them read-only and copy them into their own library.
Demo users have is_demo=True and @example.com emails; they can't sign in (no password).
"""
import copy
import datetime as dt

from anvil.tables import app_tables

from . import common as C
from . import Samples

DEMO_USERS = [
    ("Maya Chen", "maya.demo@example.com"),
    ("Theo Martin", "theo.demo@example.com"),
    ("Ines Ozola", "ines.demo@example.com"),
]
# Tables that hold demo rows (each has an is_demo column). Children before parents.
DEMO_TABLES = ["sparks", "projects"]


def state():
    return C.get_setting("demo", "never")  # "never" | "loaded" | "removed"


def ensure_loaded():
    """Call from the app's main data callables: loads the demo once, unless an admin removed it."""
    if state() == "never":
        load()


def load():
    remove(remember=False)
    users = {}
    for name, email in DEMO_USERS:
        u = app_tables.users.get(email=email) or app_tables.users.add_row(email=email, enabled=False)
        u.update(display_name=name, is_demo=True, signed_up=C.now() - dt.timedelta(days=60))
        users[email] = u
    for i, (email, sample) in enumerate(Samples.SAMPLES):
        stamp = C.now() - dt.timedelta(days=30 - i)
        app_tables.projects.add_row(owner=users[email], title=sample["title"], logline=sample["logline"], genre=sample["genre"],
                                    format=sample["format"], structure=sample["structure"], color=sample["color"],
                                    doc=copy.deepcopy(sample["doc"]), stats=_stats(sample), created=stamp, updated=stamp, is_demo=True)
    C.set_setting("demo", "loaded")
    return counts()


def _stats(sample):
    """Library numbers for a sample (the page recomputes the exact ones when the project is opened)."""
    d = sample["doc"]
    return {"characters": len(d["characters"]), "relations": len(d["relations"]), "events": len(d["events"]), "scenes": len(d["scenes"]),
            "pages": round(len(d["script"]) / 22.0, 1), "beats_done": len({s["beat"] for s in d["scenes"]}),
            "beats_total": {"seq": 8, "three": 9, "circle": 8}.get(sample["structure"], 8), "readiness": 82}


def remove(remember=True):
    for name in DEMO_TABLES:
        for r in getattr(app_tables, name).search(is_demo=True):
            r.delete()
    for u in app_tables.users.search(is_demo=True):
        u.delete()
    if remember:
        C.set_setting("demo", "removed")
    return counts()


def counts():
    out = {"users": len(app_tables.users.search(is_demo=True))}
    for name in DEMO_TABLES:
        out[name] = len(getattr(app_tables, name).search(is_demo=True))
    return out
