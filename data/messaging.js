/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let browser = require("./browserAPI");
let {EventTarget, emit} = require("../lib/eventTarget");

let messageQueue = null;
let portName = "contentScript";
if (typeof browser.runtime.getBackgroundPage == "function")
{
  // If we can access the background page we are not in a content script.
  portName = document.documentElement.dataset.portname;
  messageQueue = [];
  document.addEventListener("DOMContentLoaded", event =>
  {
    let queue = messageQueue;
    messageQueue = null;

    for (let message of queue)
      emit(exports.port, message.eventName, ...message.args);
  });
}

let port = browser.runtime.connect({name: portName});

exports.port = new EventTarget();
exports.port.name = portName;

exports.port.emit = function(eventName, ...args)
{
  port.postMessage({eventName, args});
};

exports.port.disconnect = function()
{
  port.disconnect();
};

port.onMessage.addListener(message =>
{
  if (messageQueue)
    messageQueue.push(message);
  else
    emit(exports.port, message.eventName, ...message.args);
});
