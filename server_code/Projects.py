"""Screenplay projects: the writer's library, one project at a time, autosave, copies, samples.

A project's whole working state (cast, relationships, both timelines, scene cards, setups/payoffs and the
script pages) lives in one JSON document (`doc`). The browser edits it and autosaves it; the server only
checks who owns it and how big it is. The columns next to it (title, logline, genre, stats...) feed the library.

Sample projects are the demo rows (is_demo=True, made by DemoData): every signed-in writer can open them
read-only and copy them into their own library.
"""
import json

import anvil.server
from anvil.tables import app_tables
import anvil.tables as tables

from . import common as C
from . import DemoData

FORMATS = {"feature", "short", "pilot30", "pilot60", "vertical"}
STRUCTURES = {"circle", "three", "cat", "hero", "seq", "kisho"}
COLORS = {"ember", "tungsten", "teal", "violet", "ink", "rose", "moss"}
STAT_KEYS = ("characters", "relations", "events", "scenes", "pages", "words", "readiness", "beats_done", "beats_total")
DOC_LIMIT = 1500000      # characters of JSON per project (a 120-page script is about 250k)
MAX_PROJECTS = 200


def _clean_stats(stats):
    out = {}
    if isinstance(stats, dict):
        for k in STAT_KEYS:
            v = stats.get(k)
            if isinstance(v, (int, float)) and not isinstance(v, bool):
                out[k] = max(0, min(10 ** 7, round(v, 2)))
    return out


def _clean_doc(doc):
    """(doc, error). The doc must be a JSON object under DOC_LIMIT characters."""
    if doc is None:
        return {}, None
    if not isinstance(doc, dict):
        return None, "That project data isn't valid."
    try:
        size = len(json.dumps(doc))
    except (TypeError, ValueError):
        return None, "That project data isn't valid."
    if size > DOC_LIMIT:
        return None, "This project has grown too big to save (over 1.5 MB). Split it into two projects."
    return doc, None


def _summary(r, me):
    owner = r["owner"]
    return {"id": r.get_id(), "title": r["title"] or "Untitled", "logline": r["logline"] or "", "genre": r["genre"] or "",
            "format": r["format"] or "feature", "structure": r["structure"] or "circle", "color": r["color"] or "ember",
            "stats": r["stats"] or {}, "updated": C.iso(r["updated"]), "created": C.iso(r["created"]),
            "sample": bool(r["is_demo"]), "mine": me is not None and owner == me,
            "author": C.name_of(owner) if r["is_demo"] else None}


def _full(r, me):
    out = _summary(r, me)
    out["doc"] = r["doc"] or {}
    out["readonly"] = not out["mine"]
    return out


def _can_read(r, me):
    return r is not None and (r["is_demo"] or (me is not None and r["owner"] == me))


def _new_fields(seed):
    seed = seed if isinstance(seed, dict) else {}
    doc, err = _clean_doc(seed.get("doc"))
    if err:
        return None, err
    fmt = seed.get("format") if seed.get("format") in FORMATS else "feature"
    structure = seed.get("structure") if seed.get("structure") in STRUCTURES else "circle"
    color = seed.get("color") if seed.get("color") in COLORS else "ember"
    title = C.text(seed.get("title"), 120) or "Untitled screenplay"
    return {"title": title, "logline": C.text(seed.get("logline"), 600, multiline=True), "genre": C.text(seed.get("genre"), 60),
            "format": fmt, "structure": structure, "color": color, "doc": doc, "stats": _clean_stats(seed.get("stats"))}, None


@anvil.server.callable(require_user=True)
def get_desk():
    """The Desk page in one call: my projects, the samples, my latest sparks."""
    DemoData.ensure_loaded()
    me = C.require_user()
    mine = app_tables.projects.search(tables.order_by("updated", ascending=False), owner=me)
    samples = app_tables.projects.search(tables.order_by("created", ascending=True), is_demo=True)
    sparks = app_tables.sparks.search(tables.order_by("created", ascending=False), owner=me)
    from . import Sparks
    return {"projects": [_summary(r, me) for r in mine], "samples": [_summary(r, me) for r in samples],
            "sparks": [Sparks.spark_dict(s) for s in sparks[:8]], "spark_total": len(sparks)}


