/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

// This regexp has been generated by generateVowelsRegexp.js
const vowelRegexp = /[AEIOUaeiouªºÀ-ÆÈ-ÏÒ-ÖÙ-Üà-æè-ïò-öù-üĀ-ąĒ-ěĨ-İĲĳŌ-őŨ-ųƠơƯưǍ-ǜǞ-ǣǪ-ǭǺ-ǽȀ-ȏȔ-ȗȦ-ȱΆΈ-ΊΌΎ-ΑΕΗΙΟΥΩ-αεηιουω-ώϒ-ϔϵЀЁЄІЇЍЎАЕИЙОУЫЭ-аеийоуыэ-ёєіїѝўӐ-ӓӖӗӢ-ӧӬ-ӳӸӹᴬᴭᴱᴵᴼᵁᵃᵉᵒᵘᵢᵤḀḁḔ-ḝḬ-ḯṌ-ṓṲ-ṻẚẠ-ựἀ-ἕἘ-Ἕἠ-ὅὈ-Ὅὐ-ὗὙὛὝὟ-ώᾀ-ᾴᾶ-ᾼιῂ-ῄῆ-ῌῐ-ΐῖ-Ίῠ-ΰῦ-Ύῲ-ῴῶ-ῼⁱₐ-ₒℐℑΩÅℯℰℴℹⅇⅈﬁﬃＡＥＩＯＵａｅｉｏ]/;
const digitRegexp = /\d/;
const fallbackKeys = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";

const isLetter = (function()
{
  try
  {
    let regexp = new RegExp("\\p{Letter}", "u");
    return char => regexp.test(char);
  }
  catch (e)
  {
    // Fallback if Unicode property escapes aren't supported
    return char => char.toLowerCase() != char || char.toUpperCase() != char;
  }
})();

function isDigit(char)
{
  return digitRegexp.test(char);
}

function isUpperCase(char)
{
  return char == char.toUpperCase() && !isDigit(char);
}

function isConsonant(char)
{
  return !vowelRegexp.test(char) && !isDigit(char);
}

let accessKeys = null;
let accessKeyElements = null;
let observer = null;

function onKeyDown(event)
{
  if (!accessKeys && event.key == "Alt" && !event.ctrlKey && !event.metaKey)
    showHints();
  else if (accessKeys && event.altKey && !event.ctrlKey && !event.metaKey)
    triggerHint(event);
  else if (accessKeys && !event.altKey)
    hideHints();
}

function onKeyUp(event)
{
  if (!event.altKey)
    hideHints();
}

function onBlur(event)
{
  if (event.eventPhase == Event.AT_TARGET)
    hideHints();
}

