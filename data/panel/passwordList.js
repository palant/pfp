/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

(function()
{
  "use strict";

  /*
    global $, onInit, onShow, setValidator, setActivePanel, getActivePanel,
    setCommandHandler, setSubmitHandler, setResetHandler, markInvalid,
    enforceValue, resize, messages
  */

  let hidePasswordMessagesTimeout = null;
  let site = null;
  let origSite = null;

  onInit(function()
  {
    for (let element of ["original-site", "site-edit", "site-edit-accept", "site-edit-cancel"].map($))
    {
      element.setAttribute("title", element.textContent);
      element.textContent = "";
    }

    setCommandHandler("site-edit", editSite);
    setCommandHandler("show-all", () => self.port.emit("showAllPasswords"));
    setCommandHandler("lock-passwords", () => self.port.emit("forgetMasterPassword"));
    setCommandHandler("original-site", removeAlias);
    setCommandHandler("site-edit-accept", finishEditingSite);
    setCommandHandler("site-edit-cancel", abortEditingSite);
    setSubmitHandler("password-list", finishEditingSite);

    self.port.on("setPasswords", initPasswordList);
    self.port.on("passwordAdded", showPasswords);
    self.port.on("passwordRemoved", showPasswords);
    self.port.on("fillInFailed", showPasswordMessage);
    self.port.on("passwordCopied", showPasswordMessage.bind(null, "password-copied-message"));
    self.port.on("passwordCopyFailed", showPasswordMessage);

    hidePasswordMessages();
  });

  onShow(initPasswordList);

  function initPasswordList({origSite, site, passwords})
  {
    setSite(origSite, site);
    showPasswords(passwords);
  }

  function setSite(newOrigSite, newSite)
  {
    origSite = newOrigSite;
    site = newSite;

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
    resize();
  }

  function showPasswordMessage(id)
  {
    hidePasswordMessages();

    $(id).hidden = false;
    resize();

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
    field.value = site;
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

    if (alias == site)
    {
      abortEditingSite();
      return;
    }

    if (site)
      self.port.emit("addAlias", {site, alias});
    else
      self.port.emit("getPasswords", alias);
    field.setAttribute("readonly", "readonly");
  }

  function abortEditingSite()
  {
    setSite(origSite, site);
  }

  function removeAlias()
  {
    let message = messages["remove-alias-confirmation"].replace(/\{1\}/g, origSite).replace(/\{2\}/g, site);
    confirm(message).then(response =>
    {
      if (response)
        self.port.emit("removeAlias", origSite);
    });
  }

  function showPasswords(passwords)
  {
    let list = $("password-list-container");
    while (list.lastChild && !list.lastChild.id)
      list.removeChild(list.lastChild);

    let names = Object.keys(passwords);
    if (names.length)
    {
      let template = $("password-template").firstElementChild;
      for (let link of template.querySelectorAll("a"))
      {
        if (link.textContent)
        {
          link.setAttribute("title", link.textContent);
          link.textContent = "";
        }
      }

      names.sort();
      for (let name of names)
      {
        let password = passwords[name];
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

    resize();
  }

  function fillInPassword(name)
  {
    self.port.emit("fillIn", {site, name});
  }

  function copyToClipboard(name)
  {
    self.port.emit("copyToClipboard", {site, name});
  }

  function removePassword(name)
  {
    let message = messages["remove-password-confirmation"].replace(/\{1\}/g, name).replace(/\{2\}/g, site);
    confirm(message).then(response =>
    {
      if (response)
        self.port.emit("removePassword", {site, name});
    });
  }
})();
