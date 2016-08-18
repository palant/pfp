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
  this._deriveKey = false;
  this._deriveBits = false;
  this._encrypt = false;
  this._decrypt = false;
  for (let usage of usages)
  {
    if (usage == "deriveKey")
      this._deriveKey = true;
    else if (usage == "deriveBits")
      this._deriveBits = true;
    else if (usage == "encrypt")
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
      if (algo != "PBKDF2")
        throw new Error("Unexpected algorithm");
      if (extractable)
        throw new Error("Extractable keys not supported");

      return new Key(keyData, algo, usages);
    });
  },

  deriveBits: function(algo, masterKey, bits)
  {
    return Promise.resolve().then(() =>
    {
      if (algo.name != "PBKDF2" && algo.hash != "SHA-1")
        throw new Error("Unexpected algorithm");
      if (masterKey._algo != "PBKDF2" || !masterKey._deriveBits)
        throw new Error("Master key not suitable for bit derivation");

      let data = crypto.pbkdf2Sync(masterKey._data, algo.salt, algo.iterations,
                                   Math.ceil(bits / 8), "sha1");
      return new Buffer(data, "binary");
    });
  },

  deriveKey: function(algo, masterKey, derivedKeyAlgo, extractable, keyUsages)
  {
    return Promise.resolve().then(() =>
    {
      if (algo.name != "PBKDF2" && algo.hash != "SHA-1")
        throw new Error("Unexpected algorithm");
      if (masterKey._algo != "PBKDF2" || !masterKey._deriveKey)
        throw new Error("Master key not suitable for key derivation");
      if (derivedKeyAlgo.name != "AES-CBC")
        throw new Error("Unexpected derived key algorithm");
      if (extractable)
        throw new Error("Extractable keys not supported");

      let data = crypto.pbkdf2Sync(masterKey._data, algo.salt, algo.iterations,
                                   Math.ceil(derivedKeyAlgo.length / 8), "sha1");
      return new Key(data, derivedKeyAlgo.name, keyUsages);
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
