import json

import anvil.server
from anvil import *
from anvil.js import window

from ._anvil_designer import SparkTemplate
from ... import os_engine, router, state


class Spark(SparkTemplate):
    """#spark, the story slot machine. The spark (st) is a JavaScript object from the engine; this page draws views of it
    (window.OSF.sparkView), keeps up to 20 earlier pulls, saves sparks to the vault and develops one into a project."""

    def __init__(self, args=(), **properties):
        super().__init__(**properties)
        pending = state.store_get("pendingSpark")
        self.st = window.OSF.sparkState(window.JSON.stringify(pending) if pending else "null")
        if pending:
            window.UI.store.set("pendingSpark", None)
        self.history, self.vault = [], []
        self.format = state.store_get("sparkFormat", "feature")
        ch = os_engine.data("sparkChoices")
        self.genre_box.items = [("Any (surprise me)", "any")] + [(n, k) for k, n in ch["genres"]]
        self.format_box.items = [(n, k) for k, n in ch["formats"]]
        self.format_box.selected_value = self.format
        self.templates = ch["templates"]
        self.machine.attach(self.st, self._changed)
        self.slots_panel.add_event_handler("x-roll", self._roll)
        self.slots_panel.add_event_handler("x-lock", self._lock)
        self.shapes_panel.add_event_handler("x-shape", self._shape)
        self.history_panel.add_event_handler("x-restore", self._restore)
        self.vault_panel.add_event_handler("x-reopen", self._reopen)
        self.vault_panel.add_event_handler("x-develop", self._develop_saved)
        self.vault_panel.add_event_handler("x-delete", self._delete)
        self._draw_all()
        self._draw_ctrl()
        r = state.call("list_sparks")
        self.vault = r["sparks"] if r else []
        self._draw_vault()

    @handle("", "show")
    def form_show(self, **event_args):
        state.set_control_attr(self.genre_box, "aria-label", "Genre")
        state.set_control_attr(self.format_box, "aria-label", "Develop as")

    # ---- drawing
    def _draw_all(self, changed="", swap=False):
        v = os_engine.data("sparkView", self.st)
        self.machine.draw(changed, swap)
        self.slots_panel.items = v["slots"]
        self.logline.text, self.theme.text = v["logline"], v["theme"]
        self.circle_panel.items = [dict(c, i=i + 1) for i, c in enumerate(v["circle"])]
        self.cast_panel.items = v["cast"]
        self.history_sec.visible = bool(self.history)
        self.history_panel.items = [dict(json.loads(window.OSF.sparkHistoryLabel(s)), i=i)
                                    for i, s in reversed(list(enumerate(self.history)))]
        self.back_button.enabled = bool(self.history)

    def _draw_ctrl(self):
        v = os_engine.data("sparkView", self.st)
        self.genre_box.selected_value = v["genre_key"] if v["genre_key"] in [k for _, k in self.genre_box.items] else "any"
        self.dom_nodes["weird"].value = str(v["weird"])
        self.dom_nodes["weird_val"].textContent = str(v["weird"])
        self.shapes_panel.items = [{"key": k, "name": n, "on": k == v["tpl"]} for k, n in self.templates]

    def _draw_vault(self):
        self.vault_panel.items = self.vault
        self.vault_empty.visible = not self.vault
        self.vault_count.text = state.plural(len(self.vault), "spark") if self.vault else ""

    def _snapshot(self):
        self.history.append(window.OSF.sparkSnapshot(self.st))
        self.history = self.history[-20:]

    # ---- the machine
    def _changed(self, slot):
        self._draw_all(slot)

    @handle("pull_button", "click")
    def pull_button_click(self, **event_args):
        self._snapshot()
        window.OSF.sparkPull(self.st)
        self._draw_all("", True)

    @handle("back_button", "click")
    def back_button_click(self, **event_args):
        if self.history:
            window.OSF.sparkRestore(self.st, self.history.pop(), False)
            self._draw_all("", True)
            self._draw_ctrl()

    def _restore(self, i=0, **event_args):
        snap = self.history[i]
        self._snapshot()
        window.OSF.sparkRestore(self.st, snap, True)
        self._draw_all("", True)
        self._draw_ctrl()

    def _roll(self, key="", **event_args):
        self._snapshot()
        if window.OSF.sparkRoll(self.st, key):
            self._draw_all(key)
        else:
            self.history.pop()

    def _lock(self, key="", **event_args):
        window.OSF.sparkLock(self.st, key)
        self._draw_all()

    def _shape(self, key="", **event_args):
        window.OSF.sparkSet(self.st, "tpl", key)
        self._draw_ctrl()
        self._draw_all()

    @handle("genre_box", "change")
    def genre_box_change(self, **event_args):
        self._snapshot()
        window.OSF.sparkSet(self.st, "genre", self.genre_box.selected_value)
        self._draw_all("", True)

    def weird_input(self, event):
        window.OSF.sparkSet(self.st, "weird", event.target.value)
        self.dom_nodes["weird_val"].textContent = str(event.target.value)

    @handle("format_box", "change")
    def format_box_change(self, **event_args):
        self.format = self.format_box.selected_value
        state.store_set("sparkFormat", self.format)

    @handle("copy_button", "click")
    def copy_button_click(self, **event_args):
        if os_engine.copy_text(self.logline.text):
            state.toast("Logline copied", "ok")
        else:
            state.toast("Copy it from the card.")

    @handle("save_button", "click")
    def save_button_click(self, **event_args):
        args = json.loads(window.OSF.sparkSaveArgs(self.st))
        r = state.call("save_spark", *args)
        if r is not None:
            self.vault.insert(0, r["spark"])
            self._draw_vault()
            state.toast("Saved to your vault", "ok")

    def _develop(self, seed_json, button):
        button.enabled = False
        try:
            r = state.call("create_project", json.loads(seed_json))
        finally:
            button.enabled = True
        if r is not None:
            state.toast('Developed into "%s". Your cast, timeline and cards are waiting.' % r["project"]["title"], "ok")
            router.go("project", r["project"]["id"], "overview")

    @handle("develop_button", "click")
    def develop_button_click(self, **event_args):
        self._develop(window.OSF.sparkSeed(self.st, self.format), self.develop_button)

    # ---- the vault
    def _reopen(self, spark=None, **event_args):
        self._snapshot()
        window.OSF.sparkFromSaved(self.st, json.dumps(spark))
        self._draw_all("", True)
        self._draw_ctrl()
        window.scrollTo({"top": 0, "behavior": "auto" if window.UI.reducedMotion() else "smooth"})

    def _develop_saved(self, spark=None, button=None, **event_args):
        self._develop(window.OSF.savedSeed(json.dumps(spark), self.format), button)

    def _delete(self, spark=None, **event_args):
        if not spark:
            return
        if confirm(spark["title"], title="Delete this spark?", buttons=[("Cancel", False), ("Delete", True)], role="app-dialog"):
            if state.call("delete_spark", spark["id"]) is not None:
                self.vault = [x for x in self.vault if x["id"] != spark["id"]]
                self._draw_vault()
