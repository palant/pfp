/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import {EventTarget} from "./eventTarget";
import scryptWorker from "../worker/scrypt.js";
import pbkdf2Worker from "../worker/pbkdf2.js";

function textToURL(text)
{
  return URL.createObjectURL(new Blob([text], {type: "text/javascript"}));
}

let currentURL = null;

let browser = {
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
      if (params.active && currentURL)
        return Promise.resolve([{url: currentURL}]);
      else
        return Promise.resolve([]);
    },
    create: params =>
    {
      if (params.url != "ui/allpasswords/allpasswords.html")
        return Promise.reject(new Error("Not implemented"));

      window.dispatchEvent(new Event("show-allpasswords"));
      return Promise.resolve();
    }
  },
  runtime: {
    getURL: path =>
    {
      if (path == "worker/scrypt.js")
        return textToURL(scryptWorker);
      else if (path == "worker/pbkdf2.js")
        return textToURL(pbkdf2Worker);
      else
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
