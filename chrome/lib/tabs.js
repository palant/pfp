/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let browser = require("./browserAPI");
let {EventTarget, emit} = require("../../lib/eventTarget");

exports.currentTabURL = function()
{
  return browser.tabs.query({
    lastFocusedWindow: true,
    active: true
  }).then(tabs =>
  {
    if (tabs.length)
      return tabs[0].url;
    else
      return null;
  });
};

exports.open = function(url)
{
  // Only look for existing tab in the active window, don't activate
  // background windows to avoid unexpected effects.
  return browser.tabs.query({
    url,
    lastFocusedWindow: true
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
};

exports.openAndWait = function(url, expectedUrl)
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
};

exports.executeScript = function(contentScript, options)
{
  function executeScript(tabId, path)
  {
    return browser.tabs.executeScript(tabId, {file: path}).then(() => tabId);
  }

  return browser.tabs.query({
    lastFocusedWindow: true,
    active: true
  }).then(tabs =>
  {
    if (tabs.length)
      return tabs[0].id;
    else
      throw new Error("No current tab?");
  }).then(tabId =>
  {
    return executeScript(tabId, "data/contentScript-compat.js");
  }).then(tabId =>
  {
    return browser.tabs.sendMessage(tabId, options).then(() => tabId);
  }).then(tabId =>
  {
    return executeScript(tabId, "data/" + contentScript);
  }).then(tabId =>
  {
    let port = EventTarget();

    let listener = message =>
    {
      if (message.type == "contentScript")
        emit(port, message.eventName, ...message.args);
    };
    browser.runtime.onMessage.addListener(listener);

    port.disconnect = function()
    {
      browser.runtime.onMessage.removeListener(listener);
    };

    return port;
  });
};
