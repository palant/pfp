/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import browser from "./browserAPI.js";
import {getCurrentHost} from "./ui.js";
import {getPassword, getAlias} from "./passwords.js";
import {getPort} from "./messaging.js";

let maxScriptID = 0;

export async function fillIn(passwordData)
{
  let password = await getPassword(passwordData);
  let currentHost = await getCurrentHost();
  let [, currentSite] = await getAlias(currentHost);
  if (currentSite != passwordData.site)
    throw "wrong_site";

  await new Promise((resolve, reject) =>
  {
    let scriptID = ++maxScriptID;
    let port = getPort("contentScript");

    port.on("done", function doneHandler({scriptID: source, result})
    {
      if (source != scriptID)
        return;

      port.off("done", doneHandler);
      if (result)
        reject(result);
      else
      {
        resolve();

        // Make sure that the popup is closed on Firefox Android,
        // work-around for https://bugzil.la/1433604
        browser.tabs.update({active: true});
      }
    });

    browser.tabs.executeScript({
      code: "var _parameters = " + JSON.stringify({
        scriptID,
        host: currentHost,
        name: passwordData.name,
        password
      })
    }).catch(reject);

    browser.tabs.executeScript({file: "contentScript/fillIn.js"}).catch(reject);
  });
}
