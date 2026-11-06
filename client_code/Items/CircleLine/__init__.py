from anvil import *

from ._anvil_designer import CircleLineTemplate


class CircleLine(CircleLineTemplate):
    """One step of the spark's Story Circle. item = {i, n, text}."""

    def __init__(self, **properties):
        super().__init__(**properties)
        self.dom_nodes["n"].textContent = str(self.item["i"])
        b = self.item["n"]
        self.dom_nodes["text"].innerHTML = ""
        from anvil.js import window
        strong = window.document.createElement("b")
        strong.textContent = b + ": "
        self.dom_nodes["text"].appendChild(strong)
        self.dom_nodes["text"].appendChild(window.document.createTextNode(self.item["text"]))
