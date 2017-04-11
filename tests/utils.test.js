'use strict';

const utils = require('../src/utils');

describe('utils', () => {
  it('.debugInspect() works with circular objects with default options', () => {
    const obj = {};
    obj.self = obj;
    expect(utils.debugInspect(obj)).to.contain('self: [Circular]');
  });

  it('.hasOwnProperty()', () => {
    const obj = Object.create(null);
    obj.x = false;

    expect(utils.hasOwnProperty(obj, 'x')).to.be.true;
    expect(utils.hasOwnProperty(obj, 'y')).to.be.false;
  });

  describe('.toArray()', () => {
    it('if array passed in, returns it as is', () => {
      const ref = [];
      expect(utils.toArray(ref)).to.equal(ref);
    });

    it('wraps converts non-array args to [arg]', () => {
      const ref = {};
      const actual = utils.toArray(ref);
      expect(actual).to.eql([ref]);
      expect(actual[0]).to.equal(ref);
    });
  });
});
