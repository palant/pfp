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

self.port.on("init", function(sites)
{
  let siteTemplate = $("site-template").firstElementChild;
  let passwordTemplate = $("password-template").firstElementChild;
  for (let link of passwordTemplate.querySelectorAll("a"))
  {
    if (link.textContent)
    {
      link.setAttribute("title", link.textContent);
      link.textContent = "";
    }
  }

  let siteNames = Object.keys(sites);
  siteNames.sort();

  let container = $("list");
  for (let site of siteNames)
  {
    let {passwords, aliases} = sites[site];

    let siteInfo = siteTemplate.cloneNode(true);
    siteInfo.querySelector(".site-name").textContent = site;

    if (aliases.length)
      siteInfo.querySelector(".site-aliases-value").textContent = aliases.sort().join(", ");
    else
      siteInfo.querySelector(".site-aliases").hidden = true;

    let passwordNames = Object.keys(passwords);
    passwordNames.sort();
    for (let name of passwordNames)
    {
      let passwordData = passwords[name];
      let passwordInfo = passwordTemplate.cloneNode(true);
      passwordInfo.querySelector(".password-name").textContent = name;

      if (passwordData.type == "pbkdf2-sha1-generated")
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
  }
});
