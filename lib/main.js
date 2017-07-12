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

  getCurrentHost().then(currentHost =>
  {
    return Promise.all([
      passwords.getPasswords(currentHost),
      masterPassword.state,
      sync.provider
    ]);
  }).then(([[origSite, site, pwdList], masterPasswordState, syncProvider]) =>
  {
    panelPort.emit("init", {
      origSite, site, pwdList, masterPasswordState, syncProvider
    });
  });
});
panelPort.on("disconnect", () =>
{
  masterPassword.resumeAutoLock();
});

let allPasswordsPort = messaging.getPort("allpasswords");
allPasswordsPort.on("connect", function()
{
  passwords.getAllPasswords().then(allPasswords =>
  {
    allPasswordsPort.emit("init", allPasswords);
  });
});

// Hack: expose __webpack_require__ for simpler debugging
/* global __webpack_require__ */
module.exports = __webpack_require__;
