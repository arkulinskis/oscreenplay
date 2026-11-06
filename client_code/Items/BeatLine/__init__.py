from anvil import *

from ._anvil_designer import BeatLineTemplate


class BeatLine(BeatLineTemplate):
    """One beat of a structure (Learn page). item = {i, n, pct, d, q}."""

    def __init__(self, **properties):
        super().__init__(**properties)
        it = self.item
        self.dom_nodes["n"].textContent = "%d. %s" % (it["i"], it["n"])
        self.dom_nodes["pct"].textContent = "(%d%%)" % it["pct"]
        self.dom_nodes["d"].textContent = it["d"]
        self.dom_nodes["q"].textContent = it["q"]
