/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {i18n} = require("../browserAPI");
let {passwords} = require("../proxy");
let {setResetHandler, setSubmitHandler, setCommandHandler} = require("./events");
let state = require("./state");
let {$, getActivePanel, setActivePanel, showUnknownError} = require("./utils");

let currentRequest = null;
let sites = null;

setSubmitHandler("site-selection", () => done($("site-selection-site").value.trim()));
setResetHandler("site-selection", () => done(null));
setCommandHandler("site-autocomplete", handleAutocompleteClick);
$("site-selection-site").addEventListener("input", findMatchingSites);
$("site-selection-site").addEventListener("keydown", handleKeyDown);

function done(value)
{
  if (!currentRequest)
    return;

  setActivePanel(currentRequest.originalSelection, true);
  if (value)
    currentRequest.resolve(value);
  else
    currentRequest.reject();
  currentRequest = null;
  sites = null;
}

function show(message)
{
  $("site-selection-label").textContent = message;

  let originalSelection = getActivePanel();
  setActivePanel("site-selection");

  $("site-selection-site").value = state.site;
  $("site-selection-site").select();

  passwords.getAllSites().then(allSites =>
  {
    sites = allSites;
    findMatchingSites();
  }).catch(showUnknownError);

  return new Promise((resolve, reject) =>
  {
    currentRequest = {
      resolve, reject, originalSelection
    };
  });
}
exports.show = show;

function findMatchingSites()
{
  let autocompleteBox = $("site-autocomplete");
  while (autocompleteBox.lastChild)
    autocompleteBox.removeChild(autocompleteBox.lastChild);

  let seenResult = false;
  let query = $("site-selection-site").value.trim();
  for (let site of sites)
  {
    let index = site.indexOf(query);
    if (index < 0)
      continue;

    seenResult = true;

    let el = document.createElement("div");
    el.setAttribute("data-site", site);
    if (index > 0)
      el.appendChild(document.createTextNode(site.substr(0, index)));
    if (query)
    {
      el.appendChild(document.createElement("strong"));
      el.lastChild.appendChild(document.createTextNode(query));
    }
    if (index + query.length < site.length)
      el.appendChild(document.createTextNode(site.substr(index + query.length)));
    autocompleteBox.appendChild(el);
  }

  if (!seenResult)
    autocompleteBox.appendChild(document.createTextNode(i18n.getMessage("autocomplete_no_sites")));
}

function handleAutocompleteClick(event)
{
  let target = event.target;
  while (target && target.id != "site-autocomplete" && !target.hasAttribute("data-site"))
    target = target.parentNode;

  if (target.hasAttribute("data-site"))
    done(target.getAttribute("data-site"));
}

function handleKeyDown(event)
{
  if (event.key == "ArrowDown")
  {
    let autocompleteBox = $("site-autocomplete");
    let active = autocompleteBox.querySelector(".active");
    if (active && active.nextSibling)
    {
      active.classList.remove("active");
      active.nextSibling.classList.add("active");
      active.nextSibling.scrollIntoView({block: "nearest"});
    }
    else if (!active && autocompleteBox.firstChild && autocompleteBox.firstChild.hasAttribute("data-site"))
      autocompleteBox.firstChild.classList.add("active");
    event.preventDefault();
  }
  else if (event.key == "ArrowUp")
  {
    let autocompleteBox = $("site-autocomplete");
    let active = autocompleteBox.querySelector(".active");
    if (active)
    {
      active.classList.remove("active");
      if (active.previousSibling)
      {
        active.previousSibling.classList.add("active");
        active.previousSibling.scrollIntoView({block: "nearest"});
      }
    }
    event.preventDefault();
  }
  else if (event.key == "Enter")
  {
    let autocompleteBox = $("site-autocomplete");
    let active = autocompleteBox.querySelector(".active");
    if (active)
    {
      done(active.getAttribute("data-site"));
      event.preventDefault();
    }
  }
}
