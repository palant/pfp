/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

exports.set = function(data, type)
{
  // Solution by courtesy of https://stackoverflow.com/a/12693636/785541
  let listener = event =>
  {
    event.clipboardData.setData("text/plain", data);
    event.preventDefault();
  };
  document.addEventListener("copy", listener);
  document.execCommand("copy", false, null);
  document.removeEventListener("copy", listener);
};
