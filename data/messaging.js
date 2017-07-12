/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

/* global browser */

let messageQueue = [];

let {EventTarget, emit} = require("../lib/eventTarget");

let port = browser.runtime.connect({name: document.documentElement.dataset.portname});

exports.port = new EventTarget();
exports.port.name = port.name;

exports.port.emit = function(eventName, ...args)
{
  port.postMessage({eventName, args});
};

port.onMessage.addListener(message =>
{
  if (messageQueue)
    messageQueue.push(message);
  else
    emit(exports.port, message.eventName, ...message.args);
});

document.addEventListener("DOMContentLoaded", event =>
{
  let queue = messageQueue;
  messageQueue = null;

  for (let message of queue)
    emit(exports.port, message.eventName, ...message.args);
});
