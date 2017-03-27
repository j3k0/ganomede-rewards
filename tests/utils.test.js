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
});
