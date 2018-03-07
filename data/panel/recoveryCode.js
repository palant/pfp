/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {i18n} = require("../browserAPI");
let {recoveryCodes} = require("../proxy");
let {setResetHandler, setCommandHandler} = require("./events");
let {setValidator, markInvalid} = require("./formValidation");
let state = require("./state");
let {$, getActivePanel, setActivePanel, setSiteName, showUnknownError} = require("./utils");
let Formatter = require("./formatter");

let originalSelection = null;
let targetElement = null;

setCommandHandler("recovery-code-strip", stripLastCodeLine);

// Dummy validator makes sure validation state is reset when necessary.
setValidator("recovery-code-input", () => null);

state.on("update", updateSiteName);
updateSiteName();

recoveryCodes.getValidChars().then(validChars =>
{
  Formatter.addInptType("B", new RegExp(`[${validChars}]`, "i"));

  new Formatter($("recovery-code-input"), {
    pattern: "{{BBBB}}-{{BBBB}}-{{BBBB}}:{{BBBB}}-{{BBBB}}-{{BBBB}}"
  })._formatValue = function(...args)
  {
    let callOriginal = message =>
    {
      markInvalid(this.el, message);
      Formatter.prototype._formatValue.call(this, ...args);
    };

    let result = processRecoveryCodeInput(this, validChars);
    if (typeof result.then == "function")
    {
      result.then(callOriginal).catch(error =>
      {
        showUnknownError(error);
        callOriginal("");
      });
    }
    else
      callOriginal(result);
  };
}).catch(showUnknownError);

function updateSiteName()
{
  setSiteName("recovery-code-website-name");
}

setResetHandler("recovery-code", () =>
{
  if (originalSelection)
    setActivePanel(originalSelection, true);
});

function show(element)
{
  originalSelection = getActivePanel();
  targetElement = element;
  $("recovery-code-accepted").textContent = "";
  setActivePanel("recovery-code");
}
exports.show = show;

function processRecoveryCodeInput(formatter, validChars)
{
  formatter.val = formatter.val.toUpperCase();

  const lineLen = 24;
  let raw = formatter.val.replace(new RegExp(`[^${validChars}]`, "gi"), "");
  if (raw.length < lineLen)
    return "";

  let existing = $("recovery-code-accepted").textContent;
  let checkSubstr = len =>
  {
    let code = existing + raw.substr(0, len);
    return recoveryCodes.isValid(code).then(result =>
    {
      if (result == "ok" || result == "unterminated")
      {
        return recoveryCodes.formatCode(code).then(formatted =>
        {
          $("recovery-code-accepted").textContent = formatted.trim();
          formatter.val = raw.substr(len);
          if (result == "ok")
          {
            recoveryCodes.decodeCode(formatted).then(password =>
            {
              if (originalSelection)
                setActivePanel(originalSelection, true);
              if (targetElement)
              {
                targetElement.value = password;
                targetElement.focus();
                targetElement = null;
              }
            }).catch(showUnknownError);
          }
          return "";
        });
      }
      else if (len - lineLen >= lineLen)
        return checkSubstr(len - lineLen);
      else
        throw result;
    }).catch(error =>
    {
      if (error == "checksum-mismatch")
        return i18n.getMessage("recovery_checksum_mismatch");
      else
        throw error;
    });
  };
  return checkSubstr(raw.length - raw.length % 24);
}

function stripLastCodeLine()
{
  let element = $("recovery-code-accepted");
  element.textContent = element.textContent.split(/[\r\n]+/).slice(0, -1).join("\n");
}
