/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

// Posting messages to proper origin isn't possible on file://
let targetOrigin = location.protocol != "file:" ? location.origin : "*";

function createFrame(id, src, listener)
{
  let frame = document.createElement("iframe");
  frame.id = id;
  if (src)
    frame.src = src;
  if (listener)
    frame.addEventListener("load", listener);
  document.body.appendChild(frame);
}

window.addEventListener("load", function()
{
  createFrame("background", "background/background.html", () =>
  {
    createFrame("panel", "panel/panel.html", event =>
    {
      event.target.setAttribute("data-active", "true");
    });
    createFrame("allpasswords", null);
  });
});

let maxPortID = 0;

window.addEventListener("message", event =>
{
  if (event.origin != location.origin && !(event.origin == "null" && location.origin == "file://"))
    return;

  if (event.data.type == "get-port-id")
  {
    event.source.postMessage({
      type: "port-id",
      id: ++maxPortID
    }, targetOrigin);
    return;
  }
  else if (event.data.type == "show-allpasswords")
  {
    document.getElementById("panel").removeAttribute("data-active");

    let frame = document.getElementById("allpasswords");
    frame.src = "allpasswords/allpasswords.html";
    frame.setAttribute("data-active", "true");
    return;
  }

  // Forward incoming messages to the right frame
  let target = document.getElementById(event.data.target).contentWindow;
  target.postMessage(event.data, targetOrigin);
});
