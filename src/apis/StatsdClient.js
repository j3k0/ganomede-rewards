'use strict';

const util = require('util');
const Statsd = require('node-statsd');
const logger = require('../logger').child({module: 'statsd'});

class StatsdClient extends Statsd {
  constructor ({hostname, port, prefix} = {}) {
    const hasVars = hostname && port && prefix;
    const config = {
      host: hostname,
      port,
      prefix,
      mock: !hasVars
    };

    if (!hasVars)
      logger.warn(config, 'StatsdClient missing some config options, stats will not be sent.');

    super(config);
    this.config = config;
    this.socket.on('error', this.onSocketError.bind(this));
  }

  onSocketError (error) {
    logger.error({error}, util.format('StatsdClient(%j) socket error', this.config));
  }
}

module.exports = StatsdClient;
