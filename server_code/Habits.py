"""The writing habit: words typed in Pages per day, finished sprints, a daily goal and the streak (the Desk's
"Your writing week" card).

One `habits` row per writer: goal (words a day), days = {"2026-11-20": {"w": 340, "s": 1}} (w = words typed that day,
s = sprints finished), trimmed to the newest 120 days. The browser sends what it typed with each autosave
(Projects.save_project: patch keys typed, day, sprint); drafted, imported and pasted text never counts.
Days are the writer's local dates, accepted only within one day of today in UTC.
Every table access sits in try/except: until the user accepts the Schema Mismatch (new table), saving and the Desk
keep working and the card stays hidden.
"""
import datetime as dt
import re

import anvil.server
from anvil.tables import app_tables

from . import common as C

GOALS = (100, 200, 400, 600)      # half a page, 1, 2 or 3 pages a day (about 200 typed words a page)
DEFAULT_GOAL = 200
KEEP_DAYS = 120
MAX_TYPED = 3000                  # words one autosave may add (a save comes every few seconds while typing)
MAX_SPRINTS = 5


def _today_utc():
    return dt.datetime.now(dt.timezone.utc).date()


def _day(value):
    """A YYYY-MM-DD string within one day of today (UTC) -> date, else None."""
    if not isinstance(value, str) or not re.match(r"^\d{4}-\d{2}-\d{2}$", value):
        return None
    try:
        d = dt.date.fromisoformat(value)
    except ValueError:
        return None
    return d if abs((d - _today_utc()).days) <= 1 else None


def _int(value, lo, hi):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return 0
    return int(max(lo, min(hi, value)))


def _row(me, create=False):
    r = app_tables.habits.get(owner=me)
    if r is None and create:
        r = app_tables.habits.add_row(owner=me, goal=DEFAULT_GOAL, days={}, updated=C.now())
    return r


def log_typing(me, day, typed, sprint=0):
    """Add typed words (and finished sprints) to the writer's day. Returns True when something was stored."""
    d = _day(day)
    typed, sprint = _int(typed, 0, MAX_TYPED), _int(sprint, 0, MAX_SPRINTS)
    if me is None or d is None or not (typed or sprint):
        return False
    try:
        r = _row(me, create=True)
        days = dict(r["days"] or {})
        key = d.isoformat()
        cur = days.get(key) if isinstance(days.get(key), dict) else {}
        days[key] = {"w": int(cur.get("w") or 0) + typed, "s": int(cur.get("s") or 0) + sprint}
        for old in sorted(days)[:-KEEP_DAYS]:
            del days[old]
        r.update(days=days, updated=C.now())
        return True
    except Exception as e:
        try:
            from . import AppStatus
            AppStatus.log_server_error("Habits.log_typing", e)
        except Exception:
            pass
        return False


def summary(me, today=None):
    """{goal, streak, week, today, best, frames: 28 days ending today [{day, w, s, level, fill, today, label}]}, or None
    when the table isn't there yet. level 0 = no writing, 1 = some, 2 = goal met."""
    if me is None:
        return None
    try:
        r = _row(me)
        goal = int(r["goal"]) if r is not None and r["goal"] in GOALS else DEFAULT_GOAL
        days = dict(r["days"] or {}) if r is not None else {}
    except Exception:
        return None
    end = _day(today) or _today_utc()

    def words(d):
        v = days.get(d.isoformat())
        return (int(v.get("w") or 0), int(v.get("s") or 0)) if isinstance(v, dict) else (0, 0)

    frames = []
    for k in range(27, -1, -1):
        d = end - dt.timedelta(days=k)
        w, s = words(d)
        level = 2 if w >= goal else 1 if w > 0 else 0
        label = "%s %d %s: %s%s%s" % (d.strftime("%a"), d.day, d.strftime("%b"), "%d words" % w if w else "no writing",
                                      ", goal met" if level == 2 else "", (", %d sprint%s" % (s, "" if s == 1 else "s")) if s else "")
        frames.append({"day": d.isoformat(), "w": w, "s": s, "level": level, "fill": round(min(1.0, w / float(goal)), 2),
                       "today": k == 0, "label": ("Today, " if k == 0 else "") + label})
    streak, d = 0, end
    if words(d)[0] < goal:      # today isn't over: an unmet today doesn't break the streak
        d = d - dt.timedelta(days=1)
    while words(d)[0] >= goal:
        streak += 1
        d = d - dt.timedelta(days=1)
    monday = end - dt.timedelta(days=end.weekday())
    week = sum(words(monday + dt.timedelta(days=k))[0] for k in range((end - monday).days + 1))
    return {"goal": goal, "streak": streak, "week": week, "today": words(end)[0], "today_sprints": words(end)[1],
            "frames": frames, "any": any(f["w"] or f["s"] for f in frames)}


@anvil.server.callable(require_user=True)
def set_goal(words, today=None):
    """The daily goal in typed words: 100, 200, 400 or 600 (half a page to three pages)."""
    me = C.require_user()
    if isinstance(words, bool) or words not in GOALS:
        return C.fail("Pick half a page, 1, 2 or 3 pages a day.")
    try:
        r = _row(me, create=True)
        r.update(goal=int(words), updated=C.now())
    except Exception:
        return C.fail("The writing week isn't switched on yet. Try again a little later.")
    return C.ok(habit=summary(me, today))
