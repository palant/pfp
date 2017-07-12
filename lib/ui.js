/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let browser = require("./browserAPI");

function getCurrentHost()
{
  return browser.tabs.query({
    lastFocusedWindow: true,
    active: true
  }).then(tabs =>
  {
    if (!tabs.length)
      return Promise.reject();

    return new URL(tabs[0].url);
  }).then(url =>
  {
    if (url.protocol != "http:" && url.protocol != "https:")
      return Promise.reject();

    return url.hostname || "";
  }).catch(() =>
  {
    return "";
  });
}
exports.getCurrentHost = getCurrentHost;

function showAllPasswords()
{
  let url = browser.runtime.getURL("data/allpasswords/allpasswords.html");

  // Only look for existing tab in the active window, don't activate
  // background windows to avoid unexpected effects.
  return browser.tabs.query({
    url,
    lastFocusedWindow: true
  }).catch(error =>
  {
    // Querying will fail for extension URLs before Firefox 56, see
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1271354
    return [];
  }).then(tabs =>
  {
    if (tabs.length)
      return browser.tabs.update(tabs[0].id, {active: true});
    else
    {
      return browser.tabs.create({
        url,
        active: true
      });
    }
  });
}
exports.showAllPasswords = showAllPasswords;
