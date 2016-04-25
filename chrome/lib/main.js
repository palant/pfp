/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

require("sdk/simple-storage").init.then(() =>
{
  require("../../lib/masterPassword");
  require("../../lib/passwords");
});
