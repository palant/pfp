/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

// Not returning anything useful here - the caller should fall back to just
// opening the tab, looking for existing instances will be done there.
exports.browserWindows = {
  activeWindow: {
    tabs: []
  }
};
