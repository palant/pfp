/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import {i18n} from "./browserAPI";

export function validateMasterPassword(val)
{
  if (val.value.length < 6)
    val.error = this.$t("password_too_short");
}

export function getSiteDisplayName(site)
{
  if (site == "pfp.invalid")
    return i18n.getMessage("no_site_placeholder");
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
    case rtl ? "ArrowRight" : "ArrowLeft":
      return "back";
    case "ArrowDown":
    case rtl ? "ArrowLeft" : "ArrowRight":
      return "forward";
    case "Home":
    case "PageUp":
      return "start";
    case "End":
    case "PageDown":
      return "end";
  }
  return null;
}
