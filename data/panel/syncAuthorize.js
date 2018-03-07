/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {setSubmitHandler, setResetHandler} = require("./events");
let {$, getActivePanel, setActivePanel} = require("./utils");

let currentRequest = null;

setSubmitHandler("sync-authorize", () => done($("sync-token").value.trim()));
setResetHandler("sync-authorize", () => done());

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

function show()
{
  let originalSelection = getActivePanel();
  setActivePanel("sync-authorize");

  return new Promise((resolve, reject) =>
  {
    currentRequest = {
      resolve, reject, originalSelection
    };
  });
}
exports.show = show;
