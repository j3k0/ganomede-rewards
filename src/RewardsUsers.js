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

  reward (userId, callback) {
    async.series([
      (cb) => this.usermeta.write(userId, this._key(), String(Date.now()), cb),
      (cb) => this.vcurrency.reward(userId, this.amount, this.currency, {rewardId: this.rewardId}, cb)
    ], callback);
  }

  hasReward (userId, callback) {
    const key = this._key();

    this.usermeta.read(userId, key, (err, reply) => {
      return err
        ? callback(err)
        : callback(null, !!reply[userId][key]);
    });
  }
}

module.exports = RewardsUsers;
