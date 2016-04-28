/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

/* global chrome */

let {EventTarget} = require("sdk/event/target");
let {emit} = require("sdk/event/core");

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
    url: currentURL,
    attach: runScript.bind(null, currentTab)
  };
}

function runScript(tabId, {contentScriptFile, contentScriptOptions})
{
  let worker = EventTarget();
  worker.port = EventTarget();

  let listener = message => {
    if (message.type == "contentScript")
      emit(worker.port(message.eventName, ...message.args));
  };
  chrome.runtime.onMessage.addListener(listener);

  worker.destroy = function()
  {
    chrome.runtime.onMessage.removeListener(listener);
  };

  chrome.tabs.executeScript(tabId, {file: "data/contentScript-compat.js"}, function()
  {
    if (chrome.runtime.lastError)
    {
      emit(worker, "error", chrome.runtime.lastError);
      return;
    }

    chrome.tabs.sendMessage(tabId, contentScriptOptions);

    contentScriptFile = contentScriptFile.replace(chrome.runtime.getURL(""), "");
    chrome.tabs.executeScript(tabId, {file: contentScriptFile}, function()
    {
      if (chrome.runtime.lastError)
        emit(worker, "error", chrome.runtime.lastError);
    });
  });

  return worker;
}

Object.defineProperty(exports, "activeTab", {
  enumerable: true,
  get: getActiveTab
});
