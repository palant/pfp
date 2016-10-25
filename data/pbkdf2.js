/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

/* global exports */

// We expand += intentionally to improve Chrome performance
/* eslint operator-assignment: "off" */

const DIGEST_LENGTH = 20;
const BLOCK_SIZE = 64;

let hasher = (function()
{
  let heap = new ArrayBuffer(0x10000);
  let maxPaddedChunkLength = BLOCK_SIZE * 2;
  let input = new Int32Array(heap, 0, maxPaddedChunkLength >> 2);
  let state = new Int32Array(heap, maxPaddedChunkLength + 320, 5);
  let {hash} = RushaCore({Int32Array}, {}, heap);

  /**
   * Initializes the current state, this should be called when the processing
   * starts.
   */
  function initState()
  {
    state[0] = 1732584193;
    state[1] = -271733879;
    state[2] = -1732584194;
    state[3] = 271733878;
    state[4] = -1009589776;
  }

  /**
   * Writes the result of the hash calculation into an array.
   * @param {Uint8Array} outarray
   *   20 bytes array to write the result into
   */
  function getResult(outarray)
  {
    let view = new DataView(outarray.buffer);
    view.setInt32(0, state[0], false);
    view.setInt32(4, state[1], false);
    view.setInt32(8, state[2], false);
    view.setInt32(12, state[3], false);
    view.setInt32(16, state[4], false);
  }

  /**
   * Pads the chunk currently in processing, should be called before
   * processing the last message block.
   * @param {number} chunkLength
   *   length of the current chunk
   * @param {number} messageLength
   *   overall length of the message
   */
  function padData(chunkLength, messageLength)
  {
    let paddedLength = BLOCK_SIZE;
    if (chunkLength + 9 >= BLOCK_SIZE)
      paddedLength = BLOCK_SIZE * 2;

    for (let i = (chunkLength + 3) - (chunkLength + 3) % 4; i < BLOCK_SIZE - 8; i = i + 4)
      input[i >> 2] = 0;
    input[chunkLength >> 2] ^= 0x80 << (24 - (chunkLength % 4 << 3));

    input[paddedLength - 8 >> 2] = messageLength >>> 29;
    input[paddedLength - 4 >> 2] = messageLength << 3;
    return paddedLength;
  }

  /**
   * Takes the state of a previous hashing operation as input data. This
   * function assumes that this will be the last chunk and pads it. It also
   * assumes that there was a block of data preceding it (typical for HMAC).
   */
  function inputFromState(state)
  {
    input[0] = state[0];
    input[1] = state[1];
    input[2] = state[2];
    input[3] = state[3];
    input[4] = state[4];

    let chunkLength = state.length << 2;
    return padData(chunkLength, BLOCK_SIZE + chunkLength);
  }

  /**
   * Takes a typed array as input data.
   * @param {Uint8Array} array
   *   Typed array containing the data
   * @param {number} offset
   *   Offset of the data in the array
   * @param {number} length
   *   Size of the data, cannot be larger than BLOCK_SIZE
   */
  function inputFromArray(array, offset, length)
  {
    let view = new DataView(array.buffer, array.byteOffset + offset, length);
    let pos = 0;
    for (; pos + 3 < length; pos = pos + 4)
      input[pos >> 2] = view.getInt32(pos, false);

    let remaining = length % 4;
    if (remaining)
    {
      input[pos >> 2] = array[offset + pos] << 24 |
                        array[offset + pos + 1] << 16 |
                        array[offset + pos + 2] << 8;
    }
  }

  /**
   * Pre-processes a single block of data and returns the resulting state,
   * allowing to calculate hashes efficiently for different inputs sharing the
   * same first block.
   * @param {Uint8Array} array
   *   Typed array containing the data, must have size BLOCK_SIZE
   * @return {Int32Array}
   *   Copy of the hasher state the operation resulted into
   */
  function preprocessBlock(array)
  {
    initState();
    inputFromArray(array, 0, BLOCK_SIZE);
    hash(BLOCK_SIZE, maxPaddedChunkLength);
    return new Int32Array(hasher.state);
  }

  /**
   * Takes the current hasher state as the input and hashes it on top of a
   * pre-processed block of data represented by the parameter.
   * @param {Int32Array}
   *   Result of a previous preprocessBlock call
   */
  function hashCurrentState(initialState)
  {
    let chunkLength = inputFromState(state);
    state.set(initialState);
    hash(chunkLength, maxPaddedChunkLength);
  }

  /**
   * Hashes an arbitrary-length array with data.
   * @param {Uint8Array} array
   *   Typed array containing the data
   * @param {Int32Array} [initialState]
   *   Result of a previous preprocessBlock call, if omitted the operation
   *   starts with a clean state.
   */
  function hashArray(array, initialState)
  {
    let messageLength = array.length;
    if (initialState)
    {
      messageLength += BLOCK_SIZE;
      hasher.state.set(initialState);
    }
    else
      initState();

    let offset = 0;
    for (; array.length > offset + BLOCK_SIZE; offset = offset + BLOCK_SIZE)
    {
      inputFromArray(array, offset, BLOCK_SIZE);
      hash(BLOCK_SIZE, maxPaddedChunkLength);
    }

    let remaining = array.length - offset;
    inputFromArray(array, offset, remaining);
    hash(padData(remaining, messageLength), maxPaddedChunkLength);
  }

  return {
    state,
    getResult,
    preprocessBlock,
    hashCurrentState,
    hashArray
  };
})();

