import json

import anvil.server
from anvil import *
from anvil.js import window

from ._anvil_designer import ProjectTemplate
from ... import os_engine, router, state

TABS = ["overview", "cast", "web", "chronology", "storyline", "pages"]


class Project(ProjectTemplate):
    """#project/<id>/<tab>/<sub>: the workspace for one screenplay. The bar (title, autosave state, readiness), the
    sample banner and the tab menu are Python; the six tabs are the engine's editors (Components/Workspace), which keep
    the project in memory (OS.cache: switching tabs or coming back never re-fetches) and autosave the whole document."""

    def __init__(self, args=(), **properties):
        super().__init__(**properties)
        self.pid = args[0] if args else ""
        self.tab = args[1] if len(args) > 1 and args[1] in TABS else "overview"
        self.sub = args[2] if len(args) > 2 else ""
        self.shell.visible, self.missing.visible, self.loading.visible = False, False, True
        self.project = os_engine.NULL

    @handle("", "show")
    def form_show(self, **event_args):
        if self.project is not None:
            return
        cache = getattr(window.OS, "cache", None)  # missing JS properties raise AttributeError
        if cache and getattr(cache, "id", None) == self.pid and getattr(cache, "project", None):
            self._start(cache.project)
            return
        r = anvil.server.call("get_project", self.pid)
        if not r.get("ok"):
            self.loading.visible, self.missing.visible = False, True
            self.missing_text.text = r.get("error") or "It may have been deleted."
            return
        self._start(os_engine.js(r["project"]))

    def _start(self, project_js):
        self.project = project_js
        p = json.loads(window.JSON.stringify({"title": project_js.title, "genre": project_js.genre, "format": project_js.format,
                                              "color": project_js.color, "sample": project_js.sample, "author": project_js.author,
                                              "readonly": project_js.readonly, "id": project_js.id}))
        f = json.loads(window.OSF.poster(window.JSON.stringify(project_js)))
        kind = f["format"] + (" · " + p["genre"] if p.get("genre") else "") + (" · sample by " + (p.get("author") or "a writer") if p.get("sample") else "")
        self.dom_nodes["kind"].textContent = kind
        state.set_attr(self.dot, "style", f["style"])
        self.title_box.text = p.get("title") or ""
        self.title_box.enabled = not p.get("readonly")
        self.ro_bar.visible = bool(p.get("readonly"))
        self.dom_nodes["save_text"].textContent = "Read-only sample" if p.get("readonly") else "Saved"
        self.loading.visible, self.shell.visible = False, True
        self._mark(self.tab)
        self.workspace.mount(project_js, state.me() or {}, self.tab, self.sub)

    @handle("title_box", "show")
    def title_box_show(self, **event_args):
        state.set_control_attr(self.title_box, "aria-label", "Title")
        state.set_control_attr(self.title_box, "maxlength", "120")

    # ---- the workspace talks back
    @handle("workspace", "status")
    def workspace_status(self, kind="", text="", **event_args):
        for k in ("busy", "dirty", "err"):
            self.save_status.classes[k] = kind == k
        self.dom_nodes["save_text"].textContent = text

    @handle("workspace", "bar")
    def workspace_bar(self, info="", **event_args):
        d = json.loads(info)
        self.dom_nodes["ring"].style.setProperty("--v", str(d["score"]))
        self.dom_nodes["ring_num"].textContent = str(d["score"])
        for k, n in d["counts"].items():
            c = getattr(self, "c_" + k, None)
            if c is not None:
                c.text, c.visible = (str(n) if n else ""), bool(n)
        window.document.title = d["title"] + " · OScreenplay"

    @handle("workspace", "tab")
    def workspace_tab(self, name="", sub="", **event_args):
        self.tab, self.sub = name, sub
        self._mark(name)
        router.replace("project", self.pid, name, sub)
        bar = window.document.querySelector(".pj-tabs")
        top = getattr(bar, "offsetTop", 0) if bar else 0
        if bar and window.scrollY > top:
            window.scrollTo(0, max(0, top - 70))

    @handle("workspace", "retitle")
    def workspace_retitle(self, title="", **event_args):
        self.title_box.text = title

    # ---- the bar
    def _mark(self, tab):
        for k in TABS:
            link = getattr(self, "t_" + k)
            link.classes["on"] = k == tab
            state.set_attr(link, "href", router.href("project", self.pid, k))
            state.set_attr(link, "aria-current", "page" if k == tab else "false")

    def tab_click(self, event):
        event.preventDefault()
        self.workspace.go(event.currentTarget.getAttribute("data-tab"))

    def score_click(self, event):
        event.preventDefault()
        self.workspace.go("overview")

    @handle("title_box", "change")
    def title_box_change(self, **event_args):
        self.workspace.set_title(self.title_box.text or "")

    @handle("copy_button", "click")
    def copy_button_click(self, **event_args):
        r = state.call("duplicate_project", self.pid)
        if r is not None:
            state.toast('"%s" is now in your library.' % r["project"]["title"], "ok")
            window.OS.cache = window.Object()
            router.go("project", r["project"]["id"], self.tab)
