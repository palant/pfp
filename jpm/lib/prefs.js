/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let sp = require("sdk/simple-prefs");

exports.on = (name, listener) =>
{
  sp.on(name, listener);
};
exports.values = sp.prefs;
exports.ready = Promise.resolve();
