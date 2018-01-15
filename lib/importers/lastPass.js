/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

/* global document */

const parseURL = require("url").parse;

const header = "url,username,password,extra,name,grouping,fav";
exports.header = header;

// If the Lastpass binary component is installed the CSV file is saved directly.
// Otherwise some JavaScript creates a pre element and assigns the contents to
// its innerHTML which has the side-effect of encoding HMTL entities. We assume
// encoding happened, but if it didn't passwords or notes containing entities
// will unfortunately be corrupted.
// http://stackoverflow.com/a/7394787/1226469
function decodeHTMLEntities(encoded)
{
  let textarea = document.createElement("textarea");
  textarea.innerHTML = encoded;
  return textarea.value;
}

function parseCSV(fileContents)
{
  const expectedValueCount = header.split(",").length;

  let entries = [];
  let currentEntry = [];
  let currentValue = "";
  let currentlyQuoted = false;
  let currentLine = 0;

  fileContents = fileContents.trim() + "\n";

  for (let i = 0; i < fileContents.length; i++)
  {
    let currentChar = fileContents[i];
    switch (currentChar)
    {
      case "\"":
        if (!currentlyQuoted)
          currentlyQuoted = true;
        else if (i + 1 < fileContents.length &&
                 fileContents[i + 1] == "\"")
        {
          currentValue += currentChar;
          i++;
        }
        else
          currentlyQuoted = false;
        break;
      case ",":
        if (!currentlyQuoted)
        {
          currentEntry.push(currentValue);
          currentValue = "";
        }
        else
          currentValue += currentChar;
        break;
      case "\n":
        if (!currentlyQuoted)
        {
          currentEntry.push(currentValue);
          currentValue = "";
          if (currentEntry.length != expectedValueCount)
          {
            throw new Error(
              "Line " + currentLine + ": Wrong number of values for entry. " +
              "Saw " + currentEntry.length + ", but expected " +
              expectedValueCount + "."
            );
          }
          entries.push(currentEntry);
          currentEntry = [];
        }
        else
          currentValue += currentChar;
        currentLine++;
        break;
      default:
        currentValue += currentChar;
    }
  }

  if (currentlyQuoted)
  {
    throw new Error(
      "Syntax error, quotation mark was opened but never closed!"
    );
  }

  return entries;
}
exports.parseCSV = parseCSV;

function import_(data, setRaw, setSite, setPassword)
{
  return Promise.resolve().then(() =>
  {
    // Quick sanity check, does this file have the right header?
    if (!data.trim().startsWith(header + "\n"))
      throw "unknown-data-format";

    let mergeActions = [];

    let seenSites = new Set();
    let entries;
    try
    {
      entries = parseCSV(decodeHTMLEntities(data));
    }
    catch (e)
    {
      throw "unknown-data-format";
    }
    for (let i = 1; i < entries.length; i++)
    {
      let [url, username, password, extra, name, grouping, fav] = entries[i];
      let entry = {};

      let site;
      if (url == "http://sn")
      {
        // Secure notes with no associated webpage are given the special URL of
        // "http://sn" by LastPass.
        site = "easypasswords.invalid";
      }
      else
      {
        // The url field is optional for LastPass entries and isn't validated.
        // FIXME - Perhaps we should use .host rather than hostname?
        let hostname = parseURL(url || name).hostname;
        if (hostname)
        {
          // FIXME - Duplicated from _normalizeSite in passwords.js, since we
          //         don't want a circular dependency.
          if (hostname.substr(0, 4) == "www.")
            hostname = hostname.substr(4);
          site = hostname;
        }
        else
        {
          // FIXME - Do we really want to import bogus hostnames?!
          site = url || name;
        }
      }

      // For secure notes with no associated username or password let's reuse
      // their name.
      if (!username && name && extra && !password)
        username = name;

      if (!seenSites.has(site))
      {
        mergeActions.push(setSite({site}));
        seenSites.add(site);
      }

      if (extra || password)
      {
        let entry = {site, type: "stored", name: username};

        if (extra)
          entry.notes = extra;
        if (password)
          entry.password = password;

        mergeActions.push(setPassword(entry));
      }
    }
    return Promise.all(mergeActions);
  });
}
exports.import = import_;
