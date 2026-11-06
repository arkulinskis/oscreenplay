from anvil import *

from ._anvil_designer import ShapeChipTemplate
from ... import state


class ShapeChip(ShapeChipTemplate):
    """A story shape on the Spark page. item = {key, name, on}."""

    def __init__(self, **properties):
        super().__init__(**properties)
        self.chip.text = self.item["name"]
        if self.item.get("on"):
            self.chip.role = ["btn", "btn-chip", "btn-on"]
        state.set_control_attr(self.chip, "aria-pressed", "true" if self.item.get("on") else "false")

    @handle("chip", "click")
    def chip_click(self, **event_args):
        self.parent.raise_event("x-shape", key=self.item["key"])
