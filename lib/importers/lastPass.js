/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

/* global URL */

function parseCSV(fileContents)
{
  const header = "url,username,password,extra,name,grouping,fav";
  const headerFields = header.split(",");

  fileContents = fileContents.trim();

  // Ensure we've got UNIX style line endings
  fileContents = fileContents.replace(/\r\n/g, "\n");

  // Quick sanity check, does this file have the right header?
  if (!fileContents.startsWith(header + "\n"))
    throw "unknown-data-format";

  // Decode any HTML entities.
  // Note: If the Lastpass binary component is installed the CSV file is saved
  // directly, otherwise the contents are displayed in the browser for the user
  // to save manually. It seems that the "&", "<" and ">" characters are only
  // HTML encoded when the user saves the contents manually, we assume that's
  // the case here, but if not any passwords or notes containing HTML encoded
  // versions of those characters will be corrupted.
  fileContents = fileContents.replace(/&lt;/ig, "<")
                             .replace(/&gt;/ig, ">")
                             .replace(/&amp;/ig, "&");
  fileContents += "\n";

  let entries = [];
  let currentEntry = [];
  let currentValue = "";
  let currentlyQuoted = false;
  let currentLine = 0;

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
          if (currentEntry.length != headerFields.length)
          {
            // FIXME - How to localise?
            throw "csv-wrong-number-of-values";
            // [currentLine, currentEntry.length, headerFields.length]
          }

          let entry = {};
          for (let j = 0; j < headerFields.length; j++)
            entry[headerFields[j]] = currentEntry[j];
          entries.push(entry);
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
    // FIXME - How to localise?
    throw "csv-unclosed-quote";
  }

  return entries;
}
exports.parseCSV = parseCSV;

function import_(data, setRaw, setSite, setPassword)
{
  return Promise.resolve().then(() =>
  {
    let mergeActions = [];

    let seenSites = new Set();
    let entries = parseCSV(data);
    for (let {url, username, password, extra, name} of entries)
    {
      let site;
      if (url == "http://sn")
      {
        // Secure notes with no associated webpage are given the special URL of
        // "http://sn" by LastPass.
        site = "easypasswords.invalid";
      }
      else
      {
        try
        {
          site = new URL(url).hostname;
        }
        catch (e)
        {
        }

        // The url field is optional for LastPass entries and isn't validated.
        // Sometimes the default name LastPass uses actually is the hostname,
        // so let's try to reuse that.
        if (!site && name.includes(".") && !/[\s\/]/.test(name))
          site = name;

        if (site)
        {
          // FIXME - Duplicated from _normalizeSite in passwords.js
          // Remove trailing dots
          if (site[site.length - 1] == ".")
            site = site.substr(0, site.length - 1);

          // Remove www. prefix
          if (site.substr(0, 4) == "www.")
            site = site.substr(4);
        }
        else
        {
          // FIXME - Should be localised and shown to the user afterwards as
          //         a warning.
          // throw "skipped-entry-missing-url", [name];
          continue;
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
        let entry = {site, type: "stored", name: username, password};
        if (extra)
          entry.notes = extra;
        mergeActions.push(setPassword(entry));
      }
    }
    return Promise.all(mergeActions);
  });
}
exports.import = import_;
