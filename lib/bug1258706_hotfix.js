/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {gPalette, CustomizableUI} = external.importCustomizableUI();

let listener = {
  onWidgetCreated: function(id)
  {
    // See https://bugzilla.mozilla.org/show_bug.cgi?id=1258706 - we need to
    // remove "chromeclass-toolbar-additional" class from our button. For that
    // we have to wrap widget's default onBuild handler.
    let widget;
    try
    {
      widget = gPalette.get(id);
    }
    catch (e)
    {
      // gPalette is internal API so failure is somewhat expected.
    }
    if (!widget || widget.id != id || typeof widget.onBuild != "function")
      return;

    let origOnBuild = widget.onBuild;
    widget.onBuild = function()
    {
      /* eslint prefer-rest-params: "off" */
      let result = origOnBuild.apply(this, arguments);
      try
      {
        result.classList.remove("chromeclass-toolbar-additional");
      }
      catch (e)
      {
        // This shouldn't happen but if it does we won't mess up anyting by
        // returning the original result.
      }
      return result;
    };
  }
};

function fixButton(buttonCreator)
{
  CustomizableUI.addListener(listener);
  try
  {
    buttonCreator();
  }
  finally
  {
    CustomizableUI.removeListener(listener);
  }
}
exports.fixButton = fixButton;
