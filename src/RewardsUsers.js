'use strict';

const async = require('async');

class RewardsUsers {
  constructor ({rewardId, amount, currency, usermetaClient, virtualCurrencyClient}) {
    this.rewardId = rewardId;
    this.amount = amount;
    this.currency = currency;
    this.usermeta = usermetaClient;
    this.vcurrency = virtualCurrencyClient;
  }

  _key () {
    return `$reward$${this.rewardId}`;
  }

  reward (eventLogger, userId, callback) {
    async.series([
      (cb) => this.usermeta.write(userId, this._key(), String(Date.now()), cb),
      (cb) => this.vcurrency.reward(eventLogger, userId, this.amount, this.currency, {rewardId: this.rewardId}, cb)
    ], callback);
  }

  static _shouldRewardInternal (obj, rewardIdKey) {
    return obj.hasOwnProperty('auth') && !obj.hasOwnProperty(rewardIdKey);
  }

  shouldReward (userId, callback) {
    const rewardIdKey = this._key();
    const keys = ['auth', rewardIdKey];

    this.usermeta.read(userId, keys, (err, reply) => {
      return err
        ? callback(err)
        : callback(null, RewardsUsers._shouldRewardInternal(reply[userId], rewardIdKey));
    });
  }
}

module.exports = RewardsUsers;
