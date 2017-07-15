/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let port = browser.runtime.connect({name: "data-migration"});

port.onMessage.addListener(data =>
{
  Promise.resolve().then(() =>
  {
    if (!data)
      return null;

    return browser.storage.local.set(data).then(() =>
    {
      port.postMessage(true);
    });
  }).catch(e =>
  {
    console.error(e);
  }).then(() =>
  {
    port.disconnect();
  });
});
