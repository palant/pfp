/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {passwords, passwordRetrieval} = require("../proxy");
let {port} = require("platform");

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
  passwordRetrieval.copyToClipboard(site, password.name, password.revision).then(() =>
  {
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
  passwords.exportPasswordData().then(sites =>
  {
    let data = {
      application: "easypasswords",
      format: 1,
      sites
    };

    let link = $("exportData");
    link.href = "data:application/json," + encodeURIComponent(JSON.stringify(data));
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
    let data = reader.result;
    try
    {
      data = JSON.parse(data);
    }
    catch (e)
    {
      data = null;
      console.error(e);
    }

    if (!data || typeof data != "object" || data.application != "easypasswords" || data.format != 1)
    {
      alert($("unknown-data-format").textContent);
      return;
    }

    if (confirm($("allpasswords-import-confirm").textContent))
    {
      passwords.importPasswordData(data.sites).then(() =>
      {
        alert($("allpasswords-import-success").textContent);
        window.location.reload();
      }).catch(showError);
    }
  };
  reader.readAsText(file);
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
      passwordInfo.querySelector(".user-name").textContent = passwordData.name;

      let revisionNode = passwordInfo.querySelector(".password-revision");
      revisionNode.hidden = !passwordData.revision;
      revisionNode.textContent = passwordData.revision;

      setCommandHandler(passwordInfo.querySelector(".to-clipboard-link"), copyToClipboard.bind(null, site, passwordData, passwordInfo));
      setCommandHandler(passwordInfo.querySelector(".password-remove-link"), removePassword.bind(null, site, passwordData, passwordInfo));

      if (passwordData.type == "generated")
      {
        passwordInfo.querySelector(".password-info.legacy").hidden = true;
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
