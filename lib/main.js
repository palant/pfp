/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

Promise.all([
  require("storage").ready,
  require("prefs").ready
]).then(() =>
{
  let panel = require("buttonPanel");
  panel.on("show", () =>
  {
    let utils = require("./ui/utils");
    let passwords = require("./passwords");
    let {state: masterPasswordState} = require("./masterPassword");

    utils.getCurrentHost().then(currentHost =>
    {
      let [origSite, site, pwdList] = passwords.getPasswords(currentHost);
      panel.port.emit("show", {origSite, site, pwdList, masterPasswordState});
    });
  });

  // Connect panel to other modules
  require("./ui/masterPasswordBindings")(panel);
  require("./ui/passwordsBindings")(panel);
  require("./ui/passwordRetrieval")(panel);
  require("./ui/allPasswordsBindings")(panel);
});
