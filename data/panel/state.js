/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {EventTarget, emit} = require("../../lib/eventTarget");
let {prefs} = require("../proxy");

module.exports = exports = new EventTarget();
exports.site = null;
exports.origSite = null;
exports.pwdList = null;
exports.masterPasswordState = null;

let stateToPanel = {
  "unset": ["change-master"],
  "set": ["enter-master", "change-master"],
  "known": ["password-list", "generate-password", "legacy-password", "qrcode", "sync-setup", "sync-state", "confirm"],
  "known:no-site-storage": ["generate-password", "confirm"]
};

function set(state)
{
  for (let key of Object.keys(state))
    exports[key] = state[key];

  if ("masterPasswordState" in state)
  {
    prefs.get("site_storage").then(site_storage =>
    {
      let {getActivePanel, setActivePanel} = require("./utils");
      let stateKey = state.masterPasswordState;
      let tryStateKey = state.masterPasswordState + ":no-site-storage";
      if (!site_storage && tryStateKey in stateToPanel)
        stateKey = tryStateKey;
      let panels = stateToPanel[stateKey];
      if (panels.indexOf(getActivePanel()) < 0)
        setActivePanel(panels[0]);
    });
  }

  emit(exports, "update");
}
exports.set = set;
