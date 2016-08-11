/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let showMessage = null;

function show(message)
{
  // Store the message in case it arrives earlier than the panel is initialized
  showMessage = message;
}

self.port.on("show", show);

function init()
{
  window.removeEventListener("load", init);

  require("./enterMaster.js");
  require("./changeMaster.js");
  require("./passwordList.js");
  require("./generatePassword.js");
  require("./legacyPassword.js");

  if (showMessage)
    require("./utils").show(showMessage);
}

window.addEventListener("load", init);

// Hack: expose __webpack_require__ for simpler debugging
/* global __webpack_require__ */
module.exports = __webpack_require__;
