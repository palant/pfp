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
  let {Panel} = require("sdk/panel");

  let panel = Panel();
  panel.on("show", () => {
    let {getCurrentHost} = require("../../lib/ui/utils");
    let {getPasswords} = require("../../lib/passwords");
    let {state: masterPasswordState} = require("../../lib/masterPassword");

    let [origSite, site, passwords] = getPasswords(getCurrentHost());
    panel.port.emit("show", {origSite, site, passwords, masterPasswordState});
  });

  // Connect panel to other modules
  require("../../lib/ui/masterPasswordBindings")(panel);
  require("../../lib/ui/passwordsBindings")(panel);
  require("../../lib/ui/passwordRetrieval")(panel);
  require("../../lib/ui/allPasswordsBindings")(panel); 
});
