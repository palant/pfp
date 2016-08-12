/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {port} = require("platform");
let {passwords, masterPassword, passwordRetrieval, ui} = require("../proxy");
let {setCommandHandler, setSubmitHandler} = require("./events");
let state = require("./state");
let {$, setActivePanel, messages, showUnknownError} = require("./utils");

let {confirm} = require("./confirm");

let hidePasswordMessagesTimeout = null;

for (let element of ["original-site", "site-edit", "site-edit-accept", "site-edit-cancel"].map($))
{
  element.setAttribute("title", element.textContent);
  element.textContent = "";
}

setCommandHandler("site-edit", editSite);
setCommandHandler("show-all", () =>
{
  ui.showAllPasswords()
    .then(() => require("platform").close())
    .catch(showUnknownError);
});
setCommandHandler("lock-passwords", () =>
{
  masterPassword.forgetPassword()
    .then(() => state.set({masterPasswordState: "set"}))
    .catch(showUnknownError);
});
setCommandHandler("original-site", removeAlias);
setCommandHandler("site-edit-accept", finishEditingSite);
setCommandHandler("site-edit-cancel", abortEditingSite);
setSubmitHandler("password-list", finishEditingSite);

hidePasswordMessages();

state.on("update", initPasswordList);
initPasswordList();

function initPasswordList()
{
  setSite();
  showPasswords();
}

function setSite()
{
  let {origSite, site} = state;

  let origSiteField = $("original-site");
  if (origSite != site)
  {
    origSiteField.hidden = false;
    origSiteField.textContent = origSite + "\n\u21E3";
  }
  else
    origSiteField.hidden = true;
  $("site-edit").hidden = (origSite != site);

  let field = $("site");
  field.setAttribute("value", site || "???");
  field.value = field.getAttribute("value");
  field.setAttribute("readonly", "readonly");
  $("generate-password-link").hidden = $("legacy-password-link").hidden = !site;
}

function hidePasswordMessages()
{
  if (hidePasswordMessagesTimeout)
    window.clearTimeout(hidePasswordMessagesTimeout);
  hidePasswordMessagesTimeout = null;

  for (let id of ["cannot-edit-site", "empty-site-name", "password-copied-message", "no-such-password", "unknown-generation-method", "wrong-site-message", "no-password-fields"])
    $(id).hidden = true;
}

function showPasswordMessage(error)
{
  hidePasswordMessages();

  let element = $(error);
  if (!element)
  {
    showUnknownError(error);
    return;
  }

  element.hidden = false;

  hidePasswordMessagesTimeout = window.setTimeout(hidePasswordMessages, 3000);
}

function editSite()
{
  if ($("password-list-container").firstElementChild)
  {
    showPasswordMessage("cannot-edit-site");
    return;
  }

  let field = $("site");
  field.removeAttribute("readonly");
  field.value = state.site;
  field.focus();
}

function finishEditingSite()
{
  let field = $("site");
  let alias = field.value.trim();
  if (!alias)
  {
    showPasswordMessage("empty-site-name");
    return;
  }

  let {site} = state;
  if (alias == site)
  {
    abortEditingSite();
    return;
  }

  Promise.resolve()
    .then(() =>
    {
      if (site)
        return passwords.addAlias(site, alias);
      else
        return undefined;
    })
    .then(() => passwords.getPasswords(state.origSite || alias))
    .then(([origSite, site, pwdList]) => state.set({origSite, site, pwdList}))
    .catch(showUnknownError);
  field.setAttribute("readonly", "readonly");
}

function abortEditingSite()
{
  setSite();
}

function removeAlias()
{
  let {origSite, site} = state;
  let message = messages["remove-alias-confirmation"].replace(/\{1\}/g, origSite).replace(/\{2\}/g, site);
  confirm(message).then(response =>
  {
    if (response)
    {
      passwords.removeAlias(origSite)
        .then(() => passwords.getPasswords(origSite))
        .then(([origSite, site, pwdList]) => state.set({origSite, site, pwdList}))
        .catch(showUnknownError);
    }
  });
}

function showPasswords()
{
  let pwdList = state.pwdList;
  if (!pwdList)
    return;

  let list = $("password-list-container");
  while (list.lastChild && !list.lastChild.id)
    list.removeChild(list.lastChild);

  let names = Object.keys(pwdList);
  if (names.length)
  {
    let template = $("password-template").firstElementChild;
    let links = template.querySelectorAll("a");
    for (let i = 0; i < links.length; i++)
    {
      let link = links[i];
      if (link.textContent)
      {
        link.setAttribute("title", link.textContent);
        link.textContent = "";
      }
    }

    names.sort();
    for (let name of names)
    {
      let password = pwdList[name];
      let tooltip;
      if (password.type == "pbkdf2-sha1-generated")
      {
        tooltip = messages["password-type-generated"];

        tooltip += "\n" + document.querySelector('label[for="password-length"]').textContent;
        tooltip += " " + password.length;

        tooltip += "\n" + document.querySelector('label[for="charset-lower"]').textContent;
        if (password.lower)
          tooltip += " " + "abc";
        if (password.upper)
          tooltip += " " + "XYZ";
        if (password.number)
          tooltip += " " + "789";
        if (password.symbol)
          tooltip += " " + "+^;";
      }
      else if (password.type == "pbkdf2-sha1-aes256-encrypted")
        tooltip = messages["password-type-legacy"];

      let entry = template.cloneNode(true);
      setCommandHandler(entry.querySelector(".to-document-link"), fillInPassword.bind(null, name));
      setCommandHandler(entry.querySelector(".to-clipboard-link"), copyToClipboard.bind(null, name));
      setCommandHandler(entry.querySelector(".password-remove-link"), removePassword.bind(null, name));

      let nameNode = entry.querySelector(".password-name");
      nameNode.textContent = name;
      nameNode.setAttribute("title", tooltip);

      list.appendChild(entry);
    }
  }

  $("no-passwords-message").hidden = names.length;
}

function fillInPassword(name)
{
  let {site} = state;
  passwordRetrieval.fillIn(site, name)
    .then(() => require("platform").close())
    .catch(showPasswordMessage);
}

function copyToClipboard(name)
{
  let {site} = state;
  passwordRetrieval.copyToClipboard(site, name)
    .then(() => showPasswordMessage("password-copied-message"))
    .catch(showPasswordMessage);
}

function removePassword(name)
{
  let {site} = state;
  let message = messages["remove-password-confirmation"].replace(/\{1\}/g, name).replace(/\{2\}/g, site);
  confirm(message).then(response =>
  {
    if (response)
    {
      passwords.removePassword(site, name)
        .then(pwdList => state.set({pwdList}))
        .catch(showPasswordMessage);
    }
  });
}
