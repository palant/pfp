/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import "./proxy.js";
import "./importers/default.js";
import "./importers/lastPass.js";

import browser from "./browserAPI.js";
import {getPort} from "./messaging.js";
import sync, {getSyncData} from "./sync.js";

sync.on("dataModified", () =>
{
  getPort("panel").emit("syncUpdate");
  if (browser.browserAction && browser.browserAction.setBadgeText)
  {
    let {error} = getSyncData();
    browser.browserAction.setBadgeText({text: error && error != "sync_connection_error" ? "!" : ""});
    browser.browserAction.setBadgeBackgroundColor({color: [255, 0, 0, 255]});
  }
});
