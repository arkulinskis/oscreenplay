from anvil import *

from ._anvil_designer import WheelTemplate


class Wheel(WheelTemplate):
    """The Story Circle wheel (SVG from the engine). Properties redraw it."""

    def __init__(self, **properties):
        self._night, self._labels, self._active, self._ready = True, True, "", False
        super().__init__(**properties)
        self._ready = True
        self._draw()

    def _draw(self):
        if self._ready:
            from anvil.js import window
            window.OSF.wheel(self.dom_nodes["host"], self._night, self._labels, self._active)

    def host_click(self, event):
        seg = event.target.closest("[data-beat]")
        if seg:
            self.raise_event("beat_click", beat=str(seg.getAttribute("data-beat")))

    @property
    def night(self):
        return self._night

    @night.setter
    def night(self, value):
        self._night = bool(value)
        self._draw()

    @property
    def labels(self):
        return self._labels

    @labels.setter
    def labels(self, value):
        self._labels = bool(value)
        self._draw()

    @property
    def active(self):
        return self._active

    @active.setter
    def active(self, value):
        self._active = value or ""
        self._draw()
