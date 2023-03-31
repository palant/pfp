/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import {$t} from "./i18n.js";

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
