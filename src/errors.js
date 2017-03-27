'use strict';

const util = require('util');
const restify = require('restify');
const logger = require('./logger');

// The way to distinguish our app's logic-level errors from others.
// (Like `socket hang up` vs `user already exists`.)
//
// So the basic idea is to create things like @UserNotFoundError (see below),
// define appropriate statusCode and message on it (maybe some params),
// and return those from lower-level places. Then:
//
//   app.get('/users/:id', (req, res) => {
//     if (req.params.id.lengt < 3) // some check
//       return sendHttpError(new restify.BadRequestError());
//
//     orm.findUser(req.params.id, (err, user) => {
//       return err
//         ? sendHttpError(next, err) // this would be instance of UserNotFoundError
//                                    // or perhaps some other GanomedeError, so it'll
//                                    // get converted via #toRestError().
//                                    // Otherwise it'll be passed to default handler.
//         : res.json(user);
//     });
//   })
//
// It can also be sometimes useful to add error classes for driver's errors.
// This way we push mapping between some obscure error codes and stuff closer
// to our app into the wrapper. For example:
//
//    // db-wrapper.js
//    class Db {}
//    Db.MissingDocumentError = class MissingDocument extends GanomedeError {};
//    module.exports = Db;
//
//    // orm.js
//    const findUser = (userId, callback) => {
//      new Db().fetchDocument(userId, (err, json) => {
//        if (err instanceof Db.MissingDocumentError) {
//          // here we now what missing document means
//          // (and DB knows how to distinguish missing document errors
//          // from, say, "cannot connect to hostname")
//          return callback(new UserNotFoundError(userId));
//
//        // …
//      });
//    };

// Values for error#severity: how to print it inside `sendHttpError`.
// https://github.com/j3k0/ganomede/issues/11
// https://github.com/trentm/node-bunyan#levels
const severity = {
  fatal: 'fatal',  // (60): The service/app is going to stop or become unusable now. An operator should definitely look into this soon.
  error: 'error',  // (50): Fatal for a particular request, but the service/app continues servicing other requests. An operator should look at this soon(ish).
  warn: 'warn',    // (40): A note on something that should probably be looked at by an operator eventually.
  info: 'info',    // (30): Detail on regular operation.
  debug: 'debug',  // (20): Anything else, i.e. too verbose to be included in "info" level.
  trace: 'trace'   // (10): Logging from external libraries used by your app or very detailed application logging.
};

class GanomedeError extends Error {
  constructor (...messageArgs) {
    super();
    this.name = this.constructor.name;
    this.severity = severity.error;

    if (messageArgs.length > 0)
      this.message = util.format.apply(util, messageArgs);

    Error.captureStackTrace(this, this.constructor);
  }
}

// This is for validation errors (like missing `body` or certain parts of it),
// same as base error except it allows to specify custom restCode
// via changing instance's .name (see GanomedeError#toRestError()).
//
// Use like this:
//
//   if (!req.body.userId) {
//     const err = new RequestValidationError('BadUserId', 'Invalid or missing User ID');
//     return sendHttpError(next, err);
//   }
//
//   // will result in http 404 with json body:
//   // { "code": "BadUserId",
//   //   "message": "Invalid or missing User ID" }
class RequestValidationError extends GanomedeError {
  constructor (name, ...messageArgs) {
    super(...messageArgs);
    this.name = name;
    this.statusCode = 400;
    this.severity = severity.info;
  }
}

class InvalidAuthTokenError extends GanomedeError {
  constructor () {
    super('Invalid auth token');
    this.statusCode = 401;
    this.severity = severity.info;
  }
}

class InvalidCredentialsError extends GanomedeError {
  constructor () {
    super('Invalid credentials');
    this.statusCode = 401;
    this.severity = severity.info;
  }
}

const toRestError = (error) => {
  if (!error.statusCode)
    throw new Error(`Please define "statusCode" prop for ${error.constructor.name}`);

  return new restify.RestError({
    restCode: error.name,
    statusCode: error.statusCode,
    message: error.message
  });
};

const captureStack = () => {
  const o = {};
  Error.captureStackTrace(o, captureStack);
  return o.stack;
};

// Kept forgetting `next` part, so let's change this to (next, err).
const sendHttpError = (next, err) => {
  // https://github.com/j3k0/ganomede-boilerplate/issues/10
  // https://github.com/j3k0/ganomede-directory/issues/15
  //
  // With restify errors, which we usually create ourselves,
  // stack points to the right place, but in some cases,
  // we can get error that was created on different event loop tick.
  //
  // Though we rely on lower levels to print those kinds of errors,
  // we still must know the place sendHttpError was called from.
  const stack = {sendHttpErrorStack: captureStack()};

  // When we have an instance of GanomedeError, it means stuff that's defined here, in this file.
  // So those have `statusCode` and convertable to rest errors.
  // In case they don't, we die (because programmers error ("upcast" it) not runtime's).
  const isGanomedeError = err instanceof GanomedeError;
  const error = isGanomedeError ? toRestError(err) : err;

  // We mostly upcast our app-logic errors to GanomedeError,
  // but some things may come up as restify.HttpError
  // (e.g. InternalServerError instance may end up here).
  // So we treat them with "error" severity.
  const level = isGanomedeError ? err.severity : 'error';

  logger[level]({error}, stack);
  next(error);
};

module.exports = {
  GanomedeError,
  RequestValidationError,
  InvalidAuthTokenError,
  InvalidCredentialsError,
  sendHttpError,
  severity
};
