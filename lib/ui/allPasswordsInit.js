/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {data} = require("sdk/self");
let windows = require("sdk/windows");
let tabs = require("sdk/tabs");
let {PageMod} = require("sdk/page-mod");

let {getAllPasswords} = require("../passwords");

let pageURL = data.url("allpasswords/allpasswords.html");

PageMod({
  include: pageURL,
  contentScriptFile: data.url("allpasswords/allpasswords.js"),
  contentScriptWhen: "ready",
  onAttach: function(worker)
  {
    worker.port.emit("init", getAllPasswords());
  }
});

module.exports = function(panel)
{
  panel.port.on("showAllPasswords", function()
  {
    // Only look for existing tab in the active window, don't activate
    // background windows to avoid unexpected effects.
    let wnd = windows.browserWindows.activeWindow;
    for (let tab of wnd.tabs)
    {
      if (tab.url == pageURL)
      {
        tab.activate();
        panel.hide();
        return;
      }
    }

    tabs.open(pageURL);
    panel.hide();
  });
};
