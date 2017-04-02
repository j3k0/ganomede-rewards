'use strict';

const VirtualCurrencyClient = require('../../src/apis/VirtualCurrencyClient');

describe('VirtualCurrencyClient', () => {
  describe('#reward()', () => {
    it('rewards user', (done) => {
      const client = new VirtualCurrencyClient({
        protocol: 'https',
        hostname: 'localhost',
        port: 3000,
        pathnamePrefix: '/virtualcurrency/v1',
        secret: 'secret',
        rewardFrom: 'generous benefactor'
      });

      const expectedBody = {
        to: 'alice',
        from: 'generous benefactor',
        secret: 'secret',
        amount: 10,
        currency: 'points',
        data: {some: 'data'}
      };

      td.replace(client.api, 'post', td.function());

      td.when(client.api.post('/virtualcurrency/v1/rewards', expectedBody, td.callback))
        .thenCallback(null, {}, {}, {});

      client.reward('alice', 10, 'points', {some: 'data'}, done);
    });
  });
});
