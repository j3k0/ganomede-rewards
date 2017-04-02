'use strict';

const BaseClient = require('./BaseClient');

class VirtualCurrencyClient extends BaseClient {
  constructor ({protocol, hostname, port, pathnamePrefix, secret, rewardFrom}) {
    super(`${protocol}://${hostname}:${port}${pathnamePrefix}`);
    this.secret = secret;
    this.from = rewardFrom;
  }

  reward (userId, amount, currency, data, callback) {
    const body = {
      to: userId,
      from: this.from,
      secret: this.secret,
      amount,
      currency,
      data
    };

    this.apiCall('post', '/rewards', body, callback);
  }
}

module.exports = VirtualCurrencyClient;
