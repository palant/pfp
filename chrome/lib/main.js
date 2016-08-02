/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

Promise.all([
  require("sdk/simple-storage").init,
  require("sdk/simple-prefs").init
]).then(() =>
{
  let panel = require("buttonPanel");
  panel.on("show", () =>
  {
    let utils = require("../../lib/ui/utils");
    let passwords = require("../../lib/passwords");
    let {state: masterPasswordState} = require("../../lib/masterPassword");

    utils.getCurrentHost().then(currentHost =>
    {
      let [origSite, site, pwdList] = passwords.getPasswords(currentHost);
      panel.port.emit("show", {origSite, site, pwdList, masterPasswordState});
    });
  });

  // Connect panel to other modules
  require("../../lib/ui/masterPasswordBindings")(panel);
  require("../../lib/ui/passwordsBindings")(panel);
  require("../../lib/ui/passwordRetrieval")(panel);
  require("../../lib/ui/allPasswordsBindings")(panel);
});
