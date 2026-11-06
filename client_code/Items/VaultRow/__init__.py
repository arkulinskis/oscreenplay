from anvil import *

from ._anvil_designer import VaultRowTemplate
from ... import state


class VaultRow(VaultRowTemplate):
    """A saved spark in the vault. item = a spark from list_sparks. Reopen / Develop / Delete raise x-reopen /
    x-develop / x-delete on the panel."""

    def __init__(self, **properties):
        super().__init__(**properties)
        self.dom_nodes["title"].textContent = self.item["title"]
        self.text.text = self.item["text"]
        self.when.text = state.ago(self.item["created"])
        state.set_control_attr(self.delete, "aria-label", "Delete " + self.item["title"])

    @handle("reopen", "click")
    def reopen_click(self, **event_args):
        self.parent.raise_event("x-reopen", spark=self.item)

    @handle("develop", "click")
    def develop_click(self, **event_args):
        self.parent.raise_event("x-develop", spark=self.item, button=self.develop)

    @handle("delete", "click")
    def delete_click(self, **event_args):
        self.parent.raise_event("x-delete", spark=self.item)
