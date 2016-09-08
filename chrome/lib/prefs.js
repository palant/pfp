/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

/* global chrome */

let {EventTarget, emit} = require("../../lib/eventTarget");

exports = module.exports = EventTarget();

function promisify(handler)
{
  return new Promise((resolve, reject) =>
  {
    handler(result =>
    {
      if (chrome.runtime.lastError)
        reject(chrome.runtime.lastError);
      else
        resolve(result);
    });
  });
}

function get(name)
{
  let key = "pref:" + name;
  return promisify(callback =>
  {
    chrome.storage.local.get(key, callback);
  }).then(items => items[key]);
}
exports.get = get;

function set(name, value)
{
  let key = "pref:" + name;
  return promisify(callback =>
  {
    chrome.storage.local.set({[key]: value}, callback);
  }).then(() => emit(exports, name, value));
}
exports.set = set;

// Old data migration
let oldPrefs = ["autolock", "autolock_delay"];
chrome.storage.local.get(oldPrefs, items =>
{
  if (chrome.runtime.lastError || Object.keys(items).length == 0)
    return;

  for (let name of oldPrefs)
    if (name in items)
      set(name, items[name]);
  chrome.storage.local.remove(oldPrefs);
});
