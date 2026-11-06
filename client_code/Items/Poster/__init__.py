import json

from anvil import *

from ._anvil_designer import PosterTemplate
from ... import os_engine, router, state


class Poster(PosterTemplate):
    """A screenplay as a 9:16 poster (link to the project). item = a project summary from get_desk, or {"new": True}
    for the "New screenplay" tile (raises x-new on the panel)."""

    def __init__(self, **properties):
        super().__init__(**properties)
        it = self.item
        new = bool(it.get("new"))
        self.card.visible, self.new_tile.visible = not new, new
        if new:
            return
        info = os_engine.data("poster", json.dumps(it))
        state.set_attr(self.card, "href", router.href("project", it["id"]))
        state.set_attr(self.card, "style", info["style"])
        state.set_attr(self.card, "aria-label", "%s (%s)" % (it.get("title") or "Untitled", info["format"]))
        from anvil.js import window
        window.OSF.segs(self.dom_nodes["segs"], info["segs"], info["on"])
        self.gen.text = info["gen"]
        self.sample.visible = bool(it.get("sample"))
        self.title.text = it.get("title") or "Untitled"
        self.line.text = it.get("logline") or "No logline yet."
        self.meta.text = info["meta"]

    def new_click(self, event):
        self.parent.raise_event("x-new")
