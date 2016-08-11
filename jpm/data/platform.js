/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

/* global self */

// Panel resizing

function resize()
{
  // Force reflow
  document.body.offsetHeight;

  self.port.emit("_resize", [
    document.documentElement.scrollWidth,
    Math.min(document.documentElement.offsetHeight, document.documentElement.scrollHeight)
  ]);
}
new window.MutationObserver(resize).observe(document.documentElement, {
  attributes: true,
  characterData: true,
  childList: true,
  subtree: true
});

// Messaging

exports.port = self.port;
