from anvil import *

from ._anvil_designer import DeckLinkTemplate
from ... import router, state


class DeckLink(DeckLinkTemplate):
    """A deck in the Ideas menu. item = {key, name, icon, count, on}."""

    def __init__(self, **properties):
        super().__init__(**properties)
        it = self.item
        state.set_attr(self.link, "href", router.href("ideas", it["key"]))
        self.icon.classes.add("ic-" + it["icon"])
        self.link.classes["on"] = bool(it.get("on"))
        if it.get("on"):
            state.set_attr(self.link, "aria-current", "page")
        self.dom_nodes["name"].textContent = it["name"]
        self.dom_nodes["count"].textContent = str(it["count"])
