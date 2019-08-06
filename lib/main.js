/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import "./proxy";
import "./importers/default";
import "./importers/lastPass";

import browser from "./browserAPI";
import {getPort} from "./messaging";
import {getPasswords} from "./passwords";
import {getState, suspendAutoLock, resumeAutoLock} from "./masterPassword";
import sync, {getSyncData, isSyncing} from "./sync";
import {getCurrentHost} from "./ui";

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
panelPort.on("connect", () =>
{
  suspendAutoLock();

  Promise.all([
    getCurrentHost(),
    getState()
  ]).then(([currentHost, masterPasswordState]) =>
  {
    if (masterPasswordState != "known")
      return panelPort.emit("init", {masterPasswordState, origSite: currentHost, sync: getSyncState()});

    return getPasswords(currentHost).then(([origSite, site, pwdList]) =>
    {
      panelPort.emit("init", {
        masterPasswordState, origSite, site, pwdList, sync: getSyncState()
      });
    });
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
