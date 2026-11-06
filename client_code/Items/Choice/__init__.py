from anvil import *

from ._anvil_designer import ChoiceTemplate


class Choice(ChoiceTemplate):
    """One option in a group of choice buttons (the new-screenplay dialog). item = {key, name, sub, on}; a click raises
    x-pick on the panel."""

    def __init__(self, **properties):
        super().__init__(**properties)
        self.dom_nodes["name"].textContent = self.item["name"]
        self.dom_nodes["sub"].textContent = self.item.get("sub") or ""
        self.choice.classes["on"] = bool(self.item.get("on"))
        from ... import state
        state.set_attr(self.choice, "aria-pressed", "true" if self.item.get("on") else "false")

    def choice_click(self, event):
        self.parent.raise_event("x-pick", key=self.item["key"])
