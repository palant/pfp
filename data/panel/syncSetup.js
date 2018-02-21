/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {setCommandHandler, setSubmitHandler, setResetHandler} = require("./events");
let {sync} = require("../proxy");
let state = require("./state");
let {$, setActivePanel} = require("./utils");

setCommandHandler("sync-setup-link", () => setActivePanel("sync-setup"));
setSubmitHandler("sync-setup", authorize);
setResetHandler("sync-setup", () => setActivePanel("password-list"));

state.on("update", updateLink);

function updateLink()
{
  $("sync-setup-link").hidden = state.sync.provider;
}

function authorize()
{
  sync.authorize("dropbox");
  window.close();
}
