/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

const header = "url,username,password,extra,name,grouping,fav";

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
              "Line " + currentLine + ": Wrong number of values for entry " +
              currentEntry.length + ", expecting " + expectedValueCount + "."
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

  return entries;
}

/* Parse a string containing the contents of a Lastpass CSV export.
 * If it doesn't look like a Lastpass CSV then we return null, but if it does
 * but there are problems we'll throw an exception.
 * @fileContents {string}
 * @return {?Object}
 */
function parseLastpassCSV(fileContents)
{
  // Quick sanity check, does this file have the right header?
  if (!fileContents.trim().startsWith(header + "\n"))
    return null;

  // FIXME - We need to decode HTML entities like &amp;, what's the best way?

  let data = {
    application: "easypasswords",
    format: 1,
    sites: {}
  };

  let entries = parseCSV(fileContents);
  for (let i = 1; i < entries.length; i++)
  {
    let [url, username, password, extra, name, grouping, fav] = entries[i];

    let domain;
    try
    {
      // FIXME - Perhaps we should rather use .host?
      domain = new URL(url || "https://easypasswords.invalid").hostname;
    }
    catch (e)
    {
      // FIXME - What should we do in this situation? Lastpass seems to allow
      //         anything to be typed in the URL field...
      throw new Error(
        "Could not import entry for invalid URL " + url
      );
    }

    if (!(domain in data.sites))
      data.sites[domain] = {passwords: {}};

    // FIXME - What should we do about it if the Lastpass data has two passwords
    //         for the same domain + user combo?!
    if (username in data.sites[domain])
    {
      throw new Error(
        "Multiple records for domain: " + domain + ", user: " + username + "."
      );
    }

    // FIXME - The name field isn't supported by Easy Passwords but we
    //         can't simply just drop it, since it's pretty important...
    let passwordEntry = {name};

    if (password.length)
    {
      passwordEntry.type = "stored";
      passwordEntry.password = password;
    }
    if (extra.length)
      passwordEntry.notes =  extra;

    // FIXME - What about the grouping field?

    // FIXME - The username is not given for secure notes which aren't
    //         associated with password. What should we use instead?
    data.sites[domain][username] = passwordEntry;
  }

  return data;
}

exports.parseLastpassCSV = parseLastpassCSV;
