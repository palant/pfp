/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let browser = require("./browserAPI");
let {EventTarget, emit} = require("../../lib/eventTarget");

exports = module.exports = EventTarget();

function get(name)
{
  let key = "pref:" + name;
  return browser.storage.local.get(key).then(items => items[key]);
}
exports.get = get;

function set(name, value)
{
  let key = "pref:" + name;
  return browser.storage.local.set({[key]: value}).then(() => emit(exports, name, name, value));
}
exports.set = set;

// Old data migration
let oldPrefs = ["autolock", "autolock_delay"];
browser.storage.local.get(oldPrefs).then(items =>
{
  if (Object.keys(items).length == 0)
    return;

  for (let name of oldPrefs)
    if (name in items)
      set(name, items[name]);
  browser.storage.local.remove(oldPrefs);
});
