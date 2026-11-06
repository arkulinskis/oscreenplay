from anvil import *

from ._anvil_designer import StructureCardTemplate
from ... import state


class StructureCard(StructureCardTemplate):
    """One story structure on the Learn page, opening to its beats. item = {key, name, by, short, open, beats}."""

    def __init__(self, **properties):
        super().__init__(**properties)
        it = self.item
        self.dom_nodes["name"].textContent = it["name"]
        self.dom_nodes["by"].textContent = "%s · %s" % (it["by"], it["short"])
        if it.get("open"):
            state.set_attr(self.box, "open", "open")
        self.beats_panel.items = [dict(b, i=i + 1) for i, b in enumerate(it["beats"])]
