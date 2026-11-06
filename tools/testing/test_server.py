"""Server tests against the strict mock of Anvil (tools/testing/mock).

    python tools/testing/test_server.py          -> prints ALL OK, or the first failure

call(name, ...) runs a server function the way the browser does: by name, with require_user enforced,
and the reply must be JSON (a datetime or a row in a reply fails here, like it would break the page).
Add tests for every new server function: the happy path, bad input, and someone who isn't allowed.
"""
import datetime as dt
import importlib
import json
import os
import pathlib
import shutil
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve().parent
PROJECT = HERE.parents[1]
_tmp = pathlib.Path(tempfile.mkdtemp())
shutil.copytree(PROJECT / "server_code", _tmp / "app")
(_tmp / "app" / "__init__.py").write_text("")
os.environ["ANVIL_APP_YAML"] = str(PROJECT / "anvil.yaml")  # the mock's tables follow the app's own schema
sys.path[:0] = [str(HERE / "mock"), str(_tmp)]
import anvil.server  # noqa: E402
import anvil.users  # noqa: E402
from anvil.tables import app_tables as T  # noqa: E402

M = {p.stem: importlib.import_module("app." + p.stem) for p in sorted((PROJECT / "server_code").glob("*.py"))}
now = dt.datetime.now(dt.timezone.utc)


def call(name, *args):
    r = anvil.server.call(name, *args)
    json.dumps(r)  # strict: must be JSON-able
    return r


def as_user(row):
    anvil.users.CURRENT[0] = row
    anvil.server.session.use(row.get_id() if row is not None else None)


def denied(name, *args):
    try:
        call(name, *args)
    except anvil.server.PermissionDenied:
        return True
    return False


def ok(r, msg=""):
    assert isinstance(r, dict) and r.get("ok"), (msg, r)
    return r


def bad(r, msg=""):
    assert isinstance(r, dict) and r.get("ok") is False and r.get("error"), (msg, r)
    return r


def person(email, name=None, **kw):
    return T.users.add_row(email=email, enabled=True, signed_up=now, display_name=name, **kw)


# ---------------------------------------------------------------------------------- accounts
admin = person("arkulinskis@gmail.com", "The Admin")
ana = person("ana@example.com", "Ana")
bob = person("bob@example.com")

as_user(None)
assert call("get_me") is None
assert denied("update_profile", "X")
as_user(admin)
assert call("get_me")["is_admin"] is True, "ADMIN_EMAILS become admins on first sign-in"
as_user(ana)
me = call("get_me")
assert me["name"] == "Ana" and me["is_admin"] is False
assert ana["last_seen"] is not None
as_user(bob)
assert call("get_me")["name"] == "Bob", "a name comes from the email when none is set"
bad(call("update_profile", " x "))
assert ok(call("update_profile", "  Bob   Stone "))["me"]["name"] == "Bob Stone"

# ---------------------------------------------------------------------------------- feedback
as_user(None)
bad(call("submit_feedback", "bug", "hi"))
ok(call("submit_feedback", "bug", "The button is broken", "guest@example.com", {"page": "#home", "evil": "x" * 9999}))
fb = T.feedback.search()[0]
assert fb["name"] == "Guest" and fb["email"] == "guest@example.com" and "evil" not in fb["context"] and fb["status"] == "new"
for i in range(4):
    ok(call("submit_feedback", "idea", "Idea number %d" % i))
bad(call("submit_feedback", "idea", "One too many this hour"), "rate limit")
as_user(ana)
ok(call("submit_feedback", "nonsense-kind", "Signed-in feedback"))
assert T.feedback.get(message="Signed-in feedback")["kind"] == "other"
assert denied("list_feedback")
as_user(admin)
lst = call("list_feedback")
assert lst["counts"]["new"] == 6 and len(lst["items"]) == 6
fid = lst["items"][0]["id"]
ok(call("set_feedback_status", fid, "done", "Fixed it"))
assert call("list_feedback", "done")["items"][0]["note"] == "Fixed it"
bad(call("set_feedback_status", fid, "weird"))
bad(call("set_feedback_status", "nope", "done"))
ok(call("delete_feedback", fid))
assert len(call("list_feedback")["items"]) == 5

# ---------------------------------------------------------------------------------- admin
as_user(ana)
for fn, args in [("admin_overview", ()), ("list_users", ()), ("set_admin", (bob.get_id(), True)), ("demo_load", ()), ("demo_remove", ())]:
    assert denied(fn, *args), fn
as_user(admin)
ov = call("admin_overview")
assert ov["users"] == 3 and ov["admins"] == 1 and ov["feedback_new"] == 5
assert len(call("list_users")["users"]) == 3 and len(call("list_users", "bob")["users"]) == 1
ok(call("set_admin", bob.get_id(), True))
assert bob["is_admin"] is True
bad(call("set_admin", admin.get_id(), False), "can't remove your own admin")
ok(call("set_enabled", bob.get_id(), False))
assert bob["enabled"] is False
bad(call("set_enabled", admin.get_id(), False))
ok(call("set_enabled", bob.get_id(), True))
ok(call("set_admin", bob.get_id(), False))
assert bob["is_admin"] is False

# ---------------------------------------------------------------------------------- demo data + the Desk
as_user(None)
assert denied("get_desk")
as_user(ana)
desk = call("get_desk")
assert M["DemoData"].state() == "loaded", "demo loads on first visit"
assert len(desk["samples"]) == len(M["Samples"].SAMPLES) and desk["projects"] == [] and desk["sparks"] == []
assert all(s["sample"] and not s["mine"] and s["author"] for s in desk["samples"])
sample_id = desk["samples"][0]["id"]

