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

function getLink({type, param})
{
  if (type == "relnotes")
    return `https://pfp.works/release-notes/${param}`;
  else if (type == "documentation")
    return `https://pfp.works/documentation/${param}/`;

  throw new Error("Unexpected link type");
}
exports.getLink = getLink;

function openLink(options)
{
  return browser.tabs.create({
    url: getLink(options),
    active: true
  }).then(tab =>
  {
  });
}
exports.openLink = openLink;

function openAndWait(url, expectedUrl)
{
  return browser.tabs.create({url, active: true}).then(tab =>
  {
    let id = tab.id;
    return new Promise((resolve, reject) =>
    {
      let updateCallback = (tabId, changeInfo, tab) =>
      {
        if (tabId == id && tab.url.startsWith(expectedUrl))
        {
          resolve(tab.url);
          browser.tabs.remove(id);
          browser.tabs.onUpdated.removeListener(updateCallback);
          browser.tabs.onRemoved.removeListener(removeCallback);
        }
      };
      let removeCallback = (tabId, removeInfo) =>
      {
        if (tabId == id)
        {
          reject("tab-closed");
          browser.tabs.onUpdated.removeListener(updateCallback);
          browser.tabs.onRemoved.removeListener(removeCallback);
        }
      };
      browser.tabs.onUpdated.addListener(updateCallback);
      browser.tabs.onRemoved.addListener(removeCallback);
    });
  });
}
exports.openAndWait = openAndWait;
