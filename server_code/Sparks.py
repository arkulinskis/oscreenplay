"""Sparks: story abstracts made on the Spark page (the slot generator), saved to a writer's vault.

The generator runs in the browser (web/pages/_engine.html); the server only keeps the ones a writer saves:
the abstract's text and the slot values, so the Spark page can reopen it and keep swapping.
"""
import anvil.server
from anvil.tables import app_tables
import anvil.tables as tables

from . import common as C

MAX_SPARKS = 300


def _clean_slots(slots):
    out = {}
    if isinstance(slots, dict):
        for k, v in list(slots.items())[:40]:
            key = C.text(k, 30)
            if not key:
                continue
            if isinstance(v, str):
                out[key] = C.text(v, 300)
            elif isinstance(v, (int, float, bool)) or v is None:
                out[key] = v
    return out


def spark_dict(r):
    return {"id": r.get_id(), "title": r["title"] or "Untitled spark", "text": r["text"] or "",
            "slots": r["slots"] or {}, "created": C.iso(r["created"])}


@anvil.server.callable(require_user=True)
def list_sparks():
    me = C.require_user()
    rows = app_tables.sparks.search(tables.order_by("created", ascending=False), owner=me)
    return {"sparks": [spark_dict(r) for r in rows[:MAX_SPARKS]], "total": len(rows)}


@anvil.server.callable(require_user=True)
def save_spark(title, text, slots=None):
    me = C.require_user()
    text = C.text(text, 3000, multiline=True)
    if len(text) < 10:
        return C.fail("There's no story to save yet. Pull the lever first.")
    if len(app_tables.sparks.search(owner=me)) >= MAX_SPARKS:
        return C.fail("Your vault is full (%d sparks). Delete a few old ones first." % MAX_SPARKS)
    if C.rate_limited("save_spark", 120, 3600):
        return C.fail("That's a lot of sparks for one hour. Try again a little later.")
    r = app_tables.sparks.add_row(owner=me, title=C.text(title, 120) or "Untitled spark", text=text,
                                  slots=_clean_slots(slots), created=C.now(), is_demo=False)
    return C.ok(spark=spark_dict(r))


@anvil.server.callable(require_user=True)
def delete_spark(spark_id):
    me = C.require_user()
    r = C.row_by_id(app_tables.sparks, spark_id)
    if r is None:
        return C.ok()
    if r["owner"] != me:
        return C.fail("You can only delete your own sparks.")
    r.delete()
    return C.ok()


def count():
    return len([r for r in app_tables.sparks.search() if not r["is_demo"]])
