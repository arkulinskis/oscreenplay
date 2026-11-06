from anvil import *

from ._anvil_designer import SparkCardTemplate
from ... import state


class SparkCard(SparkCardTemplate):
    """A saved spark on the Desk. item = a spark from get_desk."""

    def __init__(self, **properties):
        super().__init__(**properties)
        self.dom_nodes["title"].textContent = self.item["title"]
        self.text.text = self.item["text"]
        self.when.text = state.ago(self.item["created"])
