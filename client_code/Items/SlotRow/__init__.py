from anvil import *

from ._anvil_designer import SlotRowTemplate
from ... import state


class SlotRow(SlotRowTemplate):
    """One slot of the spark (Spark page, "Every slot"). item = {k, label, value, locked}; Roll / Lock raise x-roll /
    x-lock on the panel."""

    def __init__(self, **properties):
        super().__init__(**properties)
        it = self.item
        self.k.text, self.v.text = it["label"], it["value"]
        self.roll.tooltip, self.lock.tooltip = "Roll this slot", "Lock"
        state.set_control_attr(self.roll, "aria-label", "Roll " + it["label"])
        state.set_control_attr(self.lock, "aria-label", "Lock " + it["label"])
        state.set_control_attr(self.lock, "aria-pressed", "true" if it["locked"] else "false")
        if it["locked"]:
            self.lock.role = ["btn", "btn-sq", "ic-lock", "btn-on"]

    @handle("roll", "click")
    def roll_click(self, **event_args):
        self.parent.raise_event("x-roll", key=self.item["k"])

    @handle("lock", "click")
    def lock_click(self, **event_args):
        self.parent.raise_event("x-lock", key=self.item["k"])
