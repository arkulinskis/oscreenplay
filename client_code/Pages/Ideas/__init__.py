from anvil import *
from anvil.js import window

from ._anvil_designer import IdeasTemplate
from ... import os_engine, router, state


class Ideas(IdeasTemplate):
    """#ideas/<deck>: the idea library (the engine's decks): browse a deck, search every deck, draw a random card."""

    def __init__(self, args=(), **properties):
        super().__init__(**properties)
        self.groups = os_engine.data("decks")
        keys = [d["key"] for g in self.groups for d in g["decks"]]
        self.deck = args[0] if args and args[0] in keys else "archetypes"
        self.query = ""
        self.dom_nodes["lead"].textContent = ("%s ideas. Every suggestion button in your projects draws from these decks. "
                                              "Browse, search, or let fate deal a card." % window.OSF.ideaCount())
        self.deck_box.items = [("%s: %s (%d)" % (g["group"], d["name"], d["count"]), d["key"]) for g in self.groups for d in g["decks"]]
        self._draw()

    @handle("", "show")
    def form_show(self, **event_args):
        state.set_control_attr(self.q_box, "aria-label", "Search ideas")
        state.set_control_attr(self.q_box, "type", "search")
        state.set_control_attr(self.deck_box, "aria-label", "Deck")

    def _draw(self):
        self.groups_panel.items = [{"group": g["group"], "decks": [dict(d, on=(d["key"] == self.deck and not self.query)) for d in g["decks"]]}
                                   for g in self.groups]
        self.deck_box.selected_value = self.deck
        if self.query:
            r = os_engine.data("searchIdeas", self.query)
            self.dom_nodes["deck_title"].textContent = "%s for \u201c%s\u201d" % (state.plural(r["count"], "idea"), self.query)
            self.dom_nodes["deck_about"].textContent = "Showing the first 120." if r["count"] > 120 else ""
            self.cards_panel.items = r["cards"]
            self.no_hits.visible = not r["cards"]
            return
        d = os_engine.data("deck", self.deck)
        self.dom_nodes["deck_title"].textContent = d["name"]
        self.dom_nodes["deck_about"].textContent = "%s · %s" % (d["group"], d["about"])
        self.cards_panel.items = d["cards"]
        self.no_hits.visible = False

    @handle("q_box", "change")
    def q_box_change(self, **event_args):
        self.query = (self.q_box.text or "").strip().lower()
        self._draw()

    @handle("deck_box", "change")
    def deck_box_change(self, **event_args):
        self.deck, self.query, self.q_box.text = self.deck_box.selected_value, "", ""
        router.replace("ideas", self.deck)
        self._draw()

    @handle("draw_button", "click")
    def draw_button_click(self, **event_args):
        from ...Dialogs.DrawCard import DrawCard
        while alert(DrawCard(deck="" if self.query else self.deck), buttons=[], role="app-dialog") == "again":
            pass
