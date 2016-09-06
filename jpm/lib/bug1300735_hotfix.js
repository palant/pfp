/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {Cu} = require("chrome");
let {Services} = Cu.import("resource://gre/modules/Services.jsm", {});

// See https://bugzilla.mozilla.org/show_bug.cgi?id=1300735 - we will get stale
// l10n data unless we flush bundles.
Services.strings.flushBundles();
