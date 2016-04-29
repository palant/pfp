/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {data} = require("sdk/self");
let {ToggleButton} = require("sdk/ui/button/toggle");
let {Panel} = require("sdk/panel");

let button;
require("./bug1258706_hotfix").fixButton(() =>
{
  button = ToggleButton({
    id: "easypasswords-button",
    label: "Easy Passwords",
    icon: {
      "16": data.url("images/icon16.png"),
      "32": data.url("images/icon32.png"),
      "64": data.url("images/icon64.png")
    }
  });
});

let panel = Panel({
  contentURL: data.url("panel/panel.html"),
  contentScriptFile: [
    data.url("panel/panel.js"),
    data.url("panel/changeMaster.js"),
    data.url("panel/enterMaster.js"),
    data.url("panel/passwordList.js"),
    data.url("panel/generatePassword.js"),
    data.url("panel/legacyPassword.js"),
    data.url("panel/confirm.js")
  ],
  position: button
});
require("./bug918600_hotfix").fixPanel(panel);

button.on("change", (state) => state.checked && panel.show());

panel.on("show", () =>
{
  let {getCurrentHost} = require("./ui/utils");
  let {getPasswords} = require("./passwords");
  let {state: masterPasswordState} = require("./masterPassword");

  let [origSite, site, passwords] = getPasswords(getCurrentHost());
  panel.port.emit("show", {origSite, site, passwords, masterPasswordState});
});

panel.on("hide", () =>
{
  button.state("window", {checked: false});
  panel.port.emit("hide");
});

panel.port.on("resize", ([width, height]) => panel.resize(width, height));

// Connect panel to other modules
require("./ui/masterPasswordBindings")(panel);
require("./ui/passwordsBindings")(panel);
require("./ui/passwordRetrieval")(panel);
require("./ui/allPasswordsBindings")(panel);
