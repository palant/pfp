/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import "../lib/main";
import {runApp} from "../ui/vue";
import PanelApp from "../ui/panel/App.vue";
import AllPasswordsApp from "../ui/allpasswords/App.vue";

let currentPage = null;
let currentApp = null;

window.close = function()
{
  // Prevent panel from closing the window
};

function showPage(page)
{
  if (page == currentPage)
    return;

  if (currentApp)
    currentApp.unmount();

  currentPage = page;
  if (currentPage == "panel")
  {
    currentApp = runApp(PanelApp, true);
    document.getElementById("dynamicStyle").href = "panel/panel.css";
  }
  else if (currentPage == "allpasswords")
  {
    currentApp = runApp(AllPasswordsApp, true);
    document.getElementById("dynamicStyle").href = "allpasswords/allpasswords.css";
  }

  window.dispatchEvent(new CustomEvent("port-connected", {
    detail: currentPage
  }));
}

(async function()
{
  try
  {
    if (!"asdf".includes("d"))
      throw new Error("String.includes() returned unexpected result");

    if (![1, 2, 3, 4].includes(3))
      throw new Error("Array.includes() returned unexpected result");

    if (!Array.isArray(Object.values({})))
      throw new Error("Object.values() returned unexpected result");

    if (new KeyboardEvent("keydown", {key: "Escape"}).key != "Escape")
      throw new Error("KeyboardEvent() returned unexpected result");

    await crypto.subtle.importKey(
      "raw",
      new Uint8Array(16),
      "AES-GCM",
      false,
      ["encrypt"]
    );
  }
  catch (error)
  {
    document.getElementById("compatWarning").hidden = false;
    console.log(error);
  }

  window.addEventListener("show-panel", () =>
  {
    showPage("panel");
  });
  window.addEventListener("show-allpasswords", () =>
  {
    showPage("allpasswords");
  });
  showPage("panel");

  document.getElementById("loading").remove();
})();
