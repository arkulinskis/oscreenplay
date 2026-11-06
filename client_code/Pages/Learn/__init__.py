import anvil.js
from anvil import *
from anvil.js import window

from ._anvil_designer import LearnTemplate
from ... import os_engine, router

SECTIONS = ["format", "circle", "structures", "godfather", "character", "scenes", "dialogue", "glossary", "workflow"]


class Learn(LearnTemplate):
    """#learn/<section>: how to write a screenplay. The copy is HTML in the template; live parts: the Story Circle wheel
    and its step card, the structures (from the engine), and the table of contents that follows the scroll."""

    def __init__(self, args=(), **properties):
        super().__init__(**properties)
        self.start = args[0] if args and args[0] in SECTIONS else ""
        self.active = "you"
        self.structs_panel.items = os_engine.data("structures")
        self.wheel.night, self.wheel.labels = True, True
        self._scroll = anvil.js.report_exceptions(self._on_scroll)
        self._draw_step()

    def _draw_step(self):
        s = os_engine.data("circleStep", self.active)
        self.step = s
        self.wheel.active = s["key"]
        self.step_meta.text = "Step %d of 8 · %s" % (s["i"] + 1, s["phase"])
        self.step_n.text = s["n"]
        self.dom_nodes["step_d"].textContent = s["d"]
        self.dom_nodes["step_q"].textContent = s["q"]
        self.dom_nodes["step_mirror"].textContent = s["mirror"]

    @handle("wheel", "beat_click")
    def wheel_beat_click(self, beat="", **event_args):
        self.active = beat
        self._draw_step()

    @handle("prev_button", "click")
    def prev_button_click(self, **event_args):
        self.active = self.step["prev"]
        self._draw_step()

    @handle("next_button", "click")
    def next_button_click(self, **event_args):
        self.active = self.step["next"]
        self._draw_step()

    # ---- table of contents
    def _go(self, sec, instant=False):
        el = window.document.getElementById("ln-" + sec)
        if el:
            el.scrollIntoView({"behavior": "auto" if instant or window.UI.reducedMotion() else "smooth", "block": "start"})
        self._mark(sec)

    def _mark(self, sec):
        for a in window.Array["from"](self.dom_nodes["toc"].querySelectorAll("[data-sec]")):
            a.classList.toggle("on", a.getAttribute("data-sec") == sec)

    def toc_click(self, event):
        event.preventDefault()
        sec = event.currentTarget.getAttribute("data-sec")
        router.replace("learn", sec)
        self._go(sec)

    def _on_scroll(self, event=None):
        cur = SECTIONS[0]
        for s in SECTIONS:
            el = window.document.getElementById("ln-" + s)
            if el and el.getBoundingClientRect().top < 140:
                cur = s
        self._mark(cur)

    @handle("", "show")
    def form_show(self, **event_args):
        window.addEventListener("scroll", self._scroll, {"passive": True})
        if self.start:
            window.setTimeout(lambda: self._go(self.start, True), 60)
        else:
            self._on_scroll()

    @handle("", "hide")
    def form_hide(self, **event_args):
        window.removeEventListener("scroll", self._scroll)
