/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {EventTarget, emit} = require("../lib/eventTarget");

module.exports = exports = EventTarget();

let data = {};
exports.data = data;

exports.get = function(name, defaultValue)
{
  return Promise.resolve(name in data ? data[name] : defaultValue);
};

exports.set = function(name, value)
{
  return Promise.resolve().then(() =>
  {
    data[name] = value;
  }).then(() => emit(exports, name, value));
};