@anvil.server.callable(require_user=True)
def get_project(project_id):
    me = C.require_user()
    r = C.row_by_id(app_tables.projects, project_id)
    if not _can_read(r, me):
        return C.fail("That project doesn't exist, or it isn't yours.")
    return C.ok(project=_full(r, me))


@anvil.server.callable(require_user=True)
def create_project(seed=None):
    me = C.require_user()
    if len(app_tables.projects.search(owner=me)) >= MAX_PROJECTS:
        return C.fail("You have %d projects, the most one account can keep. Delete an old one first." % MAX_PROJECTS)
    if C.rate_limited("create_project", 40, 3600):
        return C.fail("That's a lot of new projects in one hour. Take a breath and try again a little later.")
    fields, err = _new_fields(seed)
    if err:
        return C.fail(err)
    stamp = C.now()
    r = app_tables.projects.add_row(owner=me, created=stamp, updated=stamp, is_demo=False, **fields)
    return C.ok(project=_summary(r, me))


@anvil.server.callable(require_user=True)
def save_project(project_id, patch):
    """Autosave. patch may hold title, logline, genre, format, structure, color, doc, stats."""
    me = C.require_user()
    r = C.row_by_id(app_tables.projects, project_id)
    if r is None or r["owner"] != me:
        return C.fail("You can only save your own projects. Make a copy of a sample to edit it.")
    if not isinstance(patch, dict):
        return C.fail("Nothing to save.")
    if C.rate_limited("save_project", 900, 3600):
        return C.fail("Saving paused for a moment (too many saves this hour). Your work is still on this page.")
    changes = {}
    if "title" in patch:
        changes["title"] = C.text(patch["title"], 120) or "Untitled screenplay"
    if "logline" in patch:
        changes["logline"] = C.text(patch["logline"], 600, multiline=True)
    if "genre" in patch:
        changes["genre"] = C.text(patch["genre"], 60)
    if patch.get("format") in FORMATS:
        changes["format"] = patch["format"]
    if patch.get("structure") in STRUCTURES:
        changes["structure"] = patch["structure"]
    if patch.get("color") in COLORS:
        changes["color"] = patch["color"]
    if "doc" in patch:
        doc, err = _clean_doc(patch["doc"])
        if err:
            return C.fail(err)
        changes["doc"] = doc
    if "stats" in patch:
        changes["stats"] = _clean_stats(patch["stats"])
    changes["updated"] = C.now()
    r.update(**changes)
    return C.ok(updated=C.iso(r["updated"]))


@anvil.server.callable(require_user=True)
def duplicate_project(project_id):
    """Copy one of my projects, or a sample, into my library."""
    me = C.require_user()
    r = C.row_by_id(app_tables.projects, project_id)
    if not _can_read(r, me):
        return C.fail("That project doesn't exist, or it isn't yours.")
    title = r["title"] or "Untitled"
    seed = {"title": title if r["is_demo"] else (title + " (copy)")[:120], "logline": r["logline"], "genre": r["genre"],
            "format": r["format"], "structure": r["structure"], "color": r["color"], "doc": r["doc"], "stats": r["stats"]}
    return create_project(seed)


@anvil.server.callable(require_user=True)
def delete_project(project_id):
    me = C.require_user()
    r = C.row_by_id(app_tables.projects, project_id)
    if r is None:
        return C.ok()
    if r["owner"] != me or r["is_demo"]:
        return C.fail("You can only delete your own projects.")
    r.delete()
    return C.ok()


def counts():
    real = [r for r in app_tables.projects.search() if not r["is_demo"]]
    return {"projects": len(real), "writers": len({r["owner"].get_id() for r in real if r["owner"] is not None})}
