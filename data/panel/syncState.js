/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {confirm} = require("./confirm");
let {setCommandHandler, setSubmitHandler, setResetHandler} = require("./events");
let {sync} = require("../proxy");
let state = require("./state");
let {$, setActivePanel, messages} = require("./utils");

setCommandHandler("sync-state-link", () => setActivePanel("sync-state"));
setSubmitHandler("sync-state", disable);
setResetHandler("sync-state", () => setActivePanel("password-list"));

state.on("update", updateState);

function updateState()
{
  $("sync-state-link").hidden = !state.syncProvider;
  $("sync-provider").textContent = state.syncProvider;
  if (state.syncLastTime)
    $("sync-lastTime").textContent = new Date(state.syncLastTime).toLocaleString();
  else
    $("sync-lastTime").textContent = messages["sync-lastTime-never"];
}

function disable()
{
  confirm(messages["sync-disable-confirmation"]).then(disable =>
  {
    if (disable)
    {
      sync.disable().then(() =>
      {
        state.set({syncProvider: null});
        setActivePanel("password-list");
      });
    }
  });
}
