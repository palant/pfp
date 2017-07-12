/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

/* global window */

// Debugging - Edge won't let us see errors during startup, log them.
window.loggedErrors = [];
window.onerror = function(...args)
{
  window.loggedErrors.push(args);
};

// TextEncoder and TextDecoder are unsupported in Edge
if (typeof window.TextEncoder == "undefined")
{
  window.TextEncoder = function(encoding)
  {
    if (encoding != "utf-8")
      throw new Error("Unsupported encoding");
  };
  window.TextEncoder.prototype = {
    encode: function(str)
    {
      let bytes = [];
      let encoded = window.encodeURIComponent(str);
      for (let i = 0; i < encoded.length; i++)
      {
        if (encoded[i] == "%")
        {
          bytes.push(parseInt(encoded.substr(i + 1, 2), 16));
          i += 2;
        }
        else
          bytes.push(encoded.charCodeAt(i));
      }
      return Uint8Array.from(bytes);
    }
  };
}

if (typeof window.TextDecoder == "undefined")
{
  window.TextDecoder = function(encoding)
  {
    if (encoding != "utf-8")
      throw new Error("Unsupported encoding");
  };
  window.TextDecoder.prototype = {
    decode: function(buffer)
    {
      let array = new Uint8Array(buffer);
      let bytes = [];
      for (let i = 0; i < array.length; i++)
        bytes.push((array[i] < 16 ? "%0" : "%") + array[i].toString(16));
      return window.decodeURIComponent(bytes.join(""));
    }
  };
}
