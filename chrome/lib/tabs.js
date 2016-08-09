/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

/* global chrome */

let {EventTarget, emit} = require("../../lib/eventTarget");

exports.currentTabURL = function()
{
  return new Promise((resolve, reject) =>
  {
    chrome.tabs.query({
      lastFocusedWindow: true,
      active: true
    }, tabs =>
    {
      if (tabs.length)
        resolve(tabs[0].url);
      else
        resolve(null);
    });
  });
};

exports.open = function(url)
{
  // Only look for existing tab in the active window, don't activate
  // background windows to avoid unexpected effects.
  chrome.tabs.query({
    url,
    lastFocusedWindow: true
  }, function(tabs)
  {
    if (tabs.length)
      chrome.tabs.update(tabs[0].id, {active: true});
    else
    {
      chrome.tabs.create({
        url,
        active: true
      });
    }
  });
};

exports.executeScript = function(contentScript, options)
{
  function executeScript(tabId, path)
  {
    return new Promise((resolve, reject) =>
    {
      chrome.tabs.executeScript(tabId, {file: path}, () =>
      {
        if (chrome.runtime.lastError)
          reject(chrome.runtime.lastError);
        else
          resolve(tabId);
      });
    });
  }

  return new Promise((resolve, reject) =>
  {
    chrome.tabs.query({
      lastFocusedWindow: true,
      active: true
    }, tabs =>
    {
      if (tabs.length)
        resolve(tabs[0].id);
      else
        reject(new Error("No current tab?"));
    });
  }).then(tabId =>
  {
    return executeScript(tabId, "data/contentScript-compat.js");
  }).then(tabId =>
  {
    chrome.tabs.sendMessage(tabId, options);

    return executeScript(tabId, "data/" + contentScript);
  }).then(tabId =>
  {
    let port = EventTarget();

    let listener = message =>
    {
      if (message.type == "contentScript")
        emit(port, message.eventName, ...message.args);
    };
    chrome.runtime.onMessage.addListener(listener);

    port.disconnect = function()
    {
      chrome.runtime.onMessage.removeListener(listener);
    };

    return port;
  });
};
