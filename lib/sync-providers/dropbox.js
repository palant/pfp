/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let ui = require("../ui");

let baseUri = {
  "main": "https://www.dropbox.com/",
  "content": "https://content.dropboxapi.com/2/"
};
let clientId = "mah5dtksdflznfc";
let redirectUri = "https://0.0.0.0/";

function getEndPoint(type, name, params)
{
  let result = baseUri[type] + name;
  if (params)
  {
    let query = [];
    for (let key of Object.keys(params))
      query.push(encodeURIComponent(key) + "=" + encodeURIComponent(params[key]));
    result = result + "?" + query.join("&");
  }
  return result;
}

function getErrorCode(response)
{
  return response.json().then(data =>
  {
    if (data && typeof data.error_summary == "string")
      return data.error_summary.replace(/\/\.*$/, "");
    else
      return null;
  }).catch(error =>
  {
    // Server response might be plain text, ignore JSON parsing errors
    return null;
  });
}

exports.authorize = function()
{
  let url = getEndPoint("main", "oauth2/authorize", {
    response_type: "token",
    client_id: clientId,
    redirect_uri: redirectUri
  });

  return ui.openAndWait(url, redirectUri).then(url =>
  {
    let hash = new URL(url).hash;
    if (!hash)
      throw "malformed_response";

    let response = {};
    for (let pair of hash.substr(1).split("&"))
    {
      let [key, value] = pair.split("=", 2).map(s => decodeURIComponent(s));
      response[key] = value;
    }

    if (response.token_type != "bearer" || !response.access_token)
      throw "malformed_response";

    return response.access_token;
  });
};

exports.get = function(path, token)
{
  return fetch(getEndPoint("content", "files/download"), {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Dropbox-API-Arg": JSON.stringify({path})
    },
    credentials: "omit",
    cache: "no-cache",
    redirect: "follow"
  }).then(response =>
  {
    if (!response.ok)
    {
      return getErrorCode(response).then(error =>
      {
        if (error == "path/not_found")
          return null;
        else if (error == "invalid_access_token")
          throw "sync_invalid_token";
        else if (error)
          throw new Error(`Unexpected error: ${error}`);
        else
          throw new Error(`Unexpected server response: ${response.status} ${response.statusText}`);
      });
    }

    if (!response.headers.has("Dropbox-API-Result"))
      throw "malformed_response";

    let metadata = JSON.parse(response.headers.get("Dropbox-API-Result"));
    if (!metadata.rev)
      throw "malformed_response";

    return response.text().then(contents =>
    {
      return {
        revision: metadata.rev,
        contents
      };
    });
  });
};

exports.put = function(path, contents, replaceRevision, token)
{
  let mode = replaceRevision ? {
    ".tag": "update",
    "update": replaceRevision
  } : "add";

  return fetch(getEndPoint("content", "files/upload"), {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Dropbox-API-Arg": JSON.stringify({path, mode, mute: true}),
      "Content-Type": "application/octet-stream"
    },
    body: contents,
    credentials: "omit",
    cache: "no-cache",
    redirect: "follow"
  }).then(response =>
  {
    if (!response.ok)
    {
      return getErrorCode(response).then(error =>
      {
        if (error == "path/conflict/file")
          throw "sync_wrong_revision";
        else if (error == "invalid_access_token")
          throw "sync_invalid_token";
        else if (error)
          throw new Error(`Unexpected error: ${error}`);
        else
          throw new Error(`Unexpected server response: ${response.status} ${response.statusText}`);
      });
    }

    return undefined;
  });
};
