from anvil import *

from ._anvil_designer import IdeaCardTemplate
from ... import os_engine, state


class IdeaCard(IdeaCardTemplate):
    """One idea from a deck. item = {t, d, x, tags, deck}; deck = the deck's name when shown in search results."""

    def __init__(self, **properties):
        super().__init__(**properties)
        it = self.item
        self.dom_nodes["title"].textContent = it["t"]
        self.deck.text, self.deck.visible = it.get("deck") or "", bool(it.get("deck"))
        self.d.text, self.d.visible = it.get("d") or "", bool(it.get("d"))
        self.x.text, self.x.visible = it.get("x") or "", bool(it.get("x"))
        self.tags.text, self.tags.visible = it.get("tags") or "", bool(it.get("tags"))
        self.copy.tooltip = "Copy"
        state.set_control_attr(self.copy, "aria-label", "Copy " + it["t"])

    @handle("copy", "click")
    def copy_click(self, **event_args):
        state.toast("Copied", "ok") if os_engine.copy_text(self.item["t"]) else state.toast("Select the text to copy it.")
