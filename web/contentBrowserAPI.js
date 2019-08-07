/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import locale from "locale";
import {EventTarget} from "./eventTarget";

let port = {
  postMessage(payload)
  {
    window.dispatchEvent(new CustomEvent("toBackground", {
      detail: payload
    }));
  },
  disconnect()
  {
  },
  onMessage: new EventTarget()
};

export const runtime = {
  connect(params)
  {
    return port;
  },
  getBackgroundPage: function()
  {
    return Promise.reject(new Error("Not implemented"));
  }
};

export const i18n = {
  getMessage: function(id)
  {
    return locale[id];
  }
};

window.addEventListener("fromBackground", event =>
{
  port.onMessage._emit(event.detail);
});
