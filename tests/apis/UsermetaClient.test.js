'use strict';

const UsermetaClient = require('../../src/apis/UsermetaClient');

describe('UsermetaClient', () => {
  const createClient = (secret) => new UsermetaClient({
    protocol: 'https',
    hostname: 'localhost',
    port: 443,
    pathnamePrefix: '/usermeta/v1',
    secret
  });

  it('#write()', (done) => {
    const client = createClient('secret');

    td.replace(client.api, 'post', td.function());

    td.when(client.api.post('/usermeta/v1/auth/secret.bob/some', {value: 'thing'}, td.callback))
      .thenCallback(null, {}, {}, {ok: true});

    client.write('bob', 'some', 'thing', (err, res) => {
      expect(err).to.be.null;
      expect(res).to.eql({ok: true});
      done();
    });
  });

  describe('#read()', () => {
    it('reads single key', (done) => {
      const client = createClient('secret');

      td.replace(client.api, 'get', td.function());

      td.when(client.api.get('/usermeta/v1/alice/key1?secret=secret'), td.callback)
        .thenCallback(null, {}, {}, {alice: {key1: '1'}});

      client.read('alice', 'key1', (err, res) => {
        expect(err).to.be.null;
        expect(res).to.eql({alice: {key1: '1'}});
        done();
      });
    });

    it('reads multiple keys with proper escaping', (done) => {
      const client = createClient('abc/00');

      td.replace(client.api, 'get', td.function());

      td.when(client.api.get('/usermeta/v1/alice%2Cjoe/key1%2Ckey2?secret=abc%2F00'), td.callback)
        .thenCallback(null, {}, {}, {alice: {key1: '1', key2: '2'}, joe: {}});

      client.read(['alice', 'joe'], ['key1', 'key2'], (err, res) => {
        expect(err).to.be.eql(null);
        expect(res).to.eql({
          alice: {
            key1: '1',
            key2: '2'
          },
          joe: {}
        });

        done();
      });
    });
  });

  describe('#hasKey()', () => {
    it('returns true for existing keys', (done) => {
      const client = createClient('1');

      td.replace(client.api, 'get', td.function());

      td.when(client.api.get('/usermeta/v1/alice/key?secret=1', td.callback))
        .thenCallback(null, {}, {}, {alice: {key: ''}});

      client.hasKey('alice', 'key', (err, has) => {
        expect(err).to.be.null;
        expect(has).to.be.true;
        done();
      });
    });

    it('returns false for missing keys', (done) => {
      const client = createClient('1');

      td.replace(client.api, 'get', td.function());

      td.when(client.api.get('/usermeta/v1/alice/key?secret=1', td.callback))
        .thenCallback(null, {}, {}, {alice: {}});

      client.hasKey('alice', 'key', (err, has) => {
        expect(err).to.be.null;
        expect(has).to.be.false;
        done();
      });
    });
  });
});
