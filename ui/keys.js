/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import browser from "./browserAPI.js";
import {port} from "../lib/messaging.js";
import {getPref} from "./prefs.js";

export function getKeys()
{
  return new Promise(resolve =>
  {
    let callback = keys =>
    {
      port.off("keys", callback);
      resolve(keys);
      if (keys)
        resetAutolock();
    };

    port.on("keys", callback);
    port.emit("getKeys");
  });
}

export function rememberKeys(keys)
{
  port.emit("setKeys", keys);
  resetAutolock();
}

export function forgetKeys()
{
  port.emit("setKeys", null);
  browser.alarms.clear("autolock");
}

export async function resetAutolock()
{
  let [enabled, delay] = await Promise.all([
    getPref("autolock"),
    getPref("autolock_delay")
  ]);

  if (enabled)
  {
    browser.alarms.create("autolock", {
      delayInMinutes: delay
    });
  }
  else
    browser.alarms.clear("autolock");
}
