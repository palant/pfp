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

let panelPort = messaging.getPort("panel");
panelPort.on("connect", () =>
{
  masterPassword.suspendAutoLock();

  let {syncData} = sync;
  Promise.all([
    getCurrentHost(),
    masterPassword.state,
    syncData ? syncData.provider : null
  ]).then(([currentHost, masterPasswordState, syncProvider]) =>
  {
    if (masterPasswordState != "known")
      return panelPort.emit("init", {masterPasswordState, origSite: currentHost, syncProvider});

    return passwords.getPasswords(currentHost).then(([origSite, site, pwdList]) =>
    {
      panelPort.emit("init", {
        masterPasswordState, origSite, site, pwdList, syncProvider
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
  let {syncData} = sync;
  panelPort.emit("init", {syncProvider: syncData ? syncData.provider : null});
});


let allPasswordsPort = messaging.getPort("allpasswords");
allPasswordsPort.on("forward-to-panel", ({name, args}) =>
{
  panelPort.emit(name, ...args);
});

// Hack: expose __webpack_require__ for simpler debugging
/* global __webpack_require__ */
module.exports = __webpack_require__;
