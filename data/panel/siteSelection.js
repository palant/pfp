/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {setResetHandler, setSubmitHandler} = require("./events");
let state = require("./state");
let {$, getActivePanel, setActivePanel} = require("./utils");

let currentRequest = null;

setSubmitHandler("site-selection", () => done($("site-selection-site").value.trim()));
setResetHandler("site-selection", () => done(null));

function done(value)
{
  if (!currentRequest)
    return;

  setActivePanel(currentRequest.originalSelection, true);
  if (value)
    currentRequest.resolve(value);
  else
    currentRequest.reject();
  currentRequest = null;
}

function show(message)
{
  $("site-selection-label").textContent = message;

  let originalSelection = getActivePanel();
  setActivePanel("site-selection");

  $("site-selection-site").value = state.site;
  $("site-selection-site").select();

  return new Promise((resolve, reject) =>
  {
    currentRequest = {
      resolve, reject, originalSelection
    };
  });
}
exports.show = show;
