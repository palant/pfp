/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {setCommandHandler, setSubmitHandler, setResetHandler} = require("./events");
let {sync} = require("../proxy");
let state = require("./state");
let {$, setActivePanel, showUnknownError} = require("./utils");

setCommandHandler("sync-setup-link", () => setActivePanel("sync-setup"));
setResetHandler("sync-setup", () => setActivePanel("password-list"));

state.on("update", updateLink);

let isWebClient = document.documentElement.classList.contains("webclient");
if (isWebClient)
{
  let nodes = $("sync-provider-selection").querySelectorAll("[data-provider]");
  for (let i = 0; i < nodes.length; i++)
  {
    let node = nodes[i];
    let provider = node.getAttribute("data-provider");
    sync.getManualAuthURL(provider).then(url =>
    {
      node.href = url;
      node.target = "_blank";
      node.addEventListener("click", () =>
      {
        require("./syncAuthorize").show().then(code =>
        {
          return sync.manualAuthorization(provider, code).then(() =>
          {
            setActivePanel("sync-state");
          }).catch(showUnknownError);
        }).catch(error =>
        {
          // User cancelled, ignore
        });
      });
    }).catch(showUnknownError);
  }
}
else
  setCommandHandler("sync-provider-selection", authorize);

function updateLink()
{
  $("sync-setup-link").hidden = state.sync.provider;
}

function authorize(event)
{
  let target = event.target;
  while (target && target.id != "sync-provider-selection" && !target.hasAttribute("data-provider"))
    target = target.parentNode;

  if (!target || !target.hasAttribute("data-provider"))
    return;

  event.preventDefault();
  sync.authorize(target.getAttribute("data-provider"));
  window.close();
}
