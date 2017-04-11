'use strict';

const cluster = require('cluster');
const restify = require('restify');
const curtain = require('curtain-down');
const createServer = require('./create-server');
const ping = require('./ping.router');
const about = require('./about.router');
const logger = require('./logger');
const config = require('../config');

const serve = () => {
  const server = createServer();

  curtain.once(() => {
    logger.info('server stopping…');
    server.close();
    setTimeout(() => process.exit(1), 30e3).unref();
  });

  about(config.http.prefix, server);
  ping(config.http.prefix, server);

  // Handle uncaughtException, kill the worker.
  server.on('uncaughtException', (req, res, route, err) => {
    logger.error(err);

    // Note: we're in dangerous territory!
    // By definition, something unexpected occurred,
    // which we probably didn't want.
    // Anything can happen now! Be very careful!
    try {
      // make sure we close down within 30 seconds
      setTimeout(() => process.exit(1), 30e3).unref();

      // stop taking new requests
      server.close();

      // Let the master know we're dead.  This will trigger a
      // 'disconnect' in the cluster master, and then it will fork
      // a new worker.
      cluster.worker.disconnect();

      const message = err.message || 'unexpected error';
      res.send(new restify.InternalError(message));
    }
    catch (err2) {
      logger.error(err2, 'error sending 500!');
    }
  });

  server.listen(config.http.port, config.http.host, () => {
    const {port, family, address} = server.address();
    logger.info('ready at %s:%d (%s)', address, port, family);
  });
};

module.exports = serve;
