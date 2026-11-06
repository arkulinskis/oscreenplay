"""The app starts here (anvil.yaml: startup module). One server call to learn who is signed in (Anvil's loading
spinner shows meanwhile), the Privacy & Terms kit, the engine's server bridge, then the page for the address."""
import anvil.server
from anvil.js import window

from . import legal, os_engine, router, state

LEGAL_THEME = {"accent": "#c8102e"}  # colours for the Privacy & Terms page (match --c-brand in app.css)

legal.setup(LEGAL_THEME)
window.OS_SERVER = os_engine.server_bridge  # the JavaScript engine's server calls (os-ui.js UI.api)
state.set_me(anvil.server.call("get_me"))
if state.me():
    legal.refresh_soon()
router.start()
