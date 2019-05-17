/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import {i18n} from "../browserAPI";
import {getSiteDisplayName} from "../common";
import {set as clipboardSet} from "../clipboard";
import {enterMaster} from "./enterMaster";
import {$, setCommandHandler, showError} from "./utils";
import {show as showModal, hide as hideModal} from "./modal";
import {passwords, passwordRetrieval, recoveryCodes} from "../proxy";
import {port} from "../messaging";

function copyToClipboard(passwordData, passwordInfo)
{
  passwords.getPassword(passwordData).then(password =>
  {
    let doCopy = () =>
    {
      clipboardSet(password);
      let message = passwordInfo.querySelector(".password-copied-message");
      message.hidden = false;
      setTimeout(() =>
      {
        message.hidden = true;
      }, 3000);
    };

    let isWebClient = document.documentElement.classList.contains("webclient");
    if (!isWebClient)
      doCopy();
    else
    {
      let message = passwordInfo.querySelector(".password-ready-message");
      message.hidden = false;
      let handler = event =>
      {
        window.removeEventListener("click", handler, true);
        message.hidden = true;
        event.stopPropagation();
        event.preventDefault();
        doCopy();
      };
      window.addEventListener("click", handler, true);
    }
  }).catch(showError);
}

function removePassword(passwordData, passwordInfo)
{
  let message = i18n.getMessage("remove_password_confirmation").replace(/\{1\}/g, passwordData.name).replace(/\{2\}/g, passwordData.site);
  if (confirm(message))
  {
    passwords.removePassword(passwordData).then(() =>
    {
      let siteInfo = passwordInfo.parentNode;
      siteInfo.removeChild(passwordInfo);
      if (!siteInfo.querySelector(".password-container"))
        siteInfo.parentNode.removeChild(siteInfo);
    }).catch(showError);
  }
}

function exportData()
{
  passwords.exportPasswordData().then(data =>
  {
    // See https://bugzil.la/1379960, in Firefox this will only work with a
    // link inside a frame.
    let frameDoc = $("exportDataFrame").contentDocument;
    let link = frameDoc.body.lastChild;
    if (!link || link.localName != "a")
    {
      link = frameDoc.createElement("a");
      frameDoc.body.appendChild(link);
    }

    let blob = new Blob([data], {type: "application/json"});
    link.href = URL.createObjectURL(blob);
    link.download = "passwords-backup-" + new Date().toISOString().replace(/T.*/, "") + ".json";
    link.click();
  }).catch(showError);
}

function importData()
{
  $("importFile").click();
}

function importDataFromFile(file)
{
  let reader = new FileReader();
  reader.onload = function()
  {
    if (confirm(i18n.getMessage("allpasswords_import_confirm")))
      doImport(reader.result);
  };
  reader.readAsText(file);
}

function doImport(data, masterPass)
{
  showModal("in-progress");
  passwords.importPasswordData(data, masterPass).then(() =>
  {
    hideModal();
    alert(i18n.getMessage("allpasswords_import_success"));
    window.location.reload();
  }).catch(error =>
  {
    hideModal();
    if (error == "wrong_master_password")
    {
      enterMaster("allpasswords_import_with_master", true).then(newMaster =>
      {
        doImport(data, newMaster);
      }).catch(error =>
      {
        // User cancelled, ignore
      });
    }
    else
      showError(error);
  });
}

function showNotes(event)
{
  let state = event.target.checked;
  if (state)
  {
    $("list").classList.add("show-notes");
    delete window.localStorage.hideNotes;
  }
  else
  {
    $("list").classList.remove("show-notes");
    window.localStorage.hideNotes = true;
  }
}

let askedPasswords = false;
let retrievedPasswords = false;

function showPasswords(event)
{
  let state = event.target.checked;
  if (state && !askedPasswords)
  {
    if (confirm(i18n.getMessage("allpasswords_show_confirm")))
      askedPasswords = true;
    else
    {
      event.target.checked = false;
      return;
    }
  }

  if (state)
    $("list").classList.add("show-passwords");
  else
    $("list").classList.remove("show-passwords");

  if (state && !retrievedPasswords)
  {
    retrievedPasswords = true;
    Promise.resolve().then(() =>
    {
      let actions = [];
      let elements = $("list").querySelectorAll(".password-info-container");
      for (let i = 0; i < elements.length; i++)
      {
        let passwordInfo = elements[i];
        let [site, passwordData] = passwordInfo._data;
        actions.push(passwords.getPassword(passwordData)
          .then(value =>
          {
            let element = passwordInfo.querySelector(".password-value");
            element.textContent = value;
            element.hidden = false;
          }));
      }
      return Promise.all(actions);
    }).catch(e =>
    {
      retrievedPasswords = false;
      showError(e);
    });
  }
}

function printPage()
{
  window.print();
}

function goToSite(site, event)
{
  event.preventDefault();
  passwords.getPasswords(site).then(([origSite, site, pwdList]) =>
  {
    port.emit("forward-to-panel", {
      name: "init",
      args: [{origSite, site, pwdList}]
    });
  });
  window.dispatchEvent(new Event("show-panel"));
}

