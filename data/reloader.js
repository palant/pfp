/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

/* global window, chrome, XMLHttpRequest */

let random = null;

function checkReload()
{
  let request = new XMLHttpRequest();
  request.open("GET", chrome.runtime.getURL("random.json"));
  request.responseType = "json";
  request.onload = () =>
  {
    if (random === null)
      random = request.response;
    else if (random != request.response)
      chrome.runtime.reload();
  };
  request.send();
}

window.setInterval(checkReload, 100);
