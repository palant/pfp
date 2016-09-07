/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

function clone(value)
{
  return JSON.parse(JSON.stringify(value));
}

let data = {};
exports.data = data;

exports.get = function(name)
{
  return new Promise((resolve, reject) =>
  {
    if (data.hasOwnProperty(name))
      resolve(clone(data[name]));
    else
      resolve(null);
  });
};

exports.getAllByPrefix = function(prefix)
{
  return new Promise((resolve, reject) =>
  {
    let result = {};
    for (let key of Object.getOwnPropertyNames(data))
      if (key.substr(0, prefix.length) == prefix)
        result[key.substr(prefix.length)] = data[key];
    resolve(result);
  });
};

exports.set = function(name, value)
{
  return new Promise((resolve, reject) =>
  {
    data[name] = clone(value);
    resolve();
  });
};

exports.delete = function(name)
{
  return new Promise((resolve, reject) =>
  {
    if (data.hasOwnProperty(name))
    {
      delete data[name];
      resolve();
    }
    else
      reject(new Error("No such key"));
  });
};

exports.deleteByPrefix = function(prefix)
{
  return new Promise((resolve, reject) =>
  {
    let result = {};
    for (let key of Object.getOwnPropertyNames(data))
      if (key.substr(0, prefix.length) == prefix)
        delete data[key];
    resolve();
  });
}
