/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {port} = require("../messaging");
port.on("init", state =>
{
  require("./state").set(state);
});

function init()
{
  window.removeEventListener("load", init);

  let {ui} = require("../proxy");
  let {setCommandHandler} = require("./events");
  let {showUnknownError} = require("./utils");

  let isWebClient = document.documentElement.classList.contains("webclient");
  let links = document.querySelectorAll("a[data-type]");
  for (let i = 0; i < links.length; i++)
  {
    let link = links[i];
    link.target = "_blank";

    let options = {
      type: link.getAttribute("data-type"),
      param: link.getAttribute("data-param")
    };
    if (isWebClient)
      ui.getLink(options).then(url => link.href = url).catch(showUnknownError);
    else
      setCommandHandler(link, () => ui.openLink(options).catch(showUnknownError));
  }


  require("./enterMaster");
  require("./changeMaster");
  require("./migration");
  require("./passwordList");
  require("./generatePassword");
  require("./storedPassword");
  require("./syncSetup");
  require("./syncState");
}

window.addEventListener("load", init);

// Hack: expose __webpack_require__ for simpler debugging
/* global __webpack_require__ */
module.exports = __webpack_require__;
