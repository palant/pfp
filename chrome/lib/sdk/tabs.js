/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

/* global chrome */

// Chrome's tab API is async, so we have to keep track of current tab and its
// URL, so that our code can access these values synchronously.
let currentTab = -1;
let currentURL = null;

chrome.tabs.query({
  lastFocusedWindow: true,
  active: true
}, tabs =>
{
  if (tabs.length)
  {
    currentTab = tabs[0].id;
    currentURL = tabs[0].url;
  }
});

chrome.tabs.onActivated.addListener(({tabId, windowId}) =>
{
  currentTab = tabId;
  chrome.tabs.get(tabId, tab =>
  {
    if (tab.id == currentTab)
      currentURL = tab.url;
  });
});

chrome.tabs.onUpdated.addListener((tabId, {url}, tab) =>
{
  if (tabId == currentTab && url)
    currentURL = url;
});

// Now the actual tabs.activeTab implementation

function getActiveTab()
{
  return {
    url: currentURL
  };
}

Object.defineProperty(exports, "activeTab", {
  enumerable: true,
  get: getActiveTab
});