function prepareKey(password)
{
  // HMAC doesn't use the key directly, it rather zero-pads it to BLOCK_SIZE
  // and xors all bytes with a constant (0x36 for the inner key and 0x5x for
  // the outer one). We can prepare both key variants so that this operation
  // won't need to be repeated - and also feed them to SHA1 already since they
  // will always be the first block of the hashing operation.
  let ikey = new Uint8Array(BLOCK_SIZE);
  if (password.length > BLOCK_SIZE)
  {
    hasher.hashArray(password);
    hasher.getResult(ikey);
  }
  else
    ikey.set(password);

  let okey = Uint8Array.from(ikey);
  for (let i = 0; i < BLOCK_SIZE; i++)
  {
    ikey[i] ^= 0x36;
    okey[i] ^= 0x5c;
  }

  return [hasher.preprocessBlock(ikey), hasher.preprocessBlock(okey)];
}

function pbkdf2(password, salt, iterations, length)
{
  length |= 0;

  let [ikey, okey] = prepareKey(password);
  let numChunks = Math.ceil(length / DIGEST_LENGTH);
  let result = new Int32Array(numChunks * DIGEST_LENGTH >>> 2);
  let offset = 0;

  for (let i = 1; i <= numChunks; i++)
  {
    // First iteration works on the and i as 32-bit big-endian number.
    salt[salt.length - 4] = (i >>> 24) & 0xFF;
    salt[salt.length - 3] = (i >>> 16) & 0xFF;
    salt[salt.length - 2] = (i >>> 8) & 0xFF;
    salt[salt.length - 1] = (i >>> 0) & 0xFF;

    // First HMAC operation processes the salt, slightly more complicated
    // because the salt's length is arbitrary.
    hasher.hashArray(salt, ikey);
    hasher.hashCurrentState(okey);
    result.set(hasher.state, offset);

    // Subsequent iterations work on the result of the previous iteration.
    for (let j = 1; j < iterations; j++)
    {
      // Subsequent HMAC operations always operate on the state of the previous
      // operation preceded by the inner/outer key, we can take some shortcuts
      // here.
      hasher.hashCurrentState(ikey);
      hasher.hashCurrentState(okey);
      for (let k = 0; k < hasher.state.length; k++)
        result[offset + k] ^= hasher.state[k];
    }

    offset += DIGEST_LENGTH >> 2;
  }

  // Convert result to big-endian
  let view = new DataView(result.buffer);
  for (let i = 0; i < result.length; i++)
    view.setInt32(i << 2, result[i], false);

  return new Uint8Array(result.buffer, 0, length);
}

if (typeof exports == "undefined")
{
  self.onmessage = function({data: {password, salt, iterations, length}})
  {
    self.postMessage(pbkdf2(password, salt, iterations, length).buffer);
  };
}
else
{
  // Allow importing as module, for unit tests.
  exports.pbkdf2 = pbkdf2;
}

// The following snippet is taken from rusha 0.8.4:
// https://github.com/srijs/rusha/blob/v0.8.4/rusha.js#L307

/* eslint-disable */

