"use strict";

let {data} = require("sdk/self");
let {ToggleButton} = require("sdk/ui/button/toggle");
let {Panel} = require("sdk/panel");

let button = ToggleButton({
  id: "easypasswords-button",
  label: "Easy Passwords",
  icon: {
    "16": data.url("images/icon16.png"),
    "32": data.url("images/icon32.png"),
    "64": data.url("images/icon64.png")
  },
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

panel.on("show", () => {
  let {getCurrentHost} = require("./ui/utils");
  let {getPasswords} = require("./passwords");
  let {state: masterPasswordState} = require("./masterPassword");

  let [site, passwords] = getPasswords(getCurrentHost());
  panel.port.emit("show", {site, passwords, masterPasswordState});
});

panel.on("hide", () => {
  button.state("window", {checked: false});
  panel.port.emit("hide");
});

panel.port.on("resize", ([width, height]) => panel.resize(width, height));

// Connect panel to other modules
require("./ui/masterPasswordBindings")(panel);
require("./ui/passwordsBindings")(panel);
require("./ui/passwordRetrieval")(panel);
