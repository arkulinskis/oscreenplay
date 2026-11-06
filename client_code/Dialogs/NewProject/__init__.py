import json

import anvil.server
from anvil import *
from anvil.js import window

from ._anvil_designer import NewProjectTemplate
from ... import os_engine, state

STARTS = [("beats", "A card for every beat", "Scene cards ready to fill"), ("empty", "An empty project", "Just a protagonist"),
          ("spark", "A random spark", "A whole story to rewrite")]


class NewProject(NewProjectTemplate):
    """New screenplay: title, format, genre, structure, and how to start (cards for every beat, empty, a random spark).
    The engine builds the starting document (window.OSF.seed); closes with the new project's id, or None."""

    def __init__(self, **properties):
        super().__init__(**properties)
        o = os_engine.data("newProjectOptions")
        self.format_box.items = [(n, k) for k, n in o["formats"]]
        self.genre_box.items = [("Decide later", "")] + [(g, g) for g in o["genres"]]
        self.structs = o["structures"]
        self.structure, self.start = self.structs[0]["key"], "beats"
        self.structs_panel.add_event_handler("x-pick", self._pick_struct)
        self.starts_panel.add_event_handler("x-pick", self._pick_start)
        self._draw()

    def _draw(self):
        self.structs_panel.items = [{"key": s["key"], "name": s["name"], "sub": "%s · %d beats" % (s["by"], s["beats"]),
                                     "on": s["key"] == self.structure} for s in self.structs]
        self.starts_panel.items = [{"key": k, "name": n, "sub": sub, "on": k == self.start} for k, n, sub in STARTS]

    def _pick_struct(self, key="", **event_args):
        self.structure = key
        self._draw()

    def _pick_start(self, key="", **event_args):
        self.start = key
        self._draw()

    @handle("", "show")
    def form_show(self, **event_args):
        state.focus(self.title_box)
        state.set_control_attr(self.format_box, "aria-label", "Format")
        state.set_control_attr(self.genre_box, "aria-label", "Genre")

    @handle("cancel_button", "click")
    def cancel_button_click(self, **event_args):
        self.raise_event("x-close-alert", value=None)

    @handle("title_box", "pressed_enter")
    def title_box_pressed_enter(self, **event_args):
        self.create_button_click()

    @handle("create_button", "click")
    def create_button_click(self, **event_args):
        v = {"title": self.title_box.text or "", "format": self.format_box.selected_value, "genre": self.genre_box.selected_value or "",
             "structure": self.structure, "start": self.start}
        seed = json.loads(window.OSF.seed(json.dumps(v)))
        self.create_button.enabled = False
        try:
            r = anvil.server.call("create_project", seed)
        finally:
            self.create_button.enabled = True
        if not r.get("ok"):
            self.message.text, self.message.visible = r.get("error") or "That didn't work.", True
            return
        self.raise_event("x-close-alert", value=r["project"]["id"])
