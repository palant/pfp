/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

/* global chrome */

let {EventTarget, emit} = require("../../../lib/eventTarget");

function runScript({contentScriptFile, contentScriptOptions})
{
  let worker = EventTarget();
  worker.port = EventTarget();

  let listener = message =>
  {
    if (message.type == "contentScript")
      emit(worker.port, message.eventName, ...message.args);
  };
  chrome.runtime.onMessage.addListener(listener);

  worker.destroy = function()
  {
    chrome.runtime.onMessage.removeListener(listener);
  };

  chrome.tabs.query({
    lastFocusedWindow: true,
    active: true
  }, tabs =>
  {
    if (tabs.length)
    {
      let tabId = tabs[0].id;

      chrome.tabs.executeScript({file: "data/contentScript-compat.js"}, () =>
      {
        if (chrome.runtime.lastError)
        {
          emit(worker, "error", chrome.runtime.lastError);
          return;
        }

        chrome.tabs.sendMessage(tabId, contentScriptOptions);

        contentScriptFile = contentScriptFile.replace(chrome.runtime.getURL(""), "");
        chrome.tabs.executeScript(tabId, {file: contentScriptFile}, () =>
        {
          if (chrome.runtime.lastError)
            emit(worker, "error", chrome.runtime.lastError);
        });
      });
    }
    else
      emit(worker, "error", new Error("No current tab?"));
  });

  return worker;
}

exports.activeTab = {
  attach: runScript
};
