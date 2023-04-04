/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import browser from "./browserAPI.js";
import {getPref, setPref} from "./prefs.js";

export async function getCurrentHost()
{
  let tabs = await browser.tabs.query({
    lastFocusedWindow: true,
    active: true
  });
  if (!tabs.length)
    return null;

  let url = new URL(tabs[0].url);
  if (url.protocol != "http:" && url.protocol != "https:")
    return null;

  return url.hostname || null;
}

export function getLink({type, param})
{
  if (type == "url")
    return param;
  else if (type == "relnotes")
    return `https://pfp.works/release-notes/${param}`;
  else if (type == "documentation")
    return `https://pfp.works/documentation/${param}/`;

  throw new Error("Unexpected link type");
}

export async function openLink(options)
{
  await browser.tabs.create({
    url: getLink(options),
    active: true
  });
}
