"use strict";

let hidePasswordMessagesTimeout = null;

onInit(function()
{
  setCommandHandler("site-edit", editSite);
  setCommandHandler("lock-passwords", () => self.port.emit("forgetMasterPassword"));

  self.port.on("passwordAdded", showPasswords);
  self.port.on("passwordRemoved", showPasswords);
  self.port.on("fillInFailed", showPasswordMessage);
  self.port.on("passwordCopied", showPasswordMessage.bind(null, "password-copied-message"));
  self.port.on("passwordCopyFailed", showPasswordMessage);

  hidePasswordMessages();
});

onShow(function({site, passwords})
{
  let field = $("site");
  field.setAttribute("value", site || "???");
  field.setAttribute("readonly", "readonly");

  showPasswords(passwords);
});

function hidePasswordMessages()
{
  if (hidePasswordMessagesTimeout)
    window.clearTimeout(hidePasswordMessagesTimeout);
  hidePasswordMessagesTimeout = null;

  for (let id of ["password-copied-message", "no-such-password", "unknown-generation-method", "wrong-site-message", "no-password-fields"])
    $(id).hidden = true;
  resize();
}

function showPasswordMessage(id)
{
  $(id).hidden = false;
  resize();

  hidePasswordMessagesTimeout = window.setTimeout(hidePasswordMessages, 3000);
}

function editSite()
{
  let field = $("site");
  field.removeAttribute("readonly");
  field.focus();
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
  let site = $("site").value;
  self.port.emit("fillIn", {site, name});
}

function copyToClipboard(name)
{
  let site = $("site").value;
  self.port.emit("copyToClipboard", {site, name});
}

function removePassword(name)
{
  let site = $("site").value;
  let message = messages["remove-password-confirmation"].replace(/\{1\}/g, name).replace(/\{2\}/g, site);
  confirm(message).then(response =>
  {
    if (response)
      self.port.emit("removePassword", {site, name});
  });
}
