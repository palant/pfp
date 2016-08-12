/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

require("./proxy");

Promise.all([
  require("storage").ready,
  require("prefs").ready
]).then(() =>
{
  let panel = require("buttonPanel");
  let passwords = require("./passwords");
  let masterPassword = require("./masterPassword");
  let {getCurrentHost} = require("./ui");

  panel.on("show", () =>
  {
    masterPassword.suspendAutoLock();

    getCurrentHost().then(currentHost =>
    {
      let [origSite, site, pwdList] = passwords.getPasswords(currentHost);
      panel.port.emit("show", {origSite, site, pwdList, masterPasswordState: masterPassword.state});
    });
  });
  panel.on("hide", () =>
  {
    masterPassword.resumeAutoLock();
  });

  require("contentPage").on("connect", function(port)
  {
    port.emit("init", passwords.getAllPasswords());
  });
});

// Hack: expose __webpack_require__ for simpler debugging
/* global __webpack_require__ */
module.exports = __webpack_require__;
