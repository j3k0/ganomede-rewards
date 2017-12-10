'use strict';

const BaseClient = require('./BaseClient');

class VirtualCurrencyClient extends BaseClient {
  constructor ({protocol, hostname, port, pathnamePrefix, secret, rewardFrom}) {
    super(`${protocol}://${hostname}:${port}${pathnamePrefix}`);
    this.secret = secret;
    this.from = rewardFrom;
  }

  reward (eventLogger, userId, amount, currency, data, callback) {
    const body = {
      to: userId,
      from: this.from,
      secret: this.secret,
      amount,
      currency,
      data
    };

    this.apiCall('post', '/rewards', body, (err, reply) => {
      if (err) {
        eventLogger.error({body, err}, 'VirtualCurrency POST /rewards failed');
        callback(new Error('virtualCurrency.reward() failed: ' + err));
      }
      else
        callback(null, reply);
    });
  }
}

module.exports = VirtualCurrencyClient;
