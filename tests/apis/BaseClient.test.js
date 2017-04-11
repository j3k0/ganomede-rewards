'use strict';

const url = require('url');
const restify = require('restify');
const BaseClient = require('../../src/apis/BaseClient');

describe('BaseClient', () => {
  it('new BaseClient()', () => {
    const client = new BaseClient('https://127.0.0.1:3000/a/b/c');
    expect(client).to.be.instanceof(BaseClient);
    expect(client.api).to.be.instanceof(restify.JsonClient);
    expect(client.api.url).to.be.eql(url.parse('https://127.0.0.1:3000'));
    expect(client.pathPrefix).to.equal('/a/b/c');
  });

  describe('#apiCall()', () => {
    const client = new BaseClient('https://127.0.0.1:3000/api/v1');
    beforeEach(() => td.replace(client.api, 'get', td.function()));

    it('prefixes path', (done) => {
      td.when(client.api.get('/api/v1/resource', td.callback))
        .thenCallback(null, {}, {}, {result: true});

      client.apiCall('get', '/resource', (err, obj) => {
        expect(err).to.be.null;
        expect(obj).to.eql({result: true});
        done();
      });
    });

    it('supports payload (when 4 args are passed in)', (done) => {
      td.when(client.api.get('/api/v1/resource', {payload: true}, td.callback))
        .thenCallback(null, {}, {}, {result: true});

      client.apiCall('get', '/resource', {payload: true}, (err, obj) => {
        expect(err).to.be.null;
        expect(obj).to.eql({result: true});
        done();
      });
    });
  });

  describe('.parseConstructorOptions()', () => {
    const f = BaseClient.parseConstructorOptions;
    const bound = (...args) => () => BaseClient.parseConstructorOptions(...args);

    describe('pathPrefix', () => {
      it('correctly parses path prefix brom baseUrl correct', () => {
        expect(f('https://example.com').pathPrefix).to.equal('');
        expect(f('https://example.com/a').pathPrefix).to.equal('/a');
        expect(f('https://example.com/a/b').pathPrefix).to.equal('/a/b');
      });

      it('removes trailing slashes', () => {
        expect(f('https://example.com/').pathPrefix).to.equal('');
        expect(f('https://example.com///').pathPrefix).to.equal('');
        expect(f('https://example.com/a/').pathPrefix).to.equal('/a');
        expect(f('https://example.com/a/b/').pathPrefix).to.equal('/a/b');
      });

      it('throws on pathes with QS, hash, etc.', () => {
        expect(bound('http://host?q=s')).to.throw(Error, /^"Unclean" path is not supported/);
        expect(bound('http://host#hsh')).to.throw(Error, /^"Unclean" path is not supported/);
      });

      it('throws on invalid baseUrl', () => {
        expect(bound()).to.throw(TypeError, /^Parameter "url"/);
        expect(bound(null)).to.throw(TypeError, /^Parameter "url"/);
        expect(bound(42)).to.throw(TypeError, /^Parameter "url"/);
      });
    });

    describe('apiOptions', () => {
      it('uses defaults correctly', () => {
        expect(f('https://host').apiOptions).to.eql(Object.assign(
          {},
          BaseClient.defaultOptions,
          {url: 'https://host'}
        ));
      });

      it('url becomse protocol + hostname + port', () => {
        const actual = f('https://host/prefix').apiOptions;
        expect(actual).to.have.property('url', 'https://host');
      });

      it('options are extendable', () => {
        const actual = f('https://host', {something: true}).apiOptions;
        expect(actual).to.have.property('something', true);
      });

      it('options are overwritable', () => {
        const {retry} = f('https://host/', {retry: {tries: 3}}).apiOptions;
        expect(retry).to.eql({tries: 3});
      });

      it('headers are merged', () => {
        const {headers} = f('https://host', {headers: {
          'accept-encoding': 'utf8',
          'X-More': 'Stuff'
        }}).apiOptions;

        expect(headers).to.have.property('accept-encoding', 'utf8');
        expect(headers).to.have.property('X-More', 'Stuff');
      });
    });
  });
});
