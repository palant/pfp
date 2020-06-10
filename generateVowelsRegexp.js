#!/usr/bin/env node

/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import https from "https";

// Only Latin, Greek and Cyrillic vowels for now, derivations of those will
// be determined below.
const baseVowels = "AEIOUÆ" + "ΑΕΗΙΟΥΩ" + "АЕЄИІОУЫЭЮЯ";

function download(url)
{
  return new Promise((resolve, reject) =>
  {
    let request = https.get(url, response =>
    {
      if (response.statusCode != 200)
      {
        reject(new Error("Unexpected status code: " + response.statusCode));
        response.resume();
        return;
      }

      let data = "";
      response.on("data", chunk =>
      {
        data += chunk;
      });
      response.on("end", () =>
      {
        resolve(data);
      });
    });
    request.on("error", error => reject(new Error(error.message)));
  });
}

function formatRange([start, end])
{
  if (start == end)
    return String.fromCharCode(start);
  else if (start + 1 == end)
    return String.fromCharCode(start, end);
  else
    return String.fromCharCode(start) + "-" + String.fromCharCode(end);
}

download("https://unicode.org/Public/UNIDATA/UnicodeData.txt").then(data =>
{
  data = data.trim().split(/[\r\n]+/).map(line => line.split(";"));

  let vowels = new Set();
  for (let i = 0; i < baseVowels.length; i++)
  {
    vowels.add(baseVowels.charCodeAt(i));
    vowels.add(baseVowels.charAt(i).toLowerCase().charCodeAt(0));
  }

  let changed;
  do
  {
    changed = false;
    for (let [code, name, category, , , decomposition] of data)
    {
      if (!category.startsWith("L") || code.length > 4 || vowels.has(parseInt(code, 16)) || !decomposition)
        continue;

      if (decomposition.split(/\s+/).some(code => vowels.has(parseInt(code, 16))))
      {
        vowels.add(parseInt(code, 16));
        changed = true;
      }
    }
  } while (changed);

  vowels = [...vowels.keys()];
  vowels.sort((a, b) => a - b);

  let result = "/[";
  let currentRange = [vowels[0], vowels[0] - 1];
  for (let vowel of vowels)
  {
    if (vowel == currentRange[1] + 1)
      currentRange[1] = vowel;
    else
    {
      result += formatRange(currentRange);
      currentRange = [vowel, vowel];
    }
  }
  result += "]/";
  console.log(result);
}).catch(e => console.error(e));
