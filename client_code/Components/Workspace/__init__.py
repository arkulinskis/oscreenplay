from anvil import *

from ._anvil_designer import WorkspaceTemplate
from ... import os_engine


class Workspace(WorkspaceTemplate):
    """The project editor: a JavaScript engine (editors, drag and drop, the braid, the screenplay editor)."""

    def __init__(self, **properties):
        self.ctl = os_engine.NULL
        super().__init__(**properties)

    def mount(self, project_js, me, tab, sub):
        from anvil.js import window
        self.destroy()
        hooks = os_engine.obj(status=self._status, bar=self._bar, tab=self._tab, retitle=self._retitle)
        self.ctl = window.OS.workspace(self.dom_nodes["host"], project_js, hooks, os_engine.js(me), tab, sub or None)

    def go(self, tab, sub=None):
        if self.ctl is not None:
            self.ctl.go(tab, sub)

    def set_title(self, text):
        if self.ctl is not None:
            self.ctl.setTitle(text)

    def destroy(self):
        if self.ctl is not None:
            self.ctl.destroy()
            self.ctl = os_engine.NULL

    def _status(self, kind, text):
        self.raise_event("status", kind=str(kind or ""), text=str(text or ""))

    def _bar(self, info):
        self.raise_event("bar", info=str(info))

    def _tab(self, name, sub):
        self.raise_event("tab", name=str(name), sub=str(sub or ""))

    def _retitle(self, title):
        self.raise_event("retitle", title=str(title or ""))

    @handle("", "hide")
    def form_hide(self, **event_args):
        self.destroy()
