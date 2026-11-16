// jsdoc (used by docgen) calls util.is*() helpers that were removed in Node 23+. Restore them for docs builds only.
const u=require('util');
if(!u.isRegExp)u.isRegExp=o=>Object.prototype.toString.call(o)==='[object RegExp]';
if(!u.isDate)u.isDate=o=>Object.prototype.toString.call(o)==='[object Date]';
if(!u.isArray)u.isArray=Array.isArray;
if(!u.isFunction)u.isFunction=o=>typeof o==='function';
if(!u.isObject)u.isObject=o=>o!==null&&typeof o==='object';
if(!u.isString)u.isString=o=>typeof o==='string';
if(!u.isUndefined)u.isUndefined=o=>o===undefined;
if(!u.isNull)u.isNull=o=>o===null;
if(!u.isBoolean)u.isBoolean=o=>typeof o==='boolean';
if(!u.isNumber)u.isNumber=o=>typeof o==='number';
if(!u.isError)u.isError=o=>o instanceof Error;

// docgen starts jsdoc in a child process: pass this file on to it through NODE_OPTIONS.
const self = `--require ${JSON.stringify(__filename)}`;
if(!(process.env.NODE_OPTIONS || '').includes(__filename)) process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS || ''} ${self}`.trim();
