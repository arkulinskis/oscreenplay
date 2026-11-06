from anvil import *

from ._anvil_designer import HistoryChipTemplate


class HistoryChip(HistoryChipTemplate):
    """An earlier pull on the Spark page. item = {i, title, line}; a click raises x-restore."""

    def __init__(self, **properties):
        super().__init__(**properties)
        self.dom_nodes["title"].textContent = self.item["title"]
        self.dom_nodes["line"].textContent = self.item["line"]

    def hist_click(self, event):
        self.parent.raise_event("x-restore", i=self.item["i"])
