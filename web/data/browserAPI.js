/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let locale = require("locale");
let {EventTarget} = require("../eventTarget");

document.documentElement.classList.add("webclient");

let ports = [];

// Posting messages to proper origin isn't possible on file://
let targetOrigin = location.protocol != "file:" ? location.origin : "*";

let expectedPortIds = [];

function getPortId()
{
  return new Promise((resolve, reject) =>
  {
    expectedPortIds.push(resolve);
    top.postMessage({
      type: "get-port-id"
    }, targetOrigin);
  });
}

module.exports = {
  runtime: {
    connect: function(params)
    {
      let id = null;
      let queue = [];

      let port = {
        postMessage: payload =>
        {
          if (id === null)
          {
            queue.push(payload);
            return;
          }

          top.postMessage({
            type: "message",
            payload,
            id,
            target: "background"
          }, targetOrigin);
        },

        disconnect: message =>
        {
          delete ports[id];
          top.postMessage({
            type: "disconnect",
            id,
            target: "background"
          }, targetOrigin);
        },

        onMessage: new EventTarget()
      };

      getPortId().then(response =>
      {
        id = response;
        ports[id] = port;
        top.postMessage({
          type: "connect",
          name: params.name,
          id,
          target: "background"
        }, targetOrigin);

        for (let payload of queue)
          port.postMessage(payload);
        queue = null;
      });

      return port;
    },

    getBackgroundPage: function()
    {
      return Promise.reject(new Error("Not implemented"));
    }
  },
  i18n: {
    getMessage: function(id)
    {
      return locale[id];
    }
  }
};

window.addEventListener("message", event =>
{
  // On Chrome, file:// is used as document origin yet messages get origin null
  if (event.origin != location.origin && !(event.origin == "null" && location.origin == "file://"))
    return;

  let message = event.data;
  if (message.type == "port-id")
  {
    if (expectedPortIds.length)
      expectedPortIds.shift()(message.id);
  }
  else if (message.type == "message")
  {
    let port = ports[message.id];
    if (port)
      port.onMessage._emit(message.payload);
  }
});

window.addEventListener("show-panel", event =>
{
  top.postMessage({
    type: "show-panel"
  }, targetOrigin);
});
