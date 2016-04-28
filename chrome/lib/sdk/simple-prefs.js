/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

/* global chrome */

let {EventTarget} = require("sdk/event/target");
let {emit} = require("sdk/event/core");

let values = {
  autolock: true,
  autolock_delay: 10
};

exports = module.exports = EventTarget();

exports.prefs = {};
for (let key in values)
{
  Object.defineProperty(exports.prefs, key, {
    enumerable: true,
    get: () => values[key],
    set: value =>
    {
      if (value == values[key])
        return;

      values[key] = value;
      chrome.storage.local.set(values);
      emit(exports, key);
    }
  });
}

exports.init = new Promise((resolve, reject) =>
{
  chrome.storage.local.get(Object.keys(values), function(items)
  {
    if (chrome.runtime.lastError)
      reject(chrome.runtime.lastError);
    else
    {
      for (let key in items)
        values[key] = items[key];
      resolve();
    }
  });
});

// For the options page
window.getPrefs = () => exports.prefs;
