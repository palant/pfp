/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import {EventTarget} from "./eventTarget";

let currentURL = null;

let browser = {
  storage: {
    local: {
      get: async function(keys)
      {
        if (typeof keys == "string")
          keys = [keys];
        if (!keys)
          keys = Object.keys(localStorage);

        let items = {};
        for (let key of keys)
        {
          if (key in localStorage)
          {
            try
            {
              items[key] = JSON.parse(localStorage[key]);
            }
            catch (e)
            {
              // Ignore non-JSON values
            }
          }
        }
        return items;
      },

      set: async function(items)
      {
        for (let key of Object.keys(items))
          localStorage[key] = JSON.stringify(items[key]);
      },

      remove: async function(keys)
      {
        if (typeof keys == "string")
          keys = [keys];
        for (let key of keys)
          delete localStorage[key];
      },

      clear: async function()
      {
        localStorage.clear();
      }
    }
  },
  tabs: {
    query: async function(params)
    {
      if (params.active && currentURL)
        return [{url: currentURL}];
      else
        return [];
    },
    create: async function(params)
    {
      if (params.url != "ui/allpasswords/allpasswords.html")
        throw new Error("Not implemented");

      window.dispatchEvent(new Event("show-allpasswords"));
    }
  },
  runtime: {
    getURL: path =>
    {
      return path;
    },
    onConnect: new EventTarget()
  }
};

let port = {
  postMessage(payload)
  {
    window.dispatchEvent(new CustomEvent("fromBackground", {
      detail: payload
    }));
  },
  onMessage: new EventTarget(),
  onDisconnect: new EventTarget()
};

window.addEventListener("toBackground", event =>
{
  port.onMessage._emit(event.detail);
});

window.addEventListener("port-connected", event =>
{
  port.name = event.detail;
  browser.runtime.onConnect._emit(port);
});

window.addEventListener("show-panel", event =>
{
  currentURL = "https://" + event.detail;
});

export default browser;
