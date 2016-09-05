/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {setSubmitHandler} = require("./events");
let {$, getActivePanel, setActivePanel} = require("./utils");

let originalSelection = null;

setSubmitHandler("qrcode", () =>
{
  if (originalSelection)
    setActivePanel(originalSelection);
});

function show(text)
{
  originalSelection = getActivePanel();

  let qr = new (require("jsqr"))();

  let code = new qr.Code();
  code.encodeMode = code.ENCODE_MODE.BYTE;
  code.version = code.DEFAULT;
  code.errorCorrection = code.ERROR_CORRECTION.M;

  let input = new qr.Input();
  input.dataType = input.DATA_TYPE.TEXT;
  input.data = text;

  let matrix = new qr.Matrix(input, code);
  matrix.margin = 0;

  let canvas = $("qrcode-canvas");
  canvas.setAttribute("width", matrix.pixelWidth);
  canvas.setAttribute("height", matrix.pixelWidth);
  matrix.draw(canvas, 0, 0);

  setActivePanel("qrcode");
}
exports.show = show;
