from anvil import *

from ._anvil_designer import CastRowTemplate


class CastRow(CastRowTemplate):
    """A starter character on the Spark page. item = {name, initials, color, line}."""

    def __init__(self, **properties):
        super().__init__(**properties)
        av = self.dom_nodes["avatar"]
        av.textContent = self.item["initials"]
        av.style.background = self.item["color"]
        self.dom_nodes["name"].textContent = self.item["name"]
        self.dom_nodes["line"].textContent = self.item["line"]
