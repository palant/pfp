/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

(function()
{
  let {Cu} = require("chrome");
  Cu.importGlobalProperties(["crypto", "TextEncoder", "TextDecoder", "atob", "btoa", "URL"]);
})();

let {setTimeout, clearTimeout} = require("sdk/timers");

this.external = {
  get currentTabURL()
  {
    let tab = require("sdk/tabs").activeTab;
    return Promise.resolve(tab ? tab.url : null);
  },

  getURL: function(path)
  {
    return require("sdk/self").data.url(path);
  },

  openTab: function(url)
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
  },

  setClipboard: function(data)
  {
    return require("sdk/clipboard").set(data, "text");
  },

  // SDK-only
  importCustomizableUI: function()
  {
    let {Cu} = require("chrome");
    return Cu.import("resource:///modules/CustomizableUI.jsm", {});
  }
};
