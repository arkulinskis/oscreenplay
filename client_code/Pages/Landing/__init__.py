import json

from anvil import *
from anvil.js import window

from ._anvil_designer import LandingTemplate
from ... import os_engine, router, state


class Landing(LandingTemplate):
    """#landing, the front page (also "About" for members). The hero is a live Spark machine: visitors pull the lever and
    swap words before signing up; "Develop this one" keeps the spark for the Spark page (after sign-up for visitors)."""

    def __init__(self, args=(), **properties):
        super().__init__(**properties)
        me = state.me()
        self.guest_cta.visible = not me
        self.member_cta.visible = bool(me)
        if me:
            state.set_attr(self.band_link, "href", "#spark")
            self.dom_nodes["band_text"].textContent = "Pull a spark"
        self.st = window.OSF.reelState()
        self.reel.attach(self.st, self._changed)
        self.wheel.night, self.wheel.labels = True, True
        n = os_engine.data("numbers")
        self.n_ideas.text, self.n_react.text = str(n["ideas"]), str(n["reactions"])
        self.n_struct.text, self.n_rel.text = str(n["structures"]), str(n["relations"])

    def _changed(self, slot):
        self.reel.draw(slot)

    @handle("pull_button", "click")
    def pull_button_click(self, **event_args):
        window.OSF.sparkPull(self.st)
        self.reel.draw("", True)

    @handle("develop_button", "click")
    def develop_button_click(self, **event_args):
        window.UI.store.set("pendingSpark", window.JSON.parse(window.OSF.pendingSpark(self.st)))
        if state.me():
            router.go("spark")
        else:
            router.remember_after("#spark")
            router.go("auth", "signup")

    @handle("wheel", "beat_click")
    def wheel_beat_click(self, beat="", **event_args):
        tip = window.OSF.beatTip(beat)
        if tip:
            state.toast(tip)
