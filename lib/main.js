/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

require("./proxy");

let messaging = require("./messaging");
let passwords = require("./passwords");
let masterPassword = require("./masterPassword");
let sync = require("./sync");
let {getCurrentHost} = require("./ui");

function getSyncState()
{
  let data = sync.syncData || {};
  return {
    provider: data.provider || null,
    lastSync: data.lastSync || null,
    isSyncing: sync.isSyncing
  };
}

let panelPort = messaging.getPort("panel");
panelPort.on("connect", () =>
{
  masterPassword.suspendAutoLock();

  Promise.all([
    getCurrentHost(),
    masterPassword.state
  ]).then(([currentHost, masterPasswordState]) =>
  {
    if (masterPasswordState != "known")
      return panelPort.emit("init", {masterPasswordState, origSite: currentHost, sync: getSyncState()});

    return passwords.getPasswords(currentHost).then(([origSite, site, pwdList]) =>
    {
      panelPort.emit("init", {
        masterPasswordState, origSite, site, pwdList, sync: getSyncState()
      });
    });
  });
});
panelPort.on("disconnect", () =>
{
  masterPassword.resumeAutoLock();
});

sync.addModificationListener(() =>
{
  panelPort.emit("init", {sync: getSyncState()});
});


let allPasswordsPort = messaging.getPort("allpasswords");
allPasswordsPort.on("forward-to-panel", ({name, args}) =>
{
  panelPort.emit(name, ...args);
});

// Hack: expose __webpack_require__ for simpler debugging
/* global __webpack_require__ */
module.exports = __webpack_require__;
