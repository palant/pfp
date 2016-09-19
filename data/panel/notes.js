/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {passwords} = require("../proxy");
let {setSubmitHandler, setResetHandler} = require("./events");
let state = require("./state");
let {$, setActivePanel, showUnknownError} = require("./utils");

setSubmitHandler("notes", saveNotes);
setResetHandler("notes", setActivePanel.bind(null, "password-list"));

state.on("update", updateSiteName);
updateSiteName();

let currentPassword = null;

function updateSiteName()
{
  $("notes-website-name").textContent = state.site;
}

function edit(password, notes)
{
  currentPassword = password;

  setActivePanel("notes");

  $("notes-user-name").textContent = password.name;

  let revisionField = $("notes-password-revision");
  revisionField.hidden = !password.revision;
  revisionField.textContent = password.revision;

  $("notes-textarea").value = notes;
}
exports.edit = edit;

function saveNotes()
{
  let notes = $("notes-textarea").value.trim();
  let action;
  if (notes)
    action = passwords.setNotes(state.site, currentPassword.name, currentPassword.revision, notes);
  else
    action = passwords.removeNotes(state.site, currentPassword.name, currentPassword.revision);

  action.then(pwdList =>
  {
    state.set({pwdList});
    setActivePanel("password-list");
  }).catch(showUnknownError);
}
