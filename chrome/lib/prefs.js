/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

/* global chrome, window */

let {EventTarget, emit} = require("../../lib/eventTarget");

exports = module.exports = EventTarget();

exports.values = {};

exports.ready = window.fetch(chrome.runtime.getURL("prefs.json"))
  .then(response => response.json())
  .then(values =>
  {
    for (let key in values)
    {
      Object.defineProperty(exports.values, key, {
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

    return new Promise((resolve, reject) =>
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
  });

// For the options page
window.getPrefs = () => exports.values;
