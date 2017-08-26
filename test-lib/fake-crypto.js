/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let crypto = require("crypto");

function Key(keyData, algo, usages)
{
  this._data = keyData;
  this._algo = algo;
  this._encrypt = false;
  this._decrypt = false;
  this._sign = false;
  for (let usage of usages)
  {
    if (usage == "encrypt")
      this._encrypt = true;
    else if (usage == "decrypt")
      this._decrypt = true;
    else if (usage == "sign")
      this._sign = true;
    else
      throw new Error("Unexpected key usage");
  }
}

exports.getRandomValues = function(buf)
{
  if (buf.BYTES_PER_ELEMENT != 1)
    throw new Error("Parameter doesn't appear to be an Uint8Array.");
  let bytes = require("crypto").randomBytes(buf.length);
  buf.set(bytes);
};

function getEncryptionPrefix(algoName, key, iv)
{
  return Buffer.concat([
    Buffer.from(algoName, "utf-8"),
    Buffer.from("!", "utf-8"),
    Buffer.from(key._data),
    Buffer.from("!", "utf-8"),
    Buffer.from(iv),
    Buffer.from("!", "utf-8")
  ]);
}

exports.subtle = {
  importKey: function(format, keyData, algo, extractable, usages)
  {
    return Promise.resolve().then(() =>
    {
      if (format != "raw")
        throw new Error("Unexpected data format");
      if (extractable)
        throw new Error("Extractable keys not supported");

      if (typeof algo == "object")
        algo = algo.name;
      return new Key(keyData, algo, usages);
    });
  },

  encrypt: function(algo, key, cleartext)
  {
    return Promise.resolve().then(() =>
    {
      if (key._algo != algo.name)
        throw new Error("Key algorithm doesn't match encryption algorithm");
      if (!key._encrypt)
        throw new Error("Key not suitable for encryption");

      return Buffer.concat([getEncryptionPrefix(algo.name, key, algo.iv), Buffer.from(cleartext)]);
    });
  },

  decrypt: function(algo, key, ciphertext)
  {
    return Promise.resolve().then(() =>
    {
      if (key._algo != algo.name)
        throw new Error("Key algorithm doesn't match decryption algorithm");
      if (!key._decrypt)
        throw new Error("Key not suitable for decryption");

      let prefix = getEncryptionPrefix(algo.name, key, algo.iv);
      ciphertext = Buffer.from(ciphertext);
      if (ciphertext.compare(prefix, 0, prefix.length, 0, prefix.length) != 0)
        throw new Error("Ciphertext encrypted with wrong algorithm");

      return ciphertext.slice(prefix.length);
    });
  },

  sign: function(algo, key, cleartext)
  {
    return Promise.resolve().then(() =>
    {
      if (algo != "HMAC")
        throw new Error("Unexpected signing algorithm");
      if (key._algo != algo)
        throw new Error("Key algorithm doesn't match signing algorithm");
      if (!key._sign)
        throw new Error("Key not suitable for signing");

      return Buffer.concat([
        Buffer.from(algo, "utf-8"),
        Buffer.from("!", "utf-8"),
        Buffer.from(key._data),
        Buffer.from("!", "utf-8"),
        Buffer.from(cleartext)
      ]);
    });
  }
};
