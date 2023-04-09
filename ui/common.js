/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import browser from "../lib/browserAPI.js";
import {$t} from "./i18n.js";

export function normalizeHostname(hostname)
{
  const PREFIX = "www.";
  if (hostname && hostname.startsWith(PREFIX))
    return hostname.slice(PREFIX.length);
  return hostname && hostname.toLowerCase();
}

export function getSiteDisplayName(site)
{
  if (site == null)
    return "???";
  else if (site)
    return site;
  else
    return $t("/no_site_placeholder");
}

export function keyboardNavigationType(event)
{
  let rtl = document.documentElement.getAttribute("dir") == "rtl";
  switch (event.key)
  {
    case "ArrowUp":
      return "back";
    case rtl ? "ArrowRight" : "ArrowLeft":
      return "backinrow";
    case "ArrowDown":
      return "forward";
    case rtl ? "ArrowLeft" : "ArrowRight":
      return "forwardinrow";
    case "Home":
      return "startinrow";
    case "PageUp":
      return "start";
    case "End":
      return "endinrow";
    case "PageDown":
      return "end";
  }
  return null;
}

export function handleErrors(func)
{
  return async function(...args)
  {
    try
    {
      await func.apply(this, args);
    }
    catch (error)
    {
      this.$root.showUnknownError(error);
    }
  };
}

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
