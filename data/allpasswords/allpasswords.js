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

function addCell(row, text, rowspan)
{
  let cell = document.createElement("td");
  cell.textContent = text;
  if (rowspan)
    cell.rowSpan = rowspan;
  row.appendChild(cell);
}

self.port.on("init", function(sites)
{
  let typeGenerated = $("type-generated").textContent;
  let typeLegacy = $("type-legacy").textContent;
  let aliasesPrefix = $("aliases").textContent;

  let siteNames = Object.keys(sites);
  siteNames.sort();

  for (let site of siteNames)
  {
    let {passwords, aliases} = sites[site];
    let passwordNames = Object.keys(passwords);
    passwordNames.sort();

    let first = true;
    let container = $("list").tBodies[0];
    for (let name of passwordNames)
    {
      let row = document.createElement("tr");
      if (first)
      {
        let text = site;
        if (aliases.length)
        {
          aliases.sort();
          text += "\n" + aliasesPrefix + " " + aliases.join(", ");
        }
        addCell(row, text, passwordNames.length);
        first = false;
      }

      let passwordData = passwords[name];
      addCell(row, name);
      if (passwordData.type == "pbkdf2-sha1-generated")
      {
        addCell(row, typeGenerated);
        addCell(row, passwordData.length);

        let chars = [];
        if (passwordData.lower)
          chars.push("abc");
        if (passwordData.upper)
          chars.push("XYZ");
        if (passwordData.number)
          chars.push("789");
        if (passwordData.symbol)
          chars.push("+^;");
        addCell(row, chars.join(" "));
      }
      else
      {
        addCell(row, typeLegacy);
        addCell(row, "");
        addCell(row, "");
      }
      container.appendChild(row);
    }
  }
});
