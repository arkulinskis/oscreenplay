from anvil import *

from ._anvil_designer import SparkMachineTemplate
from ... import os_engine


class SparkMachine(SparkMachineTemplate):
    """The spark's title + abstract with swappable chips (a JavaScript engine: the popovers, the chip markup)."""

    def __init__(self, **properties):
        self.st = os_engine.NULL
        self._cb = None
        super().__init__(**properties)

    def attach(self, st, on_change=None):
        self.st, self._cb = st, on_change
        from anvil.js import window
        window.OSF.bindMachine(self.dom_nodes["host"], st, self._changed)
        self.draw()

    def draw(self, changed="", swap=False):
        from anvil.js import window
        host = self.dom_nodes["host"]
        window.OSF.drawMachine(host, self.st, changed or None)
        if swap:  # the one authored moment: a short blur crossfade when a new spark arrives
            host.classList.remove("swap")
            getattr(host, "offsetWidth")
            host.classList.add("swap")

    def _changed(self, slot):
        if self._cb is not None:
            self._cb(str(slot or ""))
        self.raise_event("change", slot=str(slot or ""))
