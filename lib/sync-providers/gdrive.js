/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let ui = require("../ui");

let endpoints = {
  "auth": "https://accounts.google.com/o/oauth2/v2/auth",
  "token": "https://www.googleapis.com/oauth2/v4/token",
  "files": "https://www.googleapis.com/drive/v2/files",
  "upload": "https://www.googleapis.com/upload/drive/v2/files"
};
let clientId = "413724158571-0d0fqalv9vupfvhd5oo2j7q6ti2jr8vq.apps.googleusercontent.com";
let redirectUri = "http://localhost:37602/";

function getEndPoint(name, params)
{
  let result = endpoints[name];
  if (params)
  {
    let query = [];
    for (let key of Object.keys(params))
      query.push(encodeURIComponent(key) + "=" + encodeURIComponent(params[key]));
    result = result + "?" + query.join("&");
  }
  return result;
}

function handleError(response)
{
  return response.text().then(data =>
  {
    try
    {
      let parsed = JSON.parse(data);
      let code = parsed.error.errors.map(e => e.reason).join("/");
      if (code == "authError")
        return Promise.reject("sync_invalid_token");
      else if (code == "conditionNotMet")
        return Promise.reject("sync_wrong_revision");
      else
      {
        let message = parsed.error.errors.map(e => e.message).join(", ");
        return Promise.reject(new Error(`Unexpected server error: ${message}`));
      }
    }
    catch (e)
    {
      // Not a JSON response or unexpected data, ignore
    }
    return Promise.reject(new Error(`Unexpected server response: ${response.status} ${response.statusText}`));
  });
}

function getAccessToken(refreshToken)
{
  let data = new URLSearchParams();
  data.append("refresh_token", refreshToken);
  data.append("client_id", clientId);
  data.append("grant_type", "refresh_token");
  return fetch(getEndPoint("token"), {
    method: "POST",
    body: data.toString(),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    }
  }).then(response =>
  {
    if (!response.ok)
      return handleError(response);
    return response.json();
  }).then(data =>
  {
    if (!data.access_token)
      throw "malformed_response";

    return data.access_token;
  });
}

exports.authorize = function()
{
  let url = getEndPoint("auth", {
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "https://www.googleapis.com/auth/drive.appdata",
    access_type: "offline"
  });

  return ui.openAndWait(url, redirectUri).then(url =>
  {
    let params = new URL(url).search;
    if (!params)
      throw "malformed_response";

    let response = {};
    for (let pair of params.substr(1).split("&"))
    {
      let [key, value] = pair.split("=", 2).map(s => decodeURIComponent(s));
      response[key] = value;
    }

    if (!response.code)
      throw "malformed_response";

    return exports.processAuthCode(response.code, redirectUri);
  });
};

exports.getManualAuthURL = function()
{
  return getEndPoint("auth", {
    response_type: "code",
    client_id: clientId,
    redirect_uri: "urn:ietf:wg:oauth:2.0:oob",
    scope: "https://www.googleapis.com/auth/drive.appdata",
    access_type: "offline"
  });
};

exports.processAuthCode = function(code, redirectUri)
{
  let data = new URLSearchParams();
  data.append("code", code);
  data.append("client_id", clientId);
  data.append("redirect_uri", redirectUri || "urn:ietf:wg:oauth:2.0:oob");
  data.append("grant_type", "authorization_code");
  return fetch(getEndPoint("token"), {
    method: "POST",
    body: data.toString(),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    }
  }).then(response =>
  {
    if (!response.ok)
      return handleError(response);
    return response.json();
  }).then(data =>
  {
    if (!data.refresh_token)
      throw "malformed_response";

    return data.refresh_token;
  });
};

exports.get = function(path, token)
{
  if (path.startsWith("/"))
    path = path.substr(1);

  return getAccessToken(token).then(accessToken =>
  {
    let url = getEndPoint("files", {
      q: `title='${path}' and 'appdata' in parents`
    });
    return fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }).then(response =>
    {
      if (!response.ok)
        return handleError(response);
      return response.json();
    }).then(data =>
    {
      let files = data.items.filter(file => file.appDataContents && !file.labels.trashed);
      if (files.length == 0)
        return null;

      if (files.length != 1)
        throw "sync_multiple_candidates";

      let file = files[0];
      let url = `${getEndPoint("files")}/${file.id}?alt=media`;
      return fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }).then(response =>
      {
        if (!response.ok)
          return handleError(response);
        return response.text();
      }).then(contents =>
      {
        return {revision: [file.id, file.etag], contents};
      });
    });
  });
};

exports.put = function(path, contents, replaceRevision, token)
{
  if (path.startsWith("/"))
    path = path.substr(1);

  return getAccessToken(token).then(accessToken =>
  {
    if (replaceRevision)
    {
      let [id, etag] = replaceRevision;
      let url = `${getEndPoint("upload")}/${id}?uploadType=media`;
      return fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "If-Match": etag
        },
        body: contents
      }).then(response =>
      {
        if (!response.ok)
          return handleError(response);
        return Promise.resolve();
      });
    }
    else
    {
      let url = getEndPoint("upload", {
        uploadType: "multipart"
      });

      let data = new FormData();
      data.append("metadata", new Blob([JSON.stringify({
        title: path,
        parents: [{id: "appdata"}]
      })], {type: "application/json"}));
      data.append("media", new Blob([contents], {type: "application/octet-stream"}));

      return fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        body: data
      }).then(response =>
      {
        if (!response.ok)
          return handleError(response);
        return Promise.resolve();
      });
    }
  });
};
