/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

/* global chrome */

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