window.addEventListener("DOMContentLoaded", function()
{
  let globalActions = {
    export: exportData,
    import: importData,
    print: printPage
  };

  for (let id of Object.keys(globalActions))
  {
    let element = $(id);
    element.setAttribute("title", element.textContent);
    element.textContent = "";
    setCommandHandler(element, globalActions[id]);
  }

  $("importFile").addEventListener("change", event =>
  {
    importDataFromFile(event.target.files[0]);
  });

  let notesCheckbox = $("show-notes");
  notesCheckbox.addEventListener("click", showNotes);
  notesCheckbox.checked = !("hideNotes" in window.localStorage);
  showNotes({target: notesCheckbox});

  $("show-passwords").addEventListener("click", showPasswords);

  passwords.getAllPasswords().then(sites =>
  {
    let siteTemplate = $("site-template").firstElementChild;
    let passwordTemplate = $("password-template").firstElementChild;
    let links = passwordTemplate.querySelectorAll("a");
    for (let i = 0; i < links.length; i++)
    {
      let link = links[i];
      if (link.textContent)
      {
        link.setAttribute("title", link.textContent);
        link.textContent = "";
      }
    }

    let siteNames = Object.keys(sites);
    siteNames.sort();
    {
      let index = siteNames.indexOf("pfp.invalid");
      if (index >= 0)
      {
        siteNames.splice(index, 1);
        siteNames.unshift("pfp.invalid");
      }
    }

    let recoveryCodeOperations = [];
    let container = $("list");
    let currentLetter = null;
    let prevInfo = null;
    let isWebClient = document.documentElement.classList.contains("webclient");
    for (let site of siteNames)
    {
      let {passwords, aliases} = sites[site];

      let displayName = getSiteDisplayName(site);
      let siteInfo = siteTemplate.cloneNode(true);
      if (isWebClient)
      {
        let link = document.createElement("a");
        link.setAttribute("href", "#");
        link.textContent = displayName;
        link.addEventListener("click", goToSite.bind(null, site));
        siteInfo.querySelector(".site-name").appendChild(link);
      }
      else
        siteInfo.querySelector(".site-name").textContent = displayName;

      if (aliases.length)
        siteInfo.querySelector(".site-aliases-value").textContent = aliases.sort().join(", ");
      else
        siteInfo.querySelector(".site-aliases").hidden = true;

      for (let passwordData of passwords)
      {
        let passwordInfo = passwordTemplate.cloneNode(true);
        passwordInfo._data = [site, passwordData];
        passwordInfo.querySelector(".user-name").textContent = passwordData.name;

        let revisionNode = passwordInfo.querySelector(".password-revision");
        revisionNode.hidden = !passwordData.revision;
        revisionNode.textContent = passwordData.revision;

        setCommandHandler(passwordInfo.querySelector(".to-clipboard-link"), copyToClipboard.bind(null, passwordData, passwordInfo));
        setCommandHandler(passwordInfo.querySelector(".password-remove-link"), removePassword.bind(null, passwordData, passwordInfo));

        if (passwordData.type == "generated2" || passwordData.type == "generated")
        {
          passwordInfo.querySelector(".password-info.stored").hidden = true;
          passwordInfo.querySelector(".password-type." + passwordData.type).hidden = false;
          if (passwordData.type == "generated")
            passwordInfo.querySelector(".password-type.generated-print").hidden = false;
          passwordInfo.querySelector(".password-length-value").textContent = passwordData.length;

          let chars = [];
          if (passwordData.lower)
            chars.push("abc");
          if (passwordData.upper)
            chars.push("XYZ");
          if (passwordData.number)
            chars.push("789");
          if (passwordData.symbol)
            chars.push("+^;");
          passwordInfo.querySelector(".password-allowed-chars-value").textContent = chars.join(" ");
        }
        else
        {
          passwordInfo.querySelector(".password-info.generated").hidden = true;
          recoveryCodeOperations.push(recoveryCodes.getCode(passwordData).then(code =>
          {
            passwordInfo.querySelector(".password-recovery").textContent = code;
          }));
        }

        let notes = passwordInfo.querySelector(".password-info.notes");
        notes.hidden = !passwordData.notes;
        if (passwordData.notes)
          notes.textContent += " " + passwordData.notes;

        siteInfo.appendChild(passwordInfo);
      }

      container.appendChild(siteInfo);

      let letter = displayName[0].toUpperCase();
      if (letter != currentLetter && letter != "(")
      {
        currentLetter = letter;
        let link = document.createElement("a");
        link.textContent = currentLetter;
        link.href = "#";
        setCommandHandler(link, () =>
        {
          let div = siteInfo;
          while (div && !div.parentNode)
            div = div._nextSiteInfo;
          if (div)
            div.scrollIntoView(true);
        });
        $("shortcuts").appendChild(link);
        link.focus();
      }

      if (prevInfo)
        prevInfo._nextSiteInfo = siteInfo;
      prevInfo = siteInfo;
    }

    Promise.all(recoveryCodeOperations).catch(showError);
  }).catch(showError);
});

// Hack: expose __webpack_require__ for simpler debugging
/* global __webpack_require__ */
export default __webpack_require__;
