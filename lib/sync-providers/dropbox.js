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

// We shouldn't need to fake fetch() with XMLHttpRequest here but due to
// https://crbug.com/784528 accessing response headers isn't currently possibl
// otherwise.
function fetch(url, options)
{
  return new Promise((resolve, reject) =>
  {
    let request = new XMLHttpRequest();
    request.open(options.method || "GET", url);
    request.responseType = "text";
    request.withCredentials = false;
    if (options.headers)
      for (let key of Object.keys(options.headers))
        request.setRequestHeader(key, options.headers[key]);

    request.addEventListener("load", event =>
    {
      let {status} = request;
      if (status >= 200 && status <= 299)
      {
        resolve({
          text: request.response,
          headers: {
            get(header)
            {
              return request.getResponseHeader(header);
            }
          }
        });
      }
      else
      {
        try
        {
          reject(JSON.parse(request.response).error_summary.replace(/\/\.*$/, ""));
        }
        catch (e)
        {
          reject(new Error(`Unexpected server response: ${status} ${request.statusText}`));
        }
      }
    });

    request.addEventListener("error", event =>
    {
      reject("sync_connection_error");
    });

    request.send(options.body || null);
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
    headers: {
      "Authorization": `Bearer ${token}`,
      "Dropbox-API-Arg": JSON.stringify({path})
    }
  }).then(response =>
  {
    let metadata = response.headers.get("Dropbox-API-Result");
    if (!metadata)
      throw "malformed_response";

    metadata = JSON.parse(metadata);
    if (!metadata.rev)
      throw "malformed_response";

    return {
      revision: metadata.rev,
      contents: response.text
    };
  }).catch(error =>
  {
    if (error == "path/not_found")
      return null;
    else if (error == "invalid_access_token")
      throw "sync_invalid_token";
    else if (typeof error == "string" && error != "sync_connection_error")
      throw new Error(`Unexpected error: ${error}`);
    else
      throw error;
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
    body: contents
  }).catch(error =>
  {
    if (error == "path/conflict/file")
      throw "sync_wrong_revision";
    else if (error == "invalid_access_token")
      throw "sync_invalid_token";
    else if (typeof error == "string" && error != "sync_connection_error")
      throw new Error(`Unexpected error: ${error}`);
    else
      throw error;
  });
};
