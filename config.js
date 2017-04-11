'use strict';

const bunyan = require('bunyan');
const pkg = require('./package.json');
const ServiceEnv = require('./src/ServiceEnv');
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

const nonemptyInt = (...args) => {
  const str = nonempty(...args);
  const val = parseInt(str, 10);
  const ok = isFinite(val) && (String(val) === str);

  if (!ok)
    throw new Error(`Evn var ${args[0]} is not a valid integer`);

  return val;
};

module.exports = {
  name: pkg.name,
  api: pkg.api,
  logLevel: parseLogLevel(process.env.LOG_LEVEL),
  secret: process.env.hasOwnProperty('API_SECRET') && parseApiSecret(),
  production: process.env.NODE_ENV === 'production',

  appNameA: nonempty('APP_1_NAME'),
  appNameB: nonempty('APP_2_NAME'),

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
  },

  events: Object.assign(
    {
      clientId: nonempty('EVENTS_CLIENT_ID'),
      channel: nonempty('EVENTS_CHANNEL', 'users/v1'),
      pathnamePrefix: nonempty('EVENTS_PREFIX', '/events/v1')
    },
    ServiceEnv.config('EVENTS', 8000)
  ),

  vcurrencyA: Object.assign(
    {pathnamePrefix: nonempty('APP_1_VIRTUALCURRENCY_PREFIX', '/virtualcurrency/v1')},
    ServiceEnv.config('APP_1_VIRTUALCURRENCY', 8000)
  ),

  usermetaA: Object.assign(
    {pathnamePrefix: nonempty('APP_1_USERMETA_PREFIX', '/usermeta/v1')},
    ServiceEnv.config('APP_1_USERMETA', 8000)
  ),

  reward: {
    id: nonempty('REWARD_APP_1_USER_LOGIN_APP_2_ID'),
    amount: nonemptyInt('REWARD_APP_1_USER_LOGIN_APP_2_AMOUNT'),
    currency: nonempty('REWARD_APP_1_USER_LOGIN_APP_2_CURRENCY')
  }
};

if (!module.parent)
  debugPrint(module.exports);
