import datetime

from anvil import *
from anvil.js import window

from ._anvil_designer import HomeTemplate
from ... import os_engine, router, state


def greeting():
    h = datetime.datetime.now().hour
    return "Writing late" if h < 5 else "Good morning" if h < 12 else "Good afternoon" if h < 18 else "Good evening"


GOAL_WORDS = {100: "half a page", 200: "1 page", 400: "2 pages", 600: "3 pages"}  # about 200 typed words a page


def num(n):
    """12345 -> "12,345" (no format mini-language needed in the browser's Python)."""
    s = str(int(n or 0))
    out = ""
    while len(s) > 3:
        out = "," + s[-3:] + out
        s = s[:-3]
    return s + out


def next_step(st):
    st = st or {}
    if not st.get("characters"):
        return "Meet your protagonist: open Cast and give them a want and a wound."
    if not st.get("scenes"):
        return "Lay out the story: add a scene card for every beat."
    if (st.get("beats_done") or 0) < (st.get("beats_total") or 8):
        return "Fill the empty beats in the Storyline."
    if not st.get("pages"):
        return "Draft your first pages from the scene cards."
    return "Keep writing pages. The doctor will tell you what to fix."


class Home(HomeTemplate):
    """#home = the Desk: the writer's screenplays as posters, tonight's prompt, the samples to study, the latest sparks,
    and the new-screenplay dialog."""

    def __init__(self, args=(), **properties):
        super().__init__(**properties)
        me = state.me() or {}
        first = (me.get("name") or "writer").strip().split(" ")
        first = [w for w in first if w.rstrip(".").lower() not in ("dr", "mr", "mrs", "ms", "sgt")] or ["writer"]
        self.dom_nodes["greet"].textContent = greeting()
        self.dom_nodes["first"].textContent = first[0] + "."
        self.prompt.text = window.OSF.prompt(False)
        self.dom_nodes["ideas_line"].textContent = "%s archetypes, wounds, twists, scene recipes" % window.OSF.ideaCount()
        self.posters_panel.add_event_handler("x-new", self._new)
        self._load()

    def _load(self, **event_args):
        d = state.call("get_desk", window.UI.localDay())
        if d is None:
            return
        projects = d["projects"]
        today = window.Date().toLocaleDateString([], {"weekday": "long", "day": "numeric", "month": "long"})
        self.dom_nodes["sub"].textContent = "%s · %s" % (today, state.plural(len(projects), "screenplay") + " in progress." if projects
                                                         else "Your first screenplay starts here. Pull a spark, or start from a structure.")
        last = projects[0] if projects else None
        self.continue_card.visible, self.start_card.visible = bool(last), not last
        if last:
            self.last_panel.items = [last]
            self.dom_nodes["last_title"].textContent = last["title"]
            self.dom_nodes["last_when"].textContent = "Edited " + state.ago(last["updated"])
            self.dom_nodes["last_meter"].style.width = "%d%%" % ((last.get("stats") or {}).get("readiness") or 5)
            self.dom_nodes["last_next"].textContent = next_step(last.get("stats"))
            state.set_attr(self.last_open, "href", router.href("project", last["id"]))
        self.last_id = last["id"] if last else ""
        self._draw_habit(d.get("habit"))
        self.posters_panel.items = [{"new": True}] + projects
        self.samples_sec.visible = bool(d["samples"])
        self.samples_panel.items = d["samples"]
        self.sparks_panel.items = d["sparks"][:6]
        self.no_sparks.visible = not d["sparks"]

    # ---- "Your writing week": the 28-frame film strip, streak, words, goal chips (server_code/Habits.py)
    def _draw_habit(self, h):
        self.habit_card.visible = bool(h)
        if not h:
            return  # the habits table isn't there yet (Schema Mismatch not accepted): no card
        goal = h["goal"]
        for g in (100, 200, 400, 600):
            b = getattr(self, "goal_%d" % g)
            on = g == goal
            b.role = ["btn", "btn-chip", "btn-on"] if on else ["btn", "btn-chip"]
            state.set_control_attr(b, "aria-pressed", "true" if on else "false")
            state.set_control_attr(b, "title", "%d typed words a day" % g)
        streak, today = h["streak"], h["today"]
        self.dom_nodes["hb_streak"].textContent = str(streak)
        self.dom_nodes["hb_streak_l"].textContent = "day streak" if streak else "day streak: start one today"
        self.dom_nodes["hb_streak_box"].className = "hb-stat" + (" hot" if streak >= 2 else "")
        self.dom_nodes["hb_week"].textContent = num(h["week"])
        self.dom_nodes["hb_today"].textContent = num(today)
        self.dom_nodes["hb_today_l"].textContent = ("word" if today == 1 else "words") + " today, goal " + num(goal)
        left = goal - today
        if not h.get("any"):
            sub = "Type in Pages and your words land here after each autosave. Hit the goal and today's frame lights up."
        elif left <= 0:
            sub = "Goal met today: the frame is lit." + (" %d days in a row." % streak if streak >= 2 else "")
        else:
            sub = "%s words to go for today's %s." % (num(left), GOAL_WORDS.get(goal, "goal"))
        self.dom_nodes["hb_sub"].textContent = sub
        self.dom_nodes["hb_tip"].textContent = (
            "Keep the chain going: %s tomorrow makes it %d days." % (GOAL_WORDS.get(goal, "your goal"), streak + 1) if streak >= 1
            else "Small, fixed targets finish scripts: a page a day is a feature draft in about four months.")
        self.frames_panel.items = h["frames"]
        self.sprint_link.visible = bool(getattr(self, "last_id", ""))
        if getattr(self, "last_id", ""):
            state.set_attr(self.sprint_link, "href", router.href("project", self.last_id, "pages"))

    def _goal(self, words):
        r = state.call("set_goal", words, window.UI.localDay())
        if r is not None:
            self._draw_habit(r["habit"])
            state.toast("Daily goal: %s (%d typed words)." % (GOAL_WORDS[words], words), "ok")

    @handle("goal_100", "click")
    def goal_100_click(self, **event_args):
        self._goal(100)

    @handle("goal_200", "click")
    def goal_200_click(self, **event_args):
        self._goal(200)

    @handle("goal_400", "click")
    def goal_400_click(self, **event_args):
        self._goal(400)

    @handle("goal_600", "click")
    def goal_600_click(self, **event_args):
        self._goal(600)

    @handle("another_button", "click")
    def another_button_click(self, **event_args):
        self.prompt.text = window.OSF.prompt(True)

    @handle("new_button", "click")
    def new_button_click(self, **event_args):
        self._new()

    def _new(self, **event_args):
        from ...Dialogs.NewProject import NewProject
        pid = alert(NewProject(), buttons=[], role="app-dialog", large=True)
        if pid:
            router.go("project", pid, "overview")
