/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {setSubmitHandler, setResetHandler} = require("./events");
let state = require("./state");
let {$, setActivePanel} = require("./utils");

setSubmitHandler("notes", alert.bind(null, "FIXME"));
setResetHandler("notes", setActivePanel.bind(null, "password-list"));

function edit(password, notes)
{
  $("notes-user-name").textContent = password.name;
  $("notes-password-revision").textContent = password.revision;
  $("notes-website-name").textContent = state.site;

  setActivePanel("notes");
  $("notes-textarea").value = notes;
}
exports.edit = edit;
