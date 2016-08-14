/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {EventTarget, emit} = require("../lib/eventTarget");

module.exports = exports = EventTarget();
exports.values = {};
exports.ready = Promise.resolve();

exports._setValue = function(name, value)
{
  exports.values[name] = value;
  emit(exports, name);
};
