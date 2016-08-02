/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {EventTarget, emit} = require("../../lib/eventTarget");
let page = EventTarget();

let manifest = require("./package.json");
if (!manifest.contentPage)
  throw new Error("No contentPage configuration in package.json");

let contentScripts = manifest.contentPage.contentScript || [];
if (typeof contentScripts.join != "function")
  contentScripts = [contentScripts];
contentScripts = contentScripts.map(file => external.getURL(file));

require("sdk/page-mod").PageMod({
  include: external.getURL(manifest.contentPage.contentURL),
  contentScriptFile: contentScripts,
  contentScriptWhen: "ready",
  onAttach: function(worker)
  {
    emit(page, "connect", worker.port);
  }
});

module.exports = page;
