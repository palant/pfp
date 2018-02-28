/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {i18n} = require("../browserAPI");
let {confirm} = require("./confirm");
let {setCommandHandler, setSubmitHandler, setResetHandler} = require("./events");
let {sync} = require("../proxy");
let state = require("./state");
let {$, setActivePanel} = require("./utils");

const displayNames = new Map([
  ["dropbox", "Dropbox"],
  ["gdrive", "Google Drive"]
]);

setCommandHandler("sync-state-link", () => setActivePanel("sync-state"));
setCommandHandler("do-sync", () => sync.sync());
setSubmitHandler("sync-state", disable);
setResetHandler("sync-state", () => setActivePanel("password-list"));

state.on("update", updateState);

function updateState()
{
  $("sync-state-link").hidden = !state.sync.provider;
  $("sync-provider").textContent = displayNames.get(state.sync.provider) || state.sync.provider;
  $("do-sync").disabled = state.sync.isSyncing;
  if (state.sync.isSyncing)
  {
    $("sync-lastTime").textContent = i18n.getMessage("sync_lastTime_now");
    $("sync-lastTime-container").className = "";
  }
  else if (state.sync.lastSync)
  {
    $("sync-lastTime").textContent = new Date(state.sync.lastSync).toLocaleString();
    $("sync-lastTime-container").className = (state.sync.error ? "failed" : "succeeded");
  }
  else
  {
    $("sync-lastTime").textContent = i18n.getMessage("sync_lastTime_never");
    $("sync-lastTime-container").className = "";
  }

  if (state.sync.error)
    $("sync-error").textContent = i18n.getMessage(state.sync.error) || state.sync.error;
  $("sync-error").hidden = !state.sync.error;
  $("sync-state-link").className = (state.sync.error && state.sync.error != "sync_connection_error" ? "failed" : "");
}

function disable()
{
  confirm(i18n.getMessage("sync_disable_confirmation")).then(disable =>
  {
    if (disable)
    {
      sync.disable().then(() =>
      {
        setActivePanel("password-list");
      });
    }
  });
}
