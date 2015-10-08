"use strict";

let utils = require("sdk/window/utils");

function fixPanel(panel)
{
  // See https://bugzilla.mozilla.org/show_bug.cgi?id=918600 - we merely have
  // to add a tooltip attribute to the iframe created by the SDK. It is injected
  // into the most recent browser window and then moved around, so we only need
  // to fix this once.
  for (let element of utils.getMostRecentBrowserWindow().document.querySelectorAll("panel[sdkscriptenabled]"))
  {
    if (element.backgroundFrame && element.backgroundFrame.getAttribute("src") == panel.contentURL &&
        element.viewFrame && !element.viewFrame.hasAttribute("tooltip"))
    {
      element.viewFrame.setAttribute("tooltip", "aHTMLTooltip");
    }
  }
}
exports.fixPanel = fixPanel;
