'use strict';

const bunyan = require('bunyan');
const pkg = require('./package.json');
const {debugInspect, debugPrint} = require('./src/utils');

const parseLogLevel = (envValue) => {
  const defaultLevel = 'INFO';
  const desiredLevel = envValue
    ? String(envValue).toUpperCase()
    : defaultLevel;
  const levels = [
    'FATAL',
    'ERROR',
    'WARN',
    'INFO',
    'DEBUG',
    'TRACE'
  ];

  const hasMatch = levels.includes(desiredLevel);
  const level = hasMatch ? desiredLevel : defaultLevel;

  if (!hasMatch) {
    const available = `Please specify one of ${debugInspect(levels)}.`;
    const message = `Uknown log level "${desiredLevel}". ${available}`;
    throw new Error(message);
  }

  return bunyan[level];
};

const parseApiSecret = () => {
  const valid = process.env.hasOwnProperty('API_SECRET')
    && (typeof process.env.API_SECRET === 'string')
    && (process.env.API_SECRET.length > 0);

  if (!valid)
    throw new Error('API_SECRET must be non-empty string');

  return process.env.API_SECRET;
};

const nonempty = function (envName, defaultValue) {
  const val = process.env[envName];
  const has = process.env.hasOwnProperty(envName);
  const ok = has && (val.length > 0);

  if (has) {
    if (ok)
      return val;

    throw new Error(`Env var ${envName} must be non-empty string empty`);
  }

  if (arguments.length === 2)
    return defaultValue;

  throw new Error(`Env var ${envName} is missing`);
};

module.exports = {
  name: pkg.name,
  logLevel: parseLogLevel(process.env.LOG_LEVEL),
  secret: process.env.hasOwnProperty('API_SECRET') && parseApiSecret(),
  production: process.env.NODE_ENV === 'production',

  http: {
    host: process.env.HOST || '0.0.0.0',
    port: process.env.hasOwnProperty('PORT')
      ? parseInt(process.env.PORT, 10)
      : 8000,
    prefix: `/${pkg.api}`
  },

  statsd: {
    hostname: nonempty('STATSD_HOST', false),
    port: nonempty('STATSD_PORT', false),
    prefix: nonempty('STATSD_PREFIX', 'rewards.worker.')
  }
};

if (!module.parent)
  debugPrint(module.exports);
