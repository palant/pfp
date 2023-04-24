/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import scryptModule from "@stablelib/scrypt";
const scryptHasher = new scryptModule.Scrypt(32768, 8, 1);

const AES_KEY_SIZE = 256;

// I, l, O, 0, 1 excluded because of potential confusion. ", ', \ excluded
// because of common bugs in web interfaces (magic quotes).
const LOWERCASE = "abcdefghjkmnpqrstuvwxyz";
const UPPERCASE = "ABCDEFGHJKMNPQRSTUVWXYZ";
const NUMBER = "23456789";
const SYMBOL = "!#$%&()*+,-./:;<=>?@[]^_{|}~";

let encoder = new TextEncoder();
let decoder = new TextDecoder();

export function deriveBits(password, salt, length)
{
  return scryptHasher.deriveKey(
    encoder.encode(password),
    encoder.encode(salt),
    parseInt(length, 10)
  );
}

export function derivePassword({mainPassword, domain, name, revision, length, lower, upper, number, symbol})
{
  let salt = domain + "\0" + name;
  if (revision)
    salt += "\0" + revision;

  let array = deriveBits(mainPassword, salt, length);
  return toPassword(array, lower, upper, number, symbol);
}

export async function deriveKey({mainPassword, salt})
{
  let array = deriveBits(mainPassword, atob(salt), AES_KEY_SIZE / 8);
  let key = await crypto.subtle.importKey(
    "raw", array, "AES-GCM", false, ["decrypt"]
  );
  return key;
}

export async function decryptData(key, ciphertext)
{
  let [initializationVector, data] = ciphertext.split("_", 2).map(fromBase64);

  let buffer = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: initializationVector,
      tagLength: 128
    },
    key,
    data
  );
  return decoder.decode(buffer);
}

function toPassword(array, lower, upper, number, symbol)
{
  let charsets = [];
  if (lower)
    charsets.push(LOWERCASE);
  if (upper)
    charsets.push(UPPERCASE);
  if (number)
    charsets.push(NUMBER);
  if (symbol)
    charsets.push(SYMBOL);

  let lengthSum = (previous, current) => previous + current.length;
  let numChars = charsets.reduce(lengthSum, 0);
  let seen = new Set();

  let result = [];
  for (let i = 0; i < array.length; i++)
  {
    if (charsets.length - seen.size >= array.length - i)
    {
      for (let value of seen.values())
      {
        let index = charsets.indexOf(value);
        if (index >= 0)
          charsets.splice(index, 1);
      }
      seen.clear();
      numChars = charsets.reduce(lengthSum, 0);
    }

    let index = array[i] % numChars;
    for (let charset of charsets)
    {
      if (index < charset.length)
      {
        result.push(charset[index]);
        seen.add(charset);
        break;
      }
      index -= charset.length;
    }
  }
  return result.join("");
}

export function fromBase64(string)
{
  let decoded = atob(string);
  let result = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i++)
    result[i] = decoded.charCodeAt(i);

  return result;
}