# ---------------------------------------------------------------------------------- projects
full = ok(call("get_project", sample_id))["project"]
assert full["readonly"] and full["doc"]["characters"], "samples open read-only for everyone"
bad(call("save_project", sample_id, {"title": "Mine now"}), "nobody can save a sample")
bad(call("delete_project", sample_id), "nobody deletes a sample")
bad(call("get_project", "nope"))
p1 = ok(call("create_project", {"title": "  My   Script ", "format": "short", "structure": "cat", "color": "teal", "doc": {"characters": []}}))["project"]
assert p1["title"] == "My Script" and p1["format"] == "short" and p1["structure"] == "cat" and p1["color"] == "teal" and p1["mine"]
p2 = ok(call("create_project", {"format": "weird", "structure": "nope", "color": "plaid"}))["project"]
assert p2["title"] == "Untitled screenplay" and p2["format"] == "feature" and p2["structure"] == "circle" and p2["color"] == "ember"
bad(call("create_project", {"doc": "not a dict"}))
bad(call("create_project", {"doc": {"big": "x" * 1600000}}), "size cap")
ok(call("save_project", p1["id"], {"title": "Renamed", "logline": "A logline.", "genre": "Drama", "doc": {"characters": [{"id": "c1", "name": "Nora"}]},
                                   "stats": {"scenes": 3, "pages": 1.5, "evil": "x", "readiness": True}, "structure": "hero"}))
got = ok(call("get_project", p1["id"]))["project"]
assert got["title"] == "Renamed" and got["doc"]["characters"][0]["name"] == "Nora" and got["stats"] == {"scenes": 3, "pages": 1.5} and got["structure"] == "hero"
assert not got["readonly"]
bad(call("save_project", p1["id"], "nope"))
bad(call("save_project", p1["id"], {"doc": ["list"]}))
copy1 = ok(call("duplicate_project", p1["id"]))["project"]
assert copy1["title"] == "Renamed (copy)" and copy1["mine"]
copy_sample = ok(call("duplicate_project", sample_id))["project"]
assert copy_sample["title"] == desk["samples"][0]["title"] and copy_sample["mine"] and not copy_sample["sample"]
assert ok(call("get_project", copy_sample["id"]))["project"]["doc"]["scenes"], "the copy has the whole document"
assert len(call("get_desk")["projects"]) == 4
as_user(bob)
bad(call("get_project", p1["id"]), "others can't open my project")
bad(call("save_project", p1["id"], {"title": "Hacked"}))
bad(call("delete_project", p1["id"]))
bad(call("duplicate_project", p1["id"]))
assert call("get_desk")["projects"] == []
as_user(ana)
ok(call("delete_project", copy1["id"]))
ok(call("delete_project", copy1["id"]), "deleting twice is fine")
assert len(call("get_desk")["projects"]) == 3

# ---------------------------------------------------------------------------------- sparks
as_user(None)
assert denied("save_spark", "t", "A story about something")
assert denied("list_sparks")
as_user(ana)
bad(call("save_spark", "Title", "short"))
sp = ok(call("save_spark", "There Is No Bull", "A lonely vampire falls in love with a cow.", {"hero": "vampire", "locked": True, "n": 3, "bad": {"x": 1}}))["spark"]
assert sp["slots"] == {"hero": "vampire", "locked": True, "n": 3}, "slots keep plain values only"
assert call("list_sparks")["total"] == 1 and call("get_desk")["sparks"][0]["id"] == sp["id"]
as_user(bob)
bad(call("delete_spark", sp["id"]))
assert call("list_sparks")["total"] == 0
as_user(ana)
ok(call("delete_spark", sp["id"]))
assert call("list_sparks")["total"] == 0

# ---------------------------------------------------------------------------------- demo removal keeps real data
as_user(admin)
ov = call("admin_overview")
assert ov["projects"] == 3 and ov["writers"] == 1 and ov["sparks"] == 0
ok(call("demo_remove"))
assert M["DemoData"].state() == "removed" and not T.projects.search(is_demo=True) and not T.users.search(is_demo=True)
as_user(ana)
assert call("get_desk")["samples"] == [] and len(call("get_desk")["projects"]) == 3, "removing demo data keeps real data"
assert M["DemoData"].state() == "removed", "removed demo data doesn't come back by itself"
as_user(admin)
ok(call("demo_load"))
ok(call("demo_load"))
assert len(T.projects.search(is_demo=True)) == len(M["Samples"].SAMPLES), "reloading replaces the demo instead of doubling it"

# ---------------------------------------------------------------------------------- Privacy & Terms
if "legal_server" in M:
    as_user(ana)
    st = call("legal_state")
    assert st["signedIn"] and st["accepted_version"] is None
    ok(call("legal_accept", st["version"], "signup"))
    assert ana["legal_source"] == "signup" and call("legal_state")["accepted_version"] == st["version"]

# ---------------------------------------------------------------------------------- every callable is covered by a permission check
# A callable that changes data without require_user / a C.require_* check is a security hole. List the public ones here.
PUBLIC = {"get_me", "submit_feedback", "legal_state", "legal_accept"}
for name, (f, need) in sorted(anvil.server.CALLABLES.items()):
    if name in PUBLIC:
        continue
    assert need, "%s is callable by anyone: add require_user=True (or list it in PUBLIC in test_server.py)" % name

print("ALL OK (%d server functions)" % len(anvil.server.CALLABLES))
