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
