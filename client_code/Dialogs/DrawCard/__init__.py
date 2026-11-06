from anvil import *

from ._anvil_designer import DrawCardTemplate
from ... import os_engine, state


class DrawCard(DrawCardTemplate):
    """A random idea card ("Draw a card" on the Ideas page). deck = a deck key, or "" for every deck.
    Closes with "again" (draw another) or None."""

    def __init__(self, deck="", **properties):
        super().__init__(**properties)
        self.card = os_engine.data("drawIdea", deck)
        self.deck.text = self.card["deck"]
        self.dom_nodes["title"].textContent = self.card["t"]
        self.d.text, self.d.visible = self.card["d"], bool(self.card["d"])
        self.x.text, self.x.visible = self.card["x"], bool(self.card["x"])

    @handle("again_button", "click")
    def again_button_click(self, **event_args):
        self.raise_event("x-close-alert", value="again")

    @handle("close_button", "click")
    def close_button_click(self, **event_args):
        self.raise_event("x-close-alert", value=None)

    @handle("copy_button", "click")
    def copy_button_click(self, **event_args):
        state.toast("Copied", "ok") if os_engine.copy_text(self.card["t"]) else state.toast("Select the text to copy it.")
