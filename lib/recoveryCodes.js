/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import {
  base32Alphabet, pearsonHash, fromBase32, toBase32, toBase64
} from "./crypto";
import {getPassword} from "./passwords";
import {getSalt, deriveKeyWithPassword} from "./masterPassword";
import {encrypt, decrypt} from "./storage";

const blockSize = 14;
const version = 1;
const versionSize = 1;
const saltSize = 16;
const ivSize = 12;
const tagSize = 16;

export function getValidChars()
{
  return base32Alphabet;
}

export function getCode(passwordData)
{
  return Promise.resolve().then(() =>
  {
    return getPassword(passwordData);
  }).then(password =>
  {
    // Zero-pad passwords to fill up the row (don't allow deducing password
    // length from size of encrypted data)
    let passwordLen = new TextEncoder("utf-8").encode(password).length;
    while ((versionSize + saltSize + ivSize + tagSize + passwordLen) % blockSize)
    {
      password += "\0";
      passwordLen++;
    }

    return Promise.all([
      getSalt(),
      encrypt(password, undefined, false),
      passwordLen
    ]);
  }).then(([salt, encrypted, passwordLen]) =>
  {
    let [iv, ciphertext] = encrypted.split("_", 2);
    if (typeof ciphertext != "string")
      throw new Error("Unexpected: couldn't find IV in encrypted password");

    let versionStr = String.fromCharCode(version);
    [salt, iv, ciphertext] = [salt, iv, ciphertext].map(atob);
    if (salt.length != saltSize)
      throw new Error("Unexpected: salt length isn't 16");
    if (iv.length != ivSize)
      throw new Error("Unexpected: IV length isn't 12");
    if (ciphertext.length != passwordLen + tagSize)
      throw new Error("Unexpected: ciphertext length isn't increased by tag size");

    // We add one checksum byte to each block (output row)
    let dataLen = versionStr.length + salt.length + iv.length + ciphertext.length;
    let blocks = Math.ceil(dataLen / blockSize);
    let buffer = new Uint8Array(dataLen + blocks);
    let pos = 0;
    let blockIndex = 0;
    for (let string of [versionStr, salt, iv, ciphertext])
    {
      for (let i = 0; i < string.length; i++)
      {
        buffer[pos++] = string.charCodeAt(i);
        if (pos % (blockSize + 1) == blockSize)
        {
          let blockStart = pos - blockSize;
          let virtualByte = blockIndex++;
          if (virtualByte == blocks - 1)
          {
            // Indicate final row
            virtualByte = 255 - virtualByte;
          }

          buffer[pos] = pearsonHash(buffer, blockStart, blockSize, virtualByte);
          pos++;
        }
      }
    }

    // Convert the data to Base32 and add separators
    return formatCode(toBase32(buffer));
  });
}

export function formatCode(recoveryCode)
{
  return recoveryCode.replace(new RegExp(`[^${base32Alphabet}]`, "gi"), "")
                     .replace(/\w{24}/g, "$&\n")
                     .replace(/\w{12}(?=\w)/g, "$&:")
                     .replace(/\w{4}(?=\w)/g, "$&-");
}

export function isValid(recoveryCode)
{
  return Promise.resolve().then(() =>
  {
    let buffer = fromBase32(recoveryCode);
    if (buffer.length % (blockSize + 1))
      return "invalid-length";

    let blocks = buffer.length / (blockSize + 1);
    for (let i = 0; i < blocks; i++)
    {
      let blockStart = i * (blockSize + 1);
      if (i == blocks - 1 && buffer[blockStart + blockSize] == pearsonHash(buffer, blockStart, blockSize, 255 - i))
        return "ok";
      if (buffer[blockStart + blockSize] != pearsonHash(buffer, blockStart, blockSize, i))
        return "checksum_mismatch";
    }

    return "unterminated";
  });
}

export function decodeCode(recoveryCode)
{
  return Promise.resolve().then(() =>
  {
    return isValid(recoveryCode);
  }).then(validationResult =>
  {
    if (validationResult != "ok")
      throw validationResult;

    // isRecoveryCodeValid already validated the checksums, remove them.
    let buffer = fromBase32(recoveryCode);
    let withoutChecksums = new Uint8Array(buffer.length / (blockSize + 1) * blockSize);
    for (let i = 0, j = 0; i < buffer.length; i++)
      if ((i + 1) % (blockSize + 1) != 0)
        withoutChecksums[j++] = buffer[i];
    buffer = withoutChecksums;

    let pos = 0;
    if (buffer[pos] != version)
      throw "wrong_version";
    pos += versionSize;

    if (buffer.length < versionSize + saltSize + ivSize + tagSize)
      throw new Error("Unexpected: too little data");

    let salt = toBase64(buffer.slice(pos, pos += saltSize));
    let iv = toBase64(buffer.slice(pos, pos += ivSize));
    let ciphertext = toBase64(buffer.slice(pos));

    return Promise.all([
      `${iv}_${ciphertext}`,
      deriveKeyWithPassword(salt)
    ]);
  }).then(([encrypted, key]) =>
  {
    return decrypt(encrypted, key, false);
  }).then(decoded =>
  {
    return decoded.replace(/\0+$/, "");
  });
}
