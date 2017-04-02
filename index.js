'use strict';

const curtain = require('curtain-down');
const cluster = require('cluster');
const serve = require('./src/serve');
const work = require('./src/work');
const logger = require('./src/logger');
const config = require('./config');

const main = () => {
  // Use New Relic if LICENSE_KEY has been specified.
  if (process.env.NEW_RELIC_LICENSE_KEY) {
    if (!process.env.NEW_RELIC_APP_NAME) {
      const pk = require('./package.json');
      process.env.NEW_RELIC_APP_NAME = pk.api;
    }
    require('newrelic');
  }

  if (cluster.isMaster) {
    logger.info({config}, 'Running with config');

    // Start worker in master.
    work();

    // Spawn HTTP server in secondary
    // (so it can die on exceptions without killing worker).
    let running = true;
    curtain.once(() => running = false);

    cluster.on('disconnect', (worker) => {
      logger.info('worker disconnected');

      if (running) {
        logger.error('restarting…');
        cluster.fork();
      }
    });

    cluster.fork();
  }
  else {
    serve();
  }
};

if (!module.parent)
  main();
