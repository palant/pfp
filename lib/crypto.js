/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

/* global crypto, TextEncoder, TextDecoder, atob, btoa, Worker */

const NUM_ITERATIONS = 256 * 1024;
const AES_KEY_SIZE = 256;

// I, l, O, 0, 1 excluded because of potential confusion. ", ', \ excluded
// because of common bugs in web interfaces (magic quotes).
const LOWERCASE = "abcdefghjkmnpqrstuvwxyz";
const UPPERCASE = "ABCDEFGHJKMNPQRSTUVWXYZ";
const NUMBER = "23456789";
const SYMBOL = "!#$%&()*+,-./:;<=>?@[]^_{|}~";

let encoder = new TextEncoder("utf-8");
let decoder = new TextDecoder("utf-8");

function deriveBitsFallback(password, salt, length)
{
  return new Promise((resolve, reject) =>
  {
    let worker = new Worker(require("runtime").getDataURL("pbkdf2.js"));
    worker.addEventListener("message", ({data: result}) =>
    {
      resolve(result);
    });
    worker.addEventListener("error", () =>
    {
      reject("worker-error");
    });
    worker.postMessage({
      password: encoder.encode(password),
      // Reserve 4 bytes at the end of the salt, PBKDF2 will need them
      salt: encoder.encode(salt + "    "),
      iterations: NUM_ITERATIONS,
      length: length
    });
  });
}

function deriveKeyFallback(password, salt, usage)
{
  return deriveBitsFallback(password, salt, AES_KEY_SIZE / 8).then(buffer =>
  {
    return crypto.subtle.importKey(
      "raw",
      buffer,
      "AES-CBC",
      false,
      [usage]
    );
  });
}

exports.derivePassword = function(params)
{
  if (params.domain == "" && params.name == "")
  {
    // This is a master password, generate random name
    let buffer = new Uint8Array(8);
    crypto.getRandomValues(buffer);
    params.name = toBase64(buffer);
  }

  let salt = params.domain + "\0" + params.name;
  if (params.revision)
    salt += "\0" + params.revision;

  return Promise.resolve().then(() =>
  {
    return crypto.subtle.importKey(
      "raw",
      encoder.encode(params.masterPassword),
      "PBKDF2",
      false,
      ["deriveBits"]
    );
  }).then(masterKey =>
  {
    return crypto.subtle.deriveBits(
      {
        "name": "PBKDF2",
        "salt": encoder.encode(salt),
        "iterations": NUM_ITERATIONS,
        // SHA-256 won't work, see https://bugzilla.mozilla.org/show_bug.cgi?id=554827
        "hash": "SHA-1"
      },
      masterKey,
      params.length * 8
    );
  }).catch(e =>
  {
    // Edge supports WebCrypto but not PBKDF2, fall back to our worker.
    return deriveBitsFallback(params.masterPassword, salt, params.length);
  }).then(buffer =>
  {
    return [toPassword(buffer, params.lower, params.upper, params.number, params.symbol), params.name];
  });
};

exports.encryptPassword = function(params)
{
  let salt = params.domain + "\0" + params.name;
  return Promise.resolve().then(() =>
  {
    return crypto.subtle.importKey(
      "raw",
      encoder.encode(params.masterPassword),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
  }).then(masterKey =>
  {
    return crypto.subtle.deriveKey(
      {
        "name": "PBKDF2",
        "salt": encoder.encode(salt),
        "iterations": NUM_ITERATIONS,
        // SHA-256 won't work, see https://bugzilla.mozilla.org/show_bug.cgi?id=554827
        "hash": "SHA-1"
      },
      masterKey,
      {"name": "AES-CBC", "length": AES_KEY_SIZE},
      false,
      ["encrypt"]
    );
  }).catch(e =>
  {
    // Edge supports WebCrypto but not PBKDF2, fall back to our worker.
    return deriveKeyFallback(params.masterPassword, salt, "encrypt");
  }).then(key =>
  {
    let initializationVector = new Uint8Array(16);
    crypto.getRandomValues(initializationVector);

    return Promise.all([initializationVector, crypto.subtle.encrypt(
      {"name": "AES-CBC", iv: initializationVector},
      key,
      encoder.encode(params.password)
    )]);
  }).then(([initializationVector, buffer]) =>
  {
    let array = new Uint8Array(buffer);
    let result = [];
    for (let i = 0; i < array.length; i++)
      result.push(String.fromCharCode(array[i]));

    return toBase64(initializationVector) + "_" + toBase64(buffer);
  });
};

exports.decryptPassword = function(params)
{
  let salt = params.domain + "\0" + params.name;
  return Promise.resolve().then(() =>
  {
    return crypto.subtle.importKey(
      "raw",
      encoder.encode(params.masterPassword),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
  }).then(masterKey =>
  {
    return crypto.subtle.deriveKey(
      {
        "name": "PBKDF2",
        "salt": encoder.encode(salt),
        "iterations": NUM_ITERATIONS,
        // SHA-256 won't work, see https://bugzilla.mozilla.org/show_bug.cgi?id=554827
        "hash": "SHA-1"
      },
      masterKey,
      {"name": "AES-CBC", "length": AES_KEY_SIZE},
      false,
      ["decrypt"]
    );
  }).catch(e =>
  {
    // Edge supports WebCrypto but not PBKDF2, fall back to our worker.
    return deriveKeyFallback(params.masterPassword, salt, "decrypt");
  }).then(key =>
  {
    let [initializationVector, password] = params.encrypted.split("_", 2).map(fromBase64);

    return crypto.subtle.decrypt(
      {"name": "AES-CBC", iv: initializationVector},
      key,
      password
    );
  }).then(buffer =>
  {
    return decoder.decode(buffer);
  });
};

function toPassword(buffer, lower, upper, number, symbol)
{
  let array = new Uint8Array(buffer);

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

function toBase64(buffer)
{
  let array = new Uint8Array(buffer);
  let result = [];
  for (let i = 0; i < array.length; i++)
    result.push(String.fromCharCode(array[i]));

  return btoa(result.join(""));
}

function fromBase64(string)
{
  let decoded = atob(string);
  let result = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i++)
    result[i] = decoded.charCodeAt(i);

  return result;
}
