/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let crypto = require("crypto");

function Key(keyData, algo, usages)
{
  this._data = new Buffer(keyData);
  this._algo = algo;
  this._encrypt = false;
  this._decrypt = false;
  for (let usage of usages)
  {
    if (usage == "encrypt")
      this._encrypt = true;
    else if (usage == "decrypt")
      this._decrypt = true;
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

exports.subtle = {
  importKey: function(format, keyData, algo, extractable, usages)
  {
    return Promise.resolve().then(() =>
    {
      if (format != "raw")
        throw new Error("Unexpected data format");
      if (algo != "AES-CBC")
        throw new Error("Unexpected algorithm");
      if (extractable)
        throw new Error("Extractable keys not supported");

      return new Key(keyData, algo, usages);
    });
  },

  encrypt: function(algo, key, cleartext)
  {
    return Promise.resolve().then(() =>
    {
      if (algo.name != "AES-CBC")
        throw new Error("Unexpected algorithm");
      if (key._algo != "AES-CBC" || !key._encrypt)
        throw new Error("Key not suitable for encryption");

      let algoName = "aes-" + (key._data.length * 8) + "-cbc";
      let cipher = crypto.createCipheriv(algoName, key._data, algo.iv);
      return Buffer.concat([cipher.update(cleartext), cipher.final()]);
    });
  },

  decrypt: function(algo, key, ciphertext)
  {
    return Promise.resolve().then(() =>
    {
      if (algo.name != "AES-CBC")
        throw new Error("Unexpected algorithm");
      if (key._algo != "AES-CBC" || !key._decrypt)
        throw new Error("Key not suitable for decryption");

      let algoName = "aes-" + (key._data.length * 8) + "-cbc";
      let decipher = crypto.createDecipheriv(algoName, key._data, algo.iv);
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    });
  }
};
