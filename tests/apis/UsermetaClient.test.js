'use strict';

const UsermetaClient = require('../../src/apis/UsermetaClient');

describe('UsermetaClient', () => {
  it('#write()', (done) => {
    const client = new UsermetaClient({
      protocol: 'https',
      hostname: 'localhost',
      port: 443,
      pathnamePrefix: '/usermeta/v1',
      secret: 'secret'
    });

    td.replace(client.api, 'post', td.function());

    td.when(client.api.post('/usermeta/v1/auth/secret.bob/some', {value: 'thing'}, td.callback))
      .thenCallback(null, {}, {}, {ok: true});

    client.write('bob', 'some', 'thing', (err, res) => {
      expect(err).to.be.null;
      expect(res).to.eql({ok: true});
      done();
    });
  });
});
