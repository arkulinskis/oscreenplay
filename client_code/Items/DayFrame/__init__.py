from anvil import *

from ._anvil_designer import DayFrameTemplate


class DayFrame(DayFrameTemplate):
    """One day on the Desk's writing-week film strip. item = {day, w, s, level (0 none, 1 some, 2 goal met), fill (0-1),
    today, label} from Habits.summary."""

    def __init__(self, **properties):
        super().__init__(**properties)
        it = self.item
        node = self.dom_nodes["frame"]
        node.className = "hb-frame lv%d%s%s" % (it.get("level") or 0, " today" if it.get("today") else "", " sp" if it.get("s") else "")
        node.style.setProperty("--f", "%.2f" % float(it.get("fill") or 0))
        node.setAttribute("aria-label", it.get("label") or "")
        node.setAttribute("title", it.get("label") or "")
