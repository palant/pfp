/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

function getCurrentHost()
{
  return require("tabs").currentTabURL().then(url =>
  {
    try
    {
      url = new URL(url);
    }
    catch (e)
    {
      return "";
    }

    if (url.protocol != "http:" && url.protocol != "https:")
      return "";

    return url.hostname || "";
  });
}
exports.getCurrentHost = getCurrentHost;
