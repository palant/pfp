/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let sp = require("sdk/simple-prefs");

function get(name)
{
  return Promise.resolve(sp.prefs[name]);
}
exports.get = get;

function set(name, value)
{
  return Promise.resolve().then(() =>
  {
    sp.prefs[name] = value;
  });
}
exports.set = set;

function on(name, listener)
{
  sp.on(name, () =>
  {
    listener(name, sp.prefs[name]);
  });
}
exports.on = on;
