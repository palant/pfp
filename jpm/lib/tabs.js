/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

exports.currentTabURL = function()
{
  let tab = require("sdk/tabs").activeTab;
  return Promise.resolve(tab ? tab.url : null);
};

exports.open = function(url)
{
  // Only look for existing tab in the active window, don't activate
  // background windows to avoid unexpected effects.
  let wnd = require("sdk/windows").browserWindows.activeWindow;
  for (let tab of wnd.tabs)
  {
    if (tab.url == url)
    {
      tab.activate();
      return;
    }
  }

  require("sdk/tabs").open(url);
};

exports.openAndWait = function(url, expectedUrl)
{
  return new Promise((resolve, reject) =>
  {
    let tabs = require("sdk/tabs");
    tabs.once("open", tab =>
    {
      tab.on("close", () => reject("tab-closed"));
      tab.on("ready", () =>
      {
        if (tab.url.startsWith(expectedUrl))
        {
          resolve(tab.url);
          tab.close();
        }
      });
    });
    tabs.open(url);
  });
};

exports.executeScript = function(contentScript, options)
{
  return new Promise((resolve, reject) =>
  {
    let {data} = require("sdk/self");
    let worker = require("sdk/tabs").activeTab.attach({
      contentScriptFile: [
        data.url("contentScript-compat.js"),
        data.url(contentScript)
      ],
      contentScriptOptions: options
    });

    worker.on("error", reject);
    worker.port.on("_ready", () =>
    {
      worker.port.disconnect = function()
      {
      };
      resolve(worker.port);
    });
  });
};