function showHints()
{
  let elements = [];
  let root = document.querySelector(".modalOverlay") || document;
  for (let element of root.querySelectorAll("button,select,label,a"))
  {
    if (element.hasAttribute("data-noaccesskey"))
      continue;

    if (element.classList.contains("tab"))
      elements.push([0, element.title.trim(), element]);
    else if (element.localName == "button")
      elements.push([1, element.textContent.trim(), element]);
    else if (element.localName == "select")
    {
      if ((element.labels && element.labels.length) || !element.options.length)
        continue;
      elements.push([2, element.options[0].textContent.trim(), element]);
    }
    else if (element.localName != "a")
      elements.push([2, element.textContent.trim(), element]);
    else if (!element.classList.contains("iconic-link"))
      elements.push([3, element.textContent.trim() || element.title.trim(), element]);
    else
      elements.push([4, element.textContent.trim() || element.title.trim(), element]);
  }

  elements.sort((a, b) => a[0] - b[0]);

  accessKeys = new Map();

  function findAccessKey(text, element, ...selectors)
  {
    let letters = [];
    for (let i = 0; i < text.length; i++)
      if (!letters.includes(text[i]) && (isLetter(text[i]) || isDigit(text[i])))
        letters.push(text[i]);

    for (let selector of selectors)
    {
      for (let letter of letters)
      {
        if (selector(letter) && !accessKeys.has(letter.toUpperCase()))
        {
          accessKeys.set(letter.toUpperCase(), element);
          return true;
        }
      }
    }
    return false;
  }

  let needFallback = [];
  for (let [, text, element] of elements)
    if (!findAccessKey(text, element, isUpperCase, isConsonant, isLetter, () => true))
      needFallback.push(element);

  for (let element of needFallback)
  {
    for (let i = 0; i < fallbackKeys.length; i++)
    {
      if (!accessKeys.has(fallbackKeys[i]))
      {
        accessKeys.set(fallbackKeys[i], element);
        break;
      }
    }
  }

  accessKeyElements = [];
  for (let [letter, element] of accessKeys)
  {
    let found = false;
    for (let child = element.firstChild; child; child = child.nextSibling)
    {
      if (child.nodeType == Node.TEXT_NODE)
      {
        let text = child.nodeValue;
        let index = text.indexOf(letter);
        if (index < 0)
          index = text.indexOf(letter.toLowerCase());
        if (index >= 0)
        {
          found = true;
          let replacements = [];
          if (index > 0)
            replacements.push(document.createTextNode(text.substr(0, index)));

          let span = document.createElement("span");
          span.className = "accessKeyMarker";
          span.textContent = text.substr(index, 1);
          replacements.push(span);
          accessKeyElements.push(span);

          if (index + 1 < text.length)
          {
            let textEnd = text.substr(index + 1);
            // Make sure whitespace after the marker isn’t collapsed
            textEnd = textEnd.replace(/^ /, "\xA0");
            replacements.push(document.createTextNode(textEnd));
          }

          element.replaceChild(replacements[0], child);
          let insertionPoint = replacements[0].nextSibling;
          for (let i = 1; i < replacements.length; i++)
            element.insertBefore(replacements[i], insertionPoint);
          break;
        }
      }
    }

    if (!found)
    {
      let hint = document.createElement("div");
      hint.className = "accessKeyHint";
      hint.textContent = letter;
      element.parentNode.appendChild(hint);
      hint.style.left = (element.offsetLeft + (element.offsetWidth - hint.offsetWidth) / 2) + "px";
      hint.style.top = (element.offsetTop + (element.offsetHeight - hint.offsetHeight) / 2) + "px";
      accessKeyElements.push(hint);
    }
  }

  observer = new MutationObserver(hideHints);
  observer.observe(document, {
    childList: true,
    attributes: true,
    subtree: true
  });
}

function hideHints()
{
  if (!accessKeys)
    return;

  accessKeys = null;
  if (accessKeyElements)
  {
    for (let element of accessKeyElements)
    {
      if (!element.parentNode)
        continue;

      if (element.localName == "span")
      {
        let text = "";
        if (element.previousSibling && element.previousSibling.nodeType == Node.TEXT_NODE)
        {
          text += element.previousSibling.nodeValue;
          element.parentNode.removeChild(element.previousSibling);
        }
        text += element.textContent;
        if (element.nextSibling && element.nextSibling.nodeType == Node.TEXT_NODE)
        {
          text += element.nextSibling.nodeValue.replace(/^\xA0/, " ");
          element.parentNode.removeChild(element.nextSibling);
        }
        element.parentNode.replaceChild(document.createTextNode(text), element);
      }
      else
        element.parentNode.removeChild(element);
    }
  }
  accessKeyElements = null;

  if (observer)
    observer.disconnect();
  observer = null;
}

function triggerHint(event)
{
  let element = accessKeys.get(event.key.toUpperCase());
  if (element)
  {
    event.preventDefault();
    if (element.localName == "label" && element.hasAttribute("for"))
    {
      let target = document.getElementById(element.getAttribute("for"));
      target.focus();
      target.click();
    }
    else
    {
      element.focus();
      element.click();
    }
  }
}

export default {
  install()
  {
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("blur", onBlur, true);
  }
};
