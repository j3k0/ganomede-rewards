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
    eventLogger.debug({userId}, 'Sending reward');
    async.series([
      (cb) => this.usermeta.write(userId, this._key(), String(Date.now()), cb),
      (cb) => this.vcurrency.reward(eventLogger, userId, this.amount, this.currency, {rewardId: this.rewardId}, cb)
    ], callback);
  }

  static _alreadyRewarded (obj, rewardIdKey) {
    return obj.hasOwnProperty(rewardIdKey);
  }

  static _authentified (obj) {
    return obj.hasOwnProperty('auth');
  }

  static _reasonNotToReward (obj, rewardIdKey) {
    if (!RewardsUsers._authentified(obj))
      return 'user not identified';
    if (RewardsUsers._alreadyRewarded(obj, rewardIdKey))
      return 'user already rewarded';
    return null;
  }

  shouldReward (userId, callback) {
    const rewardIdKey = this._key();
    const keys = ['auth', rewardIdKey];

    this.usermeta.read(userId, keys, (err, reply) => {
      if (err) {
        callback(err);
      }
      else {
        const reasonNotTo = RewardsUsers._reasonNotToReward(reply[userId], rewardIdKey);
        callback(null, !reasonNotTo, reasonNotTo);
      }
    });
  }
}

module.exports = RewardsUsers;
