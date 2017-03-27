'use strict';

const bunyan = require('bunyan');
const config = require('../config');
const {debugInspect} = require('./utils');

module.exports = bunyan.createLogger({
  level: config.logLevel,
  name: config.name,
  stream: process.stdout,

  serializers: {
    err: debugInspect,
    error: debugInspect
  }
});
