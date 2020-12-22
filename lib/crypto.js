/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import browser from "./browserAPI.js";

const AES_KEY_SIZE = 256;

// I, l, O, 0, 1 excluded because of potential confusion. ", ', \ excluded
// because of common bugs in web interfaces (magic quotes).
const LOWERCASE = "abcdefghjkmnpqrstuvwxyz";
const UPPERCASE = "ABCDEFGHJKMNPQRSTUVWXYZ";
const NUMBER = "23456789";
const SYMBOL = "!#$%&()*+,-./:;<=>?@[]^_{|}~";

let encoder = new TextEncoder("utf-8");
let decoder = new TextDecoder("utf-8");

let maxJobId = 0;
export let scryptWorker = null;

export function deriveBits(password, salt, length)
{
  return new Promise((resolve, reject) =>
  {
    if (!scryptWorker)
      scryptWorker = new Worker(browser.runtime.getURL("worker/scrypt.js"));

    let currentJobId = ++maxJobId;
    let messageCallback = ({data: {jobId, result}}) =>
    {
      if (jobId != currentJobId)
        return;
      cleanup();
      resolve(result);
    };
    let errorCallback = () =>
    {
      cleanup();

      // The worker is probably in a bad state, create a new one next time.
      scryptWorker = null;

      reject("worker-error");
    };
    let cleanup = () =>
    {
      scryptWorker.removeEventListener("message", messageCallback);
      scryptWorker.removeEventListener("error", errorCallback);
    };

    scryptWorker.addEventListener("message", messageCallback);
    scryptWorker.addEventListener("error", errorCallback);
    scryptWorker.postMessage({
      jobId: currentJobId,
      password: encoder.encode(password),
      salt: encoder.encode(salt),
      length: parseInt(length, 10)
    });
  });
}

export async function derivePassword({masterPassword, domain, name, revision, length, lower, upper, number, symbol})
{
  let salt = domain + "\0" + name;
  if (revision)
    salt += "\0" + revision;

  let array = await deriveBits(masterPassword, salt, length);
  return toPassword(array, lower, upper, number, symbol);
}

export async function deriveKey({masterPassword, salt})
{
  let array = await deriveBits(masterPassword, atob(salt), AES_KEY_SIZE / 8);
  let key = await crypto.subtle.importKey(
    "raw", array, "AES-GCM", false, ["encrypt", "decrypt"]
  );
  return key;
}

export async function encryptData(key, plaintext)
{
  let initializationVector = new Uint8Array(12);
  crypto.getRandomValues(initializationVector);

  let buffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: initializationVector,
      tagLength: 128
    },
    key,
    encoder.encode(plaintext)
  );

  return toBase64(initializationVector) + "_" + toBase64(buffer);
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

export function generateRandom(length)
{
  let array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return toBase64(array);
}

export async function importHmacSecret(rawSecret)
{
  let key = await crypto.subtle.importKey(
    "raw",
    fromBase64(rawSecret),
    {name: "HMAC", hash: "SHA-256"},
    false,
    ["sign"]
  );
  return key;
}

export async function getDigest(hmacSecret, data)
{
  let signature = await crypto.subtle.sign(
    {name: "HMAC", hash: "SHA-256"},
    hmacSecret,
    encoder.encode(data)
  );
  return toBase64(signature);
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

let pearsonHashPermutations = null;

export function pearsonHash(buffer, start, len, virtualByte)
{
  if (!pearsonHashPermutations)
  {
    pearsonHashPermutations = new Array(256);
    for (let i = 0; i < pearsonHashPermutations.length; i++)
      pearsonHashPermutations[i] = ((i + 379) * 467) & 0xFF;
  }

  let hash = pearsonHashPermutations[virtualByte];
  for (let i = start; i < start + len; i++)
    hash = pearsonHashPermutations[hash ^ buffer[i]];
  return hash;
}

export function toBase64(buffer)
{
  let array = new Uint8Array(buffer);
  let result = [];
  for (let i = 0; i < array.length; i++)
    result.push(String.fromCharCode(array[i]));

  return btoa(result.join(""));
}

export function fromBase64(string)
{
  let decoded = atob(string);
  let result = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i++)
    result[i] = decoded.charCodeAt(i);

  return result;
}

// Our Base32 variant follows RFC 4648 but uses a custom alphabet to remove
// ambiguous characters: 0, 1, O, I.
export const base32Alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function toBase32(buffer)
{
  let pos = 0;
  let current = 0;
  let currentBits = 0;
  let result = [];
  while (pos < buffer.length || currentBits >= 5)
  {
    if (currentBits < 5)
    {
      current = (current << 8) | buffer[pos++];
      currentBits += 8;
    }

    let remainder = currentBits - 5;
    result.push(base32Alphabet[current >> remainder]);
    current &= ~(31 << remainder);
    currentBits = remainder;
  }

  // Our input is always padded, so there should never be data left here
  if (currentBits)
    throw new Error("Unexpected: length of data encoded to base32 has to be a multiple of five");

  return result.join("");
}

export function fromBase32(str)
{
  str = str.replace(new RegExp(`[^${base32Alphabet}]`, "g"), "").toUpperCase();
  if (str.length % 8)
    throw new Error("Unexpected: length of data decoded from base32 has to be a multiple of eight");

  let mapping = new Map();
  for (let i = 0; i < base32Alphabet.length; i++)
    mapping.set(base32Alphabet[i], i);

  let pos = 0;
  let current = 0;
  let currentBits = 0;
  let result = new Uint8Array(str.length / 8 * 5);
  for (let i = 0; i < str.length; i++)
  {
    current = (current << 5) | mapping.get(str[i]);
    currentBits += 5;
    if (currentBits >= 8)
    {
      let remainder = currentBits - 8;
      result[pos++] = current >> remainder;
      current &= ~(31 << remainder);
      currentBits = remainder;
    }
  }
  return result;
}
