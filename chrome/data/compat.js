/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

/* global chrome */

let unsafeWindow = window;

function cloneInto(obj, wnd)
{
  return obj;
}

function exportFunction(func, wnd)
{
  return func;
}

let self =
{
  port: (function()
  {
    let port = chrome.runtime.connect({name: document.documentElement.dataset.porttype});
    let listeners = {};

    port.onMessage.addListener(message => {
      for (let listener of listeners[message.eventName] || [])
        listener(...message.args);
    });

    return {
      on: function(eventName, listener)
      {
        if (!(eventName in listeners))
          listeners[eventName] = [];
        listeners[eventName].push(listener);
      },

      off: function(eventName, listener)
      {
        let index = (eventName in listeners ? listeners[eventName].indexOf(listener) : -1);
        if (index >= 0)
          listeners[eventName].splice(index, 1);
      },

      once: function(eventName, listener)
      {
        let wrapper = (...args) =>
        {
          this.off(eventName, wrapper);
          listener(...args);
        };
        this.on(eventName, wrapper);
      },

      emit: function(eventName, ...args)
      {
        port.postMessage({eventName, args});
      }
    };
  })()
};

self.port.on("_hide", () => window.close());
