/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {ToggleButton} = require("sdk/ui/button/toggle");
let {Panel} = require("sdk/panel");

let button;
require("./bug1258706_hotfix").fixButton(() =>
{
  button = ToggleButton({
    id: "easypasswords-button",
    label: "Easy Passwords",
    icon: {
      "16": external.getURL("images/icon16.png"),
      "32": external.getURL("images/icon32.png"),
      "64": external.getURL("images/icon64.png")
    }
  });
});

let panel = Panel({
  contentURL: external.getURL("panel/panel.html"),
  contentScriptFile: [
    external.getURL("panel/zxcvbn-4.3.0.js"),
    external.getURL("panel/panel.js"),
    external.getURL("panel/changeMaster.js"),
    external.getURL("panel/enterMaster.js"),
    external.getURL("panel/passwordList.js"),
    external.getURL("panel/generatePassword.js"),
    external.getURL("panel/legacyPassword.js"),
    external.getURL("panel/confirm.js")
  ],
  position: button
});
require("./bug918600_hotfix").fixPanel(panel);

button.on("change", (state) => state.checked && panel.show());

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

panel.on("hide", () =>
{
  button.state("window", {checked: false});
  panel.port.emit("hide");
});

panel.port.on("resize", ([width, height]) =>
{
  // See https://bugzilla.mozilla.org/show_bug.cgi?id=1270095 - on OS X we
  // need to request 2 extra pixels.
  if (require("sdk/system").platform == "darwin")
  {
    width += 2;
    height += 2;
  }

  panel.resize(width, height);
});

// Connect panel to other modules
require("./ui/masterPasswordBindings")(panel);
require("./ui/passwordsBindings")(panel);
require("./ui/passwordRetrieval")(panel);
require("./ui/allPasswordsBindings")(panel);
