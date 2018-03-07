/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

function getSiteDisplayName(site)
{
  if (site == "pfp.invalid")
    return require("./browserAPI").i18n.getMessage("no_site_placeholder");
  else if (site)
    return site;
  else
    return "???";
}
exports.getSiteDisplayName = getSiteDisplayName;
