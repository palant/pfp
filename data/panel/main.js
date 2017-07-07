/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {port} = require("../platform");
port.on("show", state =>
{
  require("./state").set(state);
});

function init()
{
  window.removeEventListener("load", init);

  require("./enterMaster");
  require("./changeMaster");
  require("./passwordList");
  require("./generatePassword");
  require("./legacyPassword");
  require("./syncSetup");
  require("./syncState");
}

window.addEventListener("load", init);

// Hack: expose __webpack_require__ for simpler debugging
/* global __webpack_require__ */
module.exports = __webpack_require__;
