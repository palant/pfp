/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

/* global Task */

const NUM_ITERATIONS = 256*1024;

// I, l, O, 0, 1 excluded because of potential confusion. ", ', \ excluded
// because of common bugs in web interfaces (magic quotes).
const LOWERCASE = "abcdefghjkmnpqrstuvwxyz";
const UPPERCASE = "ABCDEFGHJKMNPQRSTUVWXYZ";
const NUMBER = "23456789";
const SYMBOL = "!#$%&()*+,-./:;<=>?@[]^_{|}~";

let encoder = new TextEncoder("utf-8");
let decoder = new TextDecoder("utf-8");

function derivePassword(params, callback)
{
  Task.spawn(function*()
  {
    if (params.domain == "" && params.name == "")
    {
      // This is a master password, generate random name
      let buffer = new Uint8Array(8);
      crypto.getRandomValues(buffer);
      params.name = toBase64(buffer);
    }

    let masterKey = yield crypto.subtle.importKey(
      "raw",
      encoder.encode(params.masterPassword),
      {"name": "PBKDF2"},
      false,
      ["deriveBits"]
    );

    let buffer = yield crypto.subtle.deriveBits(
      {
        "name": "PBKDF2",
        "salt": encoder.encode(params.domain + "\0" + params.name),
        "iterations": NUM_ITERATIONS,
        // SHA-256 won't work, see https://bugzilla.mozilla.org/show_bug.cgi?id=554827
        "hash": "SHA-1"
      },
      masterKey,
      params.length * 8
    );

    return [toPassword(buffer, params.lower, params.upper, params.number, params.symbol), params.name];
  }).then(callback);
}

function encryptPassword(params, callback)
{
  Task.spawn(function*()
  {
    let masterKey = yield crypto.subtle.importKey(
      "raw",
      encoder.encode(params.masterPassword),
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    let key = yield crypto.subtle.deriveKey(
      {
        "name": "PBKDF2",
        "salt": encoder.encode(params.domain + "\0" + params.name),
        "iterations": NUM_ITERATIONS,
        // SHA-256 won't work, see https://bugzilla.mozilla.org/show_bug.cgi?id=554827
        "hash": "SHA-1"
      },
      masterKey,
      {"name": "AES-CBC", "length": 256},
      false,
      ["encrypt"]
    );

    let initializationVector = new Uint8Array(16);
    crypto.getRandomValues(initializationVector);

    let buffer = yield crypto.subtle.encrypt(
      {"name": "AES-CBC", iv: initializationVector},
      key,
      encoder.encode(params.password)
    );

    let array = new Uint8Array(buffer);
    let result = [];
    for (let i = 0; i < array.length; i++)
      result.push(String.fromCharCode(array[i]));

    return toBase64(initializationVector) + "_" + toBase64(buffer);
  }).then(callback);
}

function decryptPassword(params, callback)
{
  Task.spawn(function*()
  {
    let masterKey = yield crypto.subtle.importKey(
      "raw",
      encoder.encode(params.masterPassword),
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    let key = yield crypto.subtle.deriveKey(
      {
        "name": "PBKDF2",
        "salt": encoder.encode(params.domain + "\0" + params.name),
        "iterations": NUM_ITERATIONS,
        // SHA-256 won't work, see https://bugzilla.mozilla.org/show_bug.cgi?id=554827
        "hash": "SHA-1"
      },
      masterKey,
      {"name": "AES-CBC", "length": 256},
      false,
      ["decrypt"]
    );

    let [initializationVector, password] = params.encrypted.split("_", 2).map(fromBase64);

    let buffer = yield crypto.subtle.decrypt(
      {"name": "AES-CBC", iv: initializationVector},
      key,
      password
    );

    return decoder.decode(buffer);
  }).then(callback);
}

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
