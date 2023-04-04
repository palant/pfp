/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import "./proxy.js";
import "./importers/default.js";
import "./importers/lastPass.js";

import {getPort} from "./messaging.js";
import {suspendAutoLock, resumeAutoLock} from "./masterPassword.js";

let panelPort = getPort("panel");
panelPort.on("connect", async function()
{
  suspendAutoLock();
});
panelPort.on("disconnect", () =>
{
  resumeAutoLock();
});
