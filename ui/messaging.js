/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import {EventTarget, emit} from "../lib/eventTarget.js";
import {runtime} from "./browserAPI.js";

let messageQueue = null;
let portName = "contentScript";
if (typeof runtime.getBackgroundPage == "function")
{
  // If we can access the background page we are not in a content script.
  portName = document.documentElement.dataset.portname;
  messageQueue = [];
  document.addEventListener("DOMContentLoaded", () =>
  {
    let queue = messageQueue;
    messageQueue = null;

    for (let message of queue)
      emit(port, message.eventName, ...message.args);
  });
}

let nativePort = runtime.connect({name: portName});

export let port = new EventTarget();
port.name = portName;

port.emit = function(eventName, ...args)
{
  nativePort.postMessage({eventName, args});
};

port.disconnect = function()
{
  nativePort.disconnect();
};

nativePort.onMessage.addListener(message =>
{
  if (messageQueue)
    messageQueue.push(message);
  else
    emit(port, message.eventName, ...message.args);
});
