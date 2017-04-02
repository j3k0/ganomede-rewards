'use strict';

const async = require('async');
const curtain = require('curtain-down');
const {Client: EventsClient} = require('ganomede-events');
const UsermetaClient = require('./apis/UsermetaClient');
const VirtualCurrencyClient = require('./apis/VirtualCurrencyClient');
const StatsdClient = require('./apis/StatsdClient');
const EventFilter = require('./EventFilter');
const RewardsUsers = require('./RewardsUsers');
const logger = require('./logger');
const config = require('../config');

class Worker {
  constructor ({
    usermetaA,
    rewardsUsers,
    events,
    channel,
    statsd
  }) {
    this.rewardsUsers = rewardsUsers;
    this.events = events;
    this.channel = channel;
    this.statsd = statsd;
    this.stopped = true;

    this.checks = [
      EventFilter.allowTypes('LOGIN'),
      EventFilter.allowFrom('App B'),
      EventFilter.requireData('userId'),
      EventFilter.createAsync((event, cb) => usermetaA.hasKey(event.data.userId, 'auth', cb)),
      EventFilter.createAsync((event, cb) => rewardsUsers.missingReward(event.data.userId, cb))
    ];

    this.onEvent = this.onEvent.bind(this);
    this.onError = this.onError.bind(this);
    this.onCycle = this.onCycle.bind(this);
  }

  onEvent (event, channel) {
    // Since we may stop after all events are emitted, there will be no ACK.
    // So to not reprocess this event on next launch, skip them.
    if (this.stopped)
      return;

    this.statsd.increment('events');

    async.waterfall([
      (cb) => cb(null, event),
      ...this.checks,
      (event, cb) => this.rewardsUsers.reward(event.data.userId.userId, cb)
    ], (error) => {
      if (error instanceof EventFilter.EventIgnoredError) {
        logger.info({channel, error}, `Ignoring Event(id=${event.id})`);
        this.statsd.increment('ignored');
      }
      else if (error) {
        logger.error({channel, error}, `Failed to process Event(id=${event.id})`);
        this.statsd.increment('failure');
      }
      else {
        logger.info(`Processed Event(id=${event.id})`);
        this.statsd.increment('success');
      }
    });
  }

  onError (error, channel) {
    logger.error({channel, error}, 'Events channel error');
  }

  onCycle (cursors, channel) {
    if (this.stopped && (channel === this.channel)) {
      this.events.removeListener(this.channel, this.onEvent);
      this.events.removeListener('error', this.onError);
      this.events.removeListener('cycle', this.onCycle);
      logger.info('Worker stopped.');
    }
  }

  start () {
    if (!this.stopped)
      return;

    this.stopped = false;
    this.events.on(this.channel, this.onEvent);
    this.events.on('error', this.onError);
    this.events.on('cycle', this.onCycle);
  }

  stop () {
    this.stopped = true;
    logger.info('Working stopping after next cycle…');
  }
}

const work = () => {
  const vcurrencyA = new VirtualCurrencyClient({
    protocol: config.vcurrencyA.protocol,
    hostname: config.vcurrencyA.host,
    port: config.vcurrencyA.port,
    pathnamePrefix: config.vcurrencyA.pathnamePrefix,
    secret: config.secret
  });

  const usermetaA = new UsermetaClient({
    protocol: config.usermetaA.protocol,
    hostname: config.usermetaA.host,
    port: config.usermetaA.port,
    pathnamePrefix: config.usermetaA.pathnamePrefix,
    secret: config.secret
  });

  const usermetaB = new UsermetaClient({
    protocol: config.usermetaB.protocol,
    hostname: config.usermetaB.host,
    port: config.usermetaB.port,
    pathnamePrefix: config.usermetaB.pathnamePrefix,
    secret: config.secret
  });

  const events = new EventsClient(config.events.clientId, {
    secret: config.secret,
    protocol: config.events.protocol,
    hostname: config.events.host,
    port: config.events.port,
    pathname: `${config.events.pathnamePrefix}/events`
  });

  const statsd = new StatsdClient(config.statsd);

  const rewardsUsers = new RewardsUsers({
    rewardId: config.reward.id,
    amount: config.reward.amount,
    currency: config.reward.currency,
    usermetaClient: usermetaB,
    virtualCurrencyClient: vcurrencyA
  });

  const worker = new Worker({
    usermetaA,
    rewardsUsers,
    events,
    channel: config.events.channel,
    statsd
  });

  worker.start();
  curtain.once(() => worker.stop());
};

module.exports = work;
