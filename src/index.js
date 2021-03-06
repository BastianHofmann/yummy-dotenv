const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const nodeEnv = () => process.env.NODE_ENV || 'development';
const isDev = () => nodeEnv() === 'development';

const isFunction = /* #__PURE__ */ predicate => typeof predicate === 'function';
const pipe = /* #__PURE__ */ (...fns) => x => fns.reduce((acc, fn) => fn(acc), x);
const when = /* #__PURE__ */ (condition, fn) => x => (condition ? fn(x) : x);
const reduce = /* #__PURE__ */ (fn, x) => y => y.reduce(fn, x);
const assign = /* #__PURE__ */ x => y => Object.assign({}, x, y);

const only = /* #__PURE__ */ x => y => {
  const reducer = (acc, key) => assign(acc)({ [key]: x[key] || acc[key] });

  return pipe(
    Object.keys,
    reduce(reducer, y),
  )(y);
};

const toArray = /* #__PURE__ */ x => (
  Array.isArray(x)
    ? x
    : String(x).trim().split(/\s*,\s*/)
);

// const mapFiles = filesOrFn => toArray(
//   isFunction(filesOrFn) ? filesOrFn() : filesOrFn,
// ).map;

const mapFiles = filesOrFn => mapFn => {
  const files = pipe(
    maybeFn => (isFunction(maybeFn) ? maybeFn() : maybeFn),
    toArray,
    list => list.filter(Boolean),
  )(filesOrFn);

  return files.map(mapFn);
};


const interpolate = /* #__PURE__ */ defaults => object => {
  const capture = value => String(value || '').match(/\$\{(\w+)\}/g) || [];
  const substitute = value => variables => {
    const reducer = (val, key) => val.replace(key, variables[key.slice(2, -1)] || '');

    return pipe(
      capture,
      reduce(reducer, value),
    )(value);
  };

  const reducer = (acc, [key, value]) => assign(acc)({
    [key]: pipe(assign(defaults), substitute(value))(acc),
  });

  return pipe(
    Object.entries,
    reduce(reducer, {}),
  )(object);
};

function config({
  context = process.cwd(),
  defaults = '.env.defaults',
  schema = '.env.schema',
  system = true,
  files = () => [
    '.env',
    isDev() && '.env.local',
    `.env.${nodeEnv()}`,
    isDev() && `.env.${nodeEnv()}.local`,
  ],
} = {}) {
  const resolve = file => path.resolve(context, file);
  const exists = file => file && pipe(resolve, fs.existsSync)(file);
  const parse = file => pipe(resolve, fs.readFileSync, dotenv.parse)(file);
  const read = file => when(exists(file), object => pipe(parse, assign(object))(file));

  const filter = file => object => {
    const reducer = (acc, key) => assign(acc)({ [key]: object[key] });

    return pipe(
      parse,
      Object.keys,
      reduce(reducer, {}),
    )(file);
  };

  return pipe(
    when(exists(defaults), read(defaults)),
    ...mapFiles(files)(
      file => when(exists(file), read(file)),
    ),
    when(exists(schema), filter(schema)),
    when(system, only(process.env)),
    interpolate(system ? process.env : {}),
  )({});
}

module.exports = {
  parse: dotenv.parse,
  load: config,
  config,
};
