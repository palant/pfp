/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

export function set(data)
{
  let dummy = document.createElement("textarea");
  dummy.style.position = "absolute";
  dummy.style.width = "0px";
  dummy.style.height = "0px";
  dummy.style.left = "-1000px";
  document.body.appendChild(dummy);

  dummy.value = data;
  dummy.select();
  document.execCommand("copy", false, null);
  document.body.removeChild(dummy);
}
