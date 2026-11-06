"""Python side of OScreenplay's JavaScript engine (theme/assets/os-*.js: the lexicon, Spark, reactions, the script
doctor, SVG drawings and the six project tabs). The engine stays JavaScript; Forms read it through window.OSF, which
returns JSON text, and hand dicts to it as JS objects. server_bridge is how the engine's own server calls (the project
tabs' autosave, duplicate, delete) reach Anvil: startup.py puts it on window.OS_SERVER."""
import json

import anvil.js
import anvil.server
from anvil.js import window

NULL = anvil.js.call(window.Function("return null"))  # a typed "nothing" for attributes that later hold JS objects


def data(fn, *args):
    """window.OSF.<fn>(*args), parsed from JSON."""
    return json.loads(getattr(window.OSF, fn)(*args))


def js(value):
    """A Python dict/list as a plain JavaScript object (for the engine)."""
    return window.JSON.parse(json.dumps(value))


def obj(**values):
    """A JavaScript object with these attributes (functions stay callable from JavaScript)."""
    o = window.Object()
    for k, v in values.items():
        setattr(o, k, v)
    return o


ENGINE_CALLS = {"save_project", "duplicate_project", "delete_project", "get_project", "create_project",
                "list_sparks", "save_spark", "delete_spark", "get_desk"}


def server_bridge(fn, args_json, quiet=False):
    """Called from JavaScript (UI.api / UI.apiQuiet in os-ui.js). Always returns JSON text: {"result": ...} or
    {"error": "...", "expected": true|false}. Expected = the server's own {"ok": False, "error"} answer."""
    if fn not in ENGINE_CALLS:
        return json.dumps({"error": "Unknown action.", "expected": False})
    try:
        args = json.loads(args_json)
        r = anvil.server.call_s(fn, *args) if quiet else anvil.server.call(fn, *args)
    except anvil.server.AppOfflineError:
        return json.dumps({"error": "You're offline. Your work is still on this page.", "expected": True})
    except Exception as e:
        return json.dumps({"error": str(e) or "That didn't work.", "expected": False})
    if isinstance(r, dict) and r.get("ok") is False:
        return json.dumps({"error": r.get("error") or "That didn't work.", "expected": True})
    return json.dumps({"result": r})


def copy_text(text):
    """Copy to the clipboard; True if the browser allowed it."""
    try:
        window.navigator.clipboard.writeText(text)
        return True
    except Exception:
        return False
