/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import {nativeRequest} from "./protocol.js";

const blockSize = 14;
const version = 2;
const versionSize = 1;
const ivSize = 12;
const tagSize = 16;

let encoder = new TextEncoder();
let decoder = new TextDecoder();

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

function toBase32(buffer)
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

function fromBase32(str)
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

async function encryptPassword(password, keyArray)
{
  let initializationVector = new Uint8Array(ivSize);
  crypto.getRandomValues(initializationVector);

  let key = await crypto.subtle.importKey(
    "raw", keyArray, "AES-GCM", false, ["encrypt"]
  );

  let ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: initializationVector,
      tagLength: tagSize * 8
    },
    key,
    encoder.encode(password)
  );

  return [initializationVector, new Uint8Array(ciphertext)];
}

async function decryptPassword(ciphertext, initializationVector, keyArray)
{
  let key = await crypto.subtle.importKey(
    "raw", keyArray, "AES-GCM", false, ["decrypt"]
  );

  let plaintext;
  try
  {
    plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: initializationVector,
        tagLength: tagSize * 8
      },
      key,
      ciphertext
    );
  }
  catch (error)
  {
    throw "invalid_password";
  }

  return decoder.decode(plaintext);
}

export async function getCode(password, kdfParams, key)
{
  kdfParams = fromBase64(kdfParams);

  // Zero-pad passwords to fill up the row (don't allow deducing password
  // length from size of encrypted data)
  let passwordLen = encoder.encode(password).length;
  while ((versionSize + kdfParams.length + ivSize + tagSize + passwordLen) % blockSize)
  {
    password += "\0";
    passwordLen++;
  }

  let [iv, ciphertext] = await encryptPassword(password, fromBase64(key));
  if (ciphertext.length != passwordLen + tagSize)
    throw new Error("Unexpected: ciphertext length isn't increased by tag size");

  let versionBuf = new Uint8Array(versionSize);
  versionBuf[0] = version;

  // We add one checksum byte to each block (output row)
  let dataLen = versionBuf.length + kdfParams.length + iv.length + ciphertext.length;
  let blocks = Math.ceil(dataLen / blockSize);
  let buffer = new Uint8Array(dataLen + blocks);
  let pos = 0;
  let blockIndex = 0;
  for (let input of [versionBuf, kdfParams, iv, ciphertext])
  {
    for (let i = 0; i < input.length; i++)
    {
      buffer[pos++] = input[i];
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
  let buffer = fromBase32(recoveryCode);
  if (buffer.length % (blockSize + 1))
    return "invalid_length";

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
}

export async function decodeCode(recoveryCode, password)
{
  let validationResult = isValid(recoveryCode);
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

  let {key, bytes_consumed} = await nativeRequest("derive-key", {
    password,
    kdf_parameters: toBase64(buffer.slice(pos))
  });
  pos += bytes_consumed;

  if (buffer.length < pos + ivSize + tagSize)
    throw new Error("Unexpected: too little data");

  let iv = buffer.slice(pos, pos += ivSize);
  let ciphertext = buffer.slice(pos);

  let decoded = await decryptPassword(ciphertext, iv, fromBase64(key));
  return decoded.replace(/\0+$/, "");
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
