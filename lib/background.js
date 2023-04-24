/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import {port} from "./messaging.js";

const {alarms, storage} = (typeof browser != "undefined" ? browser : chrome);

let rememberedKeys = null;

async function getKeys()
{
  if (storage.local)
  {
    let {rememberedKeys} = await storage.local.get("rememberedKeys");
    port.emit("keys", rememberedKeys);
  }
  else
    port.emit("keys", rememberedKeys);
}

port.on("getKeys", getKeys);

async function setKeys(keys)
{
  if (storage.local)
    await storage.local.set({rememberedKeys: keys});
  else
    rememberedKeys = keys;
}

port.on("setKeys", setKeys);

alarms.onAlarm.addListener(alarm =>
{
  if (alarm.name == "autolock")
    setKeys(null);
});
