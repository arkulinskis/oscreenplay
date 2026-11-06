import datetime

from anvil import *
from anvil.js import window

from ._anvil_designer import HomeTemplate
from ... import os_engine, router, state


def greeting():
    h = datetime.datetime.now().hour
    return "Writing late" if h < 5 else "Good morning" if h < 12 else "Good afternoon" if h < 18 else "Good evening"


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
        d = state.call("get_desk")
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
        self.posters_panel.items = [{"new": True}] + projects
        self.samples_sec.visible = bool(d["samples"])
        self.samples_panel.items = d["samples"]
        self.sparks_panel.items = d["sparks"][:6]
        self.no_sparks.visible = not d["sparks"]

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
