/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {passwords, passwordRetrieval} = require("../proxy");
let {port} = require("../messaging");

function $(id)
{
  return document.getElementById(id);
}

function setCommandHandler(element, handler)
{
  if (typeof element == "string")
    element = $(element);
  let wrapper = (event) =>
  {
    event.preventDefault();
    handler.call(element, event);
  };
  element.addEventListener("click", wrapper);
}

function copyToClipboard(site, password, passwordInfo)
{
  passwords.getPassword(site, password.name, password.revision).then(password =>
  {
    require("../clipboard").set(password);
    let message = passwordInfo.querySelector(".password-copied-message");
    message.hidden = false;
    setTimeout(() =>
    {
      message.hidden = true;
    }, 3000);
  }).catch(showError);
}

function removePassword(site, password, passwordInfo)
{
  let message = $("remove-password-confirmation").textContent.replace(/\{1\}/g, password.name).replace(/\{2\}/g, site);
  if (confirm(message))
  {
    passwords.removePassword(site, password.name, password.revision).then(() =>
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
    if (window.navigator.userAgent.indexOf(" Edge/") >= 0)
    {
      // Edge won't let extensions download blobs (https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/9551771/)
      // and it would ignore the file name anyway (https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/6594876/).
      // data: URIs don't work either (https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/4282810/).
      // Let the user copy the text manually, that's the only way.
      if (confirm($("allpasswords-export-edge").textContent))
        document.body.textContent = data;
    }
    else
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
    }
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
    if (confirm($("allpasswords-import-confirm").textContent))
    {
      passwords.importPasswordData(reader.result).then(() =>
      {
        alert($("allpasswords-import-success").textContent);
        window.location.reload();
      }).catch(showError);
    }
  };
  reader.readAsText(file);
}

function showPasswords()
{
  if (confirm($("allpasswords-show-confirm").textContent))
  {
    $("show").hidden = true;

    Promise.resolve().then(() =>
    {
      let actions = [];
      let elements = $("list").querySelectorAll(".password-info-container");
      for (let i = 0; i < elements.length; i++)
      {
        let passwordInfo = elements[i];
        let [site, passwordData] = passwordInfo._data;
        actions.push(passwords.getPassword(site, passwordData.name, passwordData.revision)
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
      $("show").hidden = false;
      showError(e);
    });
  }
}

function printPage()
{
  window.print();
}

window.addEventListener("DOMContentLoaded", function()
{
  let globalActions = {
    export: exportData,
    import: importData,
    show: showPasswords,
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
});

port.on("init", function(sites)
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

  let container = $("list");
  let currentLetter = null;
  let prevInfo = null;
  for (let site of siteNames)
  {
    let {passwords, aliases} = sites[site];

    let siteInfo = siteTemplate.cloneNode(true);
    siteInfo.querySelector(".site-name").textContent = site;

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

      setCommandHandler(passwordInfo.querySelector(".to-clipboard-link"), copyToClipboard.bind(null, site, passwordData, passwordInfo));
      setCommandHandler(passwordInfo.querySelector(".password-remove-link"), removePassword.bind(null, site, passwordData, passwordInfo));

      if (passwordData.type == "generated2" || passwordData.type == "generated")
      {
        passwordInfo.querySelector(".password-info.stored").hidden = true;
        passwordInfo.querySelector(".password-type." + passwordData.type).hidden = false;
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
      }

      let notes = passwordInfo.querySelector(".password-info.notes");
      notes.hidden = !passwordData.notes;
      if (passwordData.notes)
        notes.textContent += " " + passwordData.notes;

      siteInfo.appendChild(passwordInfo);
    }

    container.appendChild(siteInfo);

    let letter = site[0].toUpperCase();
    if (letter != currentLetter)
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
    }

    if (prevInfo)
      prevInfo._nextSiteInfo = siteInfo;
    prevInfo = siteInfo;
  }
});

function showError(error)
{
  let message = $(error);
  if (message && message.parentNode.id == "messages")
    message = message.textContent;
  else
    message = error;
  alert(message);
}

// Hack: expose __webpack_require__ for simpler debugging
/* global __webpack_require__ */
module.exports = __webpack_require__;
