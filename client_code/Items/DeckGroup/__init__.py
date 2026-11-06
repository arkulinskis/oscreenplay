from anvil import *

from ._anvil_designer import DeckGroupTemplate


class DeckGroup(DeckGroupTemplate):
    """A group of decks in the Ideas menu. item = {group, decks: [{key, name, icon, count, on}]}."""

    def __init__(self, **properties):
        super().__init__(**properties)
        self.dom_nodes["group"].textContent = self.item["group"]
        self.decks_panel.items = self.item["decks"]
