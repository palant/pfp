/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

/* global document */

let clipboardDummy = null;

exports.set = function(data)
{
  if (!clipboardDummy)
  {
    clipboardDummy = document.createElement("textarea");
    clipboardDummy.style.position = "absolute";
    clipboardDummy.style.width = "0px";
    clipboardDummy.style.height = "0px";
    clipboardDummy.style.left = "-1000px";
    document.body.appendChild(clipboardDummy);
  }

  clipboardDummy.value = data;
  clipboardDummy.select();
  document.execCommand("copy", false, null);
};
