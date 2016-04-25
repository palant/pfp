/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

exports.prefs = window.simpleStorage;

exports.on = function(key, handler)
{
  window.addEventListener("storage", function(event)
  {
    if (event.key == key)
      handler();
  });
};
