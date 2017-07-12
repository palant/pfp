/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

/* global chrome */

module.exports = window.browser || {
  runtime: chrome.runtime,
  i18n: chrome.i18n
};
