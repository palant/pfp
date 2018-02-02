/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {EventTarget} = require("../eventTarget");

// Posting messages to proper origin isn't possible on file://
let targetOrigin = location.protocol != "file:" ? location.origin : "*";

let OrigWorker = window.Worker;
window.Worker = function(url, options)
{
  function getURL(text)
  {
    return URL.createObjectURL(new Blob([text], {type: "text/javascript"}));
  }

  if (url == "../scrypt.js")
  {
    url = getURL(require("../../data/scrypt"));
  }
  else if (url == "../pbkdf2.js")
  {
    url = getURL(require("../../data/pbkdf2"));
  }

  return new OrigWorker(url, options);
};
window.Worker.prototype = OrigWorker.prototype;

module.exports = {
  storage: {
    local: {
      get: keys =>
      {
        if (typeof keys == "string")
          keys = [keys];
        if (!keys)
          keys = Object.keys(localStorage);

        let items = {};
        for (let key of keys)
          if (key in localStorage)
            items[key] = JSON.parse(localStorage[key]);
        return Promise.resolve(items);
      },
      set: items =>
      {
        return Promise.resolve().then(() =>
        {
          for (let key of Object.keys(items))
            localStorage[key] = JSON.stringify(items[key]);
        });
      },

      remove: keys =>
      {
        return Promise.resolve().then(() =>
        {
          if (typeof keys == "string")
            keys = [keys];
          for (let key of keys)
            delete localStorage[key];
        });
      },

      clear: () =>
      {
        return Promise.resolve().then(() =>
        {
          localStorage.clear();
        });
      }
    }
  },
  tabs: {
    query: params =>
    {
      return Promise.resolve([]);
    },
    create: params =>
    {
      if (params.url != "../allpasswords/allpasswords.html")
        return Promise.reject(new Error("Not implemented"));

      top.postMessage({
        type: "show-allpasswords"
      }, targetOrigin);
      return Promise.resolve();
    }
  },
  runtime: {
    getURL: path =>
    {
      return "../" + path.replace(/^data\//, "");
    },
    onConnect: new EventTarget()
  }
};

let ports = [];

window.addEventListener("message", event =>
{
  // On Chrome, file:// is used as document origin yet messages get origin null
  if (event.origin != location.origin && !(event.origin == "null" && location.origin == "file://"))
    return;

  let message = event.data;
  if (message.type == "connect")
  {
    let port = ports[message.id] = {
      name: message.name,
      postMessage: payload =>
      {
        event.source.postMessage({
          type: "message",
          id: message.id,
          target: message.name,
          payload
        }, targetOrigin);
      },
      onMessage: new EventTarget(),
      onDisconnect: new EventTarget()
    };
    module.exports.runtime.onConnect._emit(port);
  }
  else if (message.type == "disconnect")
  {
    let port = ports[message.id];
    if (port)
    {
      delete ports[message.id];
      port.onDisconnect._emit();
    }
  }
  else if (message.type == "message")
  {
    let port = ports[message.id];
    if (port)
      port.onMessage._emit(message.payload);
  }
});
