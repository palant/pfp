/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import {$t} from "./i18n";

export function validateMasterPassword(val)
{
  if (val.value.length < 6)
    val.error = $t("/password_too_short");
}

export function getSiteDisplayName(site)
{
  if (site == "pfp.invalid")
    return $t("/no_site_placeholder");
  else if (site)
    return site;
  else
    return "???";
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