/*
 * Rusha, a JavaScript implementation of the Secure Hash Algorithm, SHA-1,
 * as defined in FIPS PUB 180-1, tuned for high performance with large inputs.
 * (http://github.com/srijs/rusha)
 *
 * Inspired by Paul Johnstons implementation (http://pajhome.org.uk/crypt/md5).
 *
 * Copyright (c) 2013 Sam Rijs (http://awesam.de).
 * Released under the terms of the MIT license as follows:
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

function RushaCore(stdlib, foreign, heap) {
    'use asm';
    var H = new stdlib.Int32Array(heap);
    function hash(k, x) {
        // k in bytes
        k = k | 0;
        x = x | 0;
        var i = 0, j = 0, y0 = 0, z0 = 0, y1 = 0, z1 = 0, y2 = 0, z2 = 0, y3 = 0, z3 = 0, y4 = 0, z4 = 0, t0 = 0, t1 = 0;
        y0 = H[x + 320 >> 2] | 0;
        y1 = H[x + 324 >> 2] | 0;
        y2 = H[x + 328 >> 2] | 0;
        y3 = H[x + 332 >> 2] | 0;
        y4 = H[x + 336 >> 2] | 0;
        for (i = 0; (i | 0) < (k | 0); i = i + 64 | 0) {
            z0 = y0;
            z1 = y1;
            z2 = y2;
            z3 = y3;
            z4 = y4;
            for (j = 0; (j | 0) < 64; j = j + 4 | 0) {
                t1 = H[i + j >> 2] | 0;
                t0 = ((y0 << 5 | y0 >>> 27) + (y1 & y2 | ~y1 & y3) | 0) + ((t1 + y4 | 0) + 1518500249 | 0) | 0;
                y4 = y3;
                y3 = y2;
                y2 = y1 << 30 | y1 >>> 2;
                y1 = y0;
                y0 = t0;
                H[k + j >> 2] = t1;
            }
            for (j = k + 64 | 0; (j | 0) < (k + 80 | 0); j = j + 4 | 0) {
                t1 = (H[j - 12 >> 2] ^ H[j - 32 >> 2] ^ H[j - 56 >> 2] ^ H[j - 64 >> 2]) << 1 | (H[j - 12 >> 2] ^ H[j - 32 >> 2] ^ H[j - 56 >> 2] ^ H[j - 64 >> 2]) >>> 31;
                t0 = ((y0 << 5 | y0 >>> 27) + (y1 & y2 | ~y1 & y3) | 0) + ((t1 + y4 | 0) + 1518500249 | 0) | 0;
                y4 = y3;
                y3 = y2;
                y2 = y1 << 30 | y1 >>> 2;
                y1 = y0;
                y0 = t0;
                H[j >> 2] = t1;
            }
            for (j = k + 80 | 0; (j | 0) < (k + 160 | 0); j = j + 4 | 0) {
                t1 = (H[j - 12 >> 2] ^ H[j - 32 >> 2] ^ H[j - 56 >> 2] ^ H[j - 64 >> 2]) << 1 | (H[j - 12 >> 2] ^ H[j - 32 >> 2] ^ H[j - 56 >> 2] ^ H[j - 64 >> 2]) >>> 31;
                t0 = ((y0 << 5 | y0 >>> 27) + (y1 ^ y2 ^ y3) | 0) + ((t1 + y4 | 0) + 1859775393 | 0) | 0;
                y4 = y3;
                y3 = y2;
                y2 = y1 << 30 | y1 >>> 2;
                y1 = y0;
                y0 = t0;
                H[j >> 2] = t1;
            }
            for (j = k + 160 | 0; (j | 0) < (k + 240 | 0); j = j + 4 | 0) {
                t1 = (H[j - 12 >> 2] ^ H[j - 32 >> 2] ^ H[j - 56 >> 2] ^ H[j - 64 >> 2]) << 1 | (H[j - 12 >> 2] ^ H[j - 32 >> 2] ^ H[j - 56 >> 2] ^ H[j - 64 >> 2]) >>> 31;
                t0 = ((y0 << 5 | y0 >>> 27) + (y1 & y2 | y1 & y3 | y2 & y3) | 0) + ((t1 + y4 | 0) - 1894007588 | 0) | 0;
                y4 = y3;
                y3 = y2;
                y2 = y1 << 30 | y1 >>> 2;
                y1 = y0;
                y0 = t0;
                H[j >> 2] = t1;
            }
            for (j = k + 240 | 0; (j | 0) < (k + 320 | 0); j = j + 4 | 0) {
                t1 = (H[j - 12 >> 2] ^ H[j - 32 >> 2] ^ H[j - 56 >> 2] ^ H[j - 64 >> 2]) << 1 | (H[j - 12 >> 2] ^ H[j - 32 >> 2] ^ H[j - 56 >> 2] ^ H[j - 64 >> 2]) >>> 31;
                t0 = ((y0 << 5 | y0 >>> 27) + (y1 ^ y2 ^ y3) | 0) + ((t1 + y4 | 0) - 899497514 | 0) | 0;
                y4 = y3;
                y3 = y2;
                y2 = y1 << 30 | y1 >>> 2;
                y1 = y0;
                y0 = t0;
                H[j >> 2] = t1;
            }
            y0 = y0 + z0 | 0;
            y1 = y1 + z1 | 0;
            y2 = y2 + z2 | 0;
            y3 = y3 + z3 | 0;
            y4 = y4 + z4 | 0;
        }
        H[x + 320 >> 2] = y0;
        H[x + 324 >> 2] = y1;
        H[x + 328 >> 2] = y2;
        H[x + 332 >> 2] = y3;
        H[x + 336 >> 2] = y4;
    }
    return { hash: hash };
};
