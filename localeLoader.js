/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

module.exports = function(source)
{
  let data = require("properties-parser").parse(source);
  let converted = {};
  for (let key in data)
    converted[key.replace(/-/g, "_")] = data[key];
  return "module.exports = " + JSON.stringify(converted) + ";";
};
