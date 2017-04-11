'use strict';

const restify = require('restify');
const errors = require('../src/errors');
const logger = require('../src/logger');

describe('errors', () => {
  it('.severity contains valid bunyan levels', () => {
    Object.keys(errors.severity).every(name => {
      const level = errors.severity[name];
      expect(logger).to.have.property(level);
      expect(logger[level]).to.be.instanceof(Function);
    });
  });

  describe('sendHttpError()', () => {
    it('converts GanomedeError instances to restify.RestError', () => {
      errors.sendHttpError(
        (e) => expect(e).to.be.instanceof(restify.RestError),
        new errors.InvalidCredentialsError()
      );
    });

    it('captures stack traces on errors', (done) => {
      // Say we have database module.
      const db = {
        doWork (cb) {
          process.nextTick(cb, new Error('FakeDatabaseError'));
        }
      };

      // Which is called from middleware. In case of error, sendHttpError is invoked.
      const middleware = (next) => {
        db.doWork((err) => {
          (function i_should_be_in_stack () {
            sendHttpError(next, err);
          }());
        });
      };

      // Logger should know from where sendHttpError was called.
      td.replace('../src/logger', {
        error ({error}, {sendHttpErrorStack}) {
          // Even though it is not in original error,
          // we still know where to look (file, line, function name).
          expect(error.stack).to.not.include('at sendHttpError');
          expect(error.stack).to.not.include('i_should_be_in_stack');
          expect(sendHttpErrorStack).to.include('at sendHttpError');
          expect(sendHttpErrorStack).to.include('at i_should_be_in_stack');
        }
      });

      // Require again() so td.replace(logger.error) works.
      const {sendHttpError} = require('../src/errors');

      // And next() must receive original error.
      middleware((err) => {
        expect(err).to.be.instanceof(Error);
        expect(err.message).to.equal('FakeDatabaseError');
        done();
      });
    });
  });
});
