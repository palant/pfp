/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {i18n} = require("../browserAPI");
let {confirm} = require("./confirm");
let {setCommandHandler, setSubmitHandler, setResetHandler} = require("./events");
let {sync} = require("../proxy");
let state = require("./state");
let {$, setActivePanel, showUnknownError} = require("./utils");

const displayNames = new Map([
  ["dropbox", "Dropbox"],
  ["gdrive", "Google Drive"]
]);

setCommandHandler("sync-state-link", () => setActivePanel("sync-state"));
setCommandHandler("do-sync", () => sync.sync());
setSubmitHandler("sync-state", disable);
setResetHandler("sync-state", () => setActivePanel("password-list"));

state.on("update", updateState);

function localize(error)
{
  if (/\s/.test(error))
    return error;

  try
  {
    return i18n.getMessage(error) || error;
  }
  catch (e)
  {
    // Edge will throw for unknown messages
    return error;
  }
}

function updateState()
{
  $("sync-state-link").hidden = !state.sync.provider;
  $("sync-provider").textContent = displayNames.get(state.sync.provider) || state.sync.provider;
  $("do-sync").disabled = state.sync.isSyncing;
  if (state.sync.isSyncing)
  {
    $("sync-lastTime").textContent = i18n.getMessage("sync_lastTime_now");
    $("sync-lastTime-container").className = "";
  }
  else if (state.sync.lastSync)
  {
    $("sync-lastTime").textContent = new Date(state.sync.lastSync).toLocaleString();
    $("sync-lastTime-container").className = (state.sync.error ? "failed" : "succeeded");
  }
  else
  {
    $("sync-lastTime").textContent = i18n.getMessage("sync_lastTime_never");
    $("sync-lastTime-container").className = "";
  }

  if (state.sync.error)
  {
    $("sync-error").textContent = localize(state.sync.error);
    if (state.sync.error == "sync_invalid_token")
    {
      let link = document.createElement("a");
      link.textContent = i18n.getMessage("sync_reauthorize");
      $("sync-error").appendChild(document.createTextNode(" "));

      let {provider} = state.sync;
      let isWebClient = document.documentElement.classList.contains("webclient");
      if (isWebClient)
      {
        sync.getManualAuthURL(provider).then(url =>
        {
          link.href = url;
          link.target = "_blank";
          link.addEventListener("click", () =>
          {
            require("./syncAuthorize").show().then(code =>
            {
              return sync.manualAuthorization(provider, code).catch(showUnknownError);
            }).catch(error =>
            {
              // User cancelled, ignore
            });
          });
          $("sync-error").appendChild(link);
        }).catch(showUnknownError);
      }
      else
      {
        link.href = "#";
        link.addEventListener("click", event =>
        {
          event.preventDefault();
          sync.authorize(provider);
          window.close();
        });
        $("sync-error").appendChild(link);
      }
    }
  }
  $("sync-error").hidden = !state.sync.error;
  $("sync-state-link").className = (state.sync.error && state.sync.error != "sync_connection_error" ? "failed" : "");
}

function disable()
{
  confirm(i18n.getMessage("sync_disable_confirmation")).then(disable =>
  {
    if (disable)
    {
      sync.disable().then(() =>
      {
        setActivePanel("password-list");
      });
    }
  });
}
