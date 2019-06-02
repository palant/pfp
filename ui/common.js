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

export function advanceFocus(className, forward)
{
  let current = document.activeElement;
  let elements = document.getElementsByClassName(className);
  let index = [].indexOf.call(elements, current);
  if (index < 0)
    return;

  if (forward && index + 1 < elements.length)
    elements[index + 1].focus();
  else if (!forward && index - 1 >= 0)
    elements[index - 1].focus();
}
