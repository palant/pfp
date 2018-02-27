/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

const dummyToken = String(Math.random()).substr(2);

let files = {};

exports.changeRevisionOnGet = 0;

exports._get = function(path)
{
  return files[path];
};

exports._set = function(path, revision, contents)
{
  files[path] = {revision, contents};
};

exports._reset = function()
{
  files = {};
  exports.changeRevisionOnGet = 0;
};

exports.authorize = function()
{
  return Promise.resolve(dummyToken);
};

exports.get = function(path, token)
{
  if (token != dummyToken)
    return Promise.reject("sync_invalid_token");

  if (!path.startsWith("/"))
    return Promise.reject("sync_invalid_path");

  return Promise.resolve(files.hasOwnProperty(path) ? files[path] : null).then(result =>
  {
    if (result)
      result = Object.assign({}, result);
    if (result && exports.changeRevisionOnGet > 0)
    {
      files[path].revision++;
      exports.changeRevisionOnGet--;
    }
    return result;
  });
};

exports.put = function(path, contents, replaceRevision, token)
{
  if (token != dummyToken)
    return Promise.reject("sync_invalid_token");

  if (!path.startsWith("/"))
    return Promise.reject("sync_invalid_path");

  let currentRevision = files.hasOwnProperty(path) ? files[path].revision : null;
  if (currentRevision !== replaceRevision)
    return Promise.reject("sync_wrong_revision");

  let revision = currentRevision ? String(parseInt(currentRevision, 10) + 1) : "1";
  return Promise.resolve().then(() =>
  {
    files[path] = {revision, contents};
  });
};
