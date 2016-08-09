/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {Cu} = require("chrome");
Cu.importGlobalProperties(["crypto", "TextEncoder", "TextDecoder", "atob", "btoa", "URL"]);

let global = Cu.getGlobalForObject(this);
let timers = require("sdk/timers");
global.setTimeout = timers.setTimeout;
global.clearTimeout = timers.clearTimeout;
