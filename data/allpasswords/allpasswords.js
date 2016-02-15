/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

function $(id)
{
  return document.getElementById(id);
}

function addDiv(parent, className, text)
{
  let div = document.createElement("div");
  div.className = className;
  if (text)
    div.textContent = text;
  parent.appendChild(div);
  return div;
}

self.port.on("init", function(sites)
{
  let typeGenerated = $("type-generated").textContent;
  let typeLegacy = $("type-legacy").textContent;
  let aliasesPrefix = $("aliases-prefix").textContent;
  let lengthPrefix = $("length-prefix").textContent;
  let charsPrefix = $("chars-prefix").textContent;

  let siteNames = Object.keys(sites);
  siteNames.sort();

  let container = $("list");
  for (let site of siteNames)
  {
    let {passwords, aliases} = sites[site];

    let block = addDiv(container, "siteInfo");
    addDiv(block, "siteName", site);

    if (aliases.length)
    {
      aliases.sort();
      addDiv(block, "siteAliases", aliasesPrefix + " " + aliases.join(", "));
    }

    let passwordNames = Object.keys(passwords);
    passwordNames.sort();
    for (let name of passwordNames)
    {
      let passwordData = passwords[name];
      let passwordDiv = addDiv(block, "password");
      addDiv(passwordDiv, "passwordName", name);

      if (passwordData.type == "pbkdf2-sha1-generated")
      {
        addDiv(passwordDiv, "passwordType", typeGenerated);
        addDiv(passwordDiv, "passwordLength", lengthPrefix + " " + passwordData.length);

        let chars = [];
        if (passwordData.lower)
          chars.push("abc");
        if (passwordData.upper)
          chars.push("XYZ");
        if (passwordData.number)
          chars.push("789");
        if (passwordData.symbol)
          chars.push("+^;");
        addDiv(passwordDiv, "passwordAllowedChars", charsPrefix + " " + chars.join(" "));
      }
      else
      {
        addDiv(passwordDiv, "passwordType", typeLegacy);
      }
    }
  }
});
