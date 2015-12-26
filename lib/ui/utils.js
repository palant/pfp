/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let tabs = require("sdk/tabs");
let {URL} = require("sdk/url");

function getCurrentHost()
{
  let tab = tabs.activeTab;
  if (!tab)
    return "";

  let url = new URL(tab.url);
  if (url.scheme != "http" && url.scheme != "https")
    return "";

  return url.host;
}
exports.getCurrentHost = getCurrentHost;
