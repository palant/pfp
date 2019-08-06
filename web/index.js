/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import {runApp} from "../ui/vue";
import App from "./App.vue";

let frame = document.createElement("frame");
frame.src = "about:blank";
frame.hidden = true;
frame.addEventListener("load", event =>
{
  let frameDoc = frame.contentDocument;
  let script = frameDoc.createElement("script");
  script.src = "background.js";
  script.addEventListener("load", event =>
  {
    runApp(App, true);
  });
  frameDoc.body.appendChild(script);
});
document.body.appendChild(frame);
