/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import {port} from "./messaging.js";

let rememberedKeys = null;

port.on("getKeys", () =>
{
  port.emit("keys", rememberedKeys);
});

port.on("setKeys", keys =>
{
  rememberedKeys = keys;
});