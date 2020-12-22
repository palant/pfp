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
import {getPasswords} from "./passwords.js";
import {getState, suspendAutoLock, resumeAutoLock} from "./masterPassword.js";
import sync, {getSyncData, isSyncing} from "./sync.js";
import {getCurrentHost} from "./ui.js";

function getSyncState()
{
  let data = getSyncData();
  return {
    provider: data.provider || null,
    username: data.username || null,
    lastSync: data.lastSync || null,
    error: data.error || null,
    isSyncing: isSyncing()
  };
}

let panelPort = getPort("panel");
panelPort.on("connect", async function()
{
  suspendAutoLock();

  let [currentHost, masterPasswordState] = await Promise.all([
    getCurrentHost(),
    getState()
  ]);

  if (masterPasswordState != "known")
  {
    panelPort.emit("init", {masterPasswordState, origSite: currentHost, sync: getSyncState()});
    return;
  }

  let [origSite, site, pwdList] = await getPasswords(currentHost);
  panelPort.emit("init", {
    masterPasswordState, origSite, site, pwdList, sync: getSyncState()
  });
});
panelPort.on("disconnect", () =>
{
  resumeAutoLock();
});

sync.on("dataModified", () =>
{
  let state = getSyncState();
  panelPort.emit("init", {sync: state});
  if (browser.browserAction && browser.browserAction.setBadgeText)
  {
    browser.browserAction.setBadgeText({text: state.error && state.error != "sync_connection_error" ? "!" : ""});
    browser.browserAction.setBadgeBackgroundColor({color: [255, 0, 0, 255]});
  }
});
