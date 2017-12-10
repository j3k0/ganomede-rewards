'use strict';

const lodash = require('lodash');
const {GanomedeError} = require('./errors');
const {hasOwnProperty} = require('./utils');

// Useful funcs to filter events.
// (This should probably move into events lib.)
//
// Core idea:
//   - you pass in a check function that accepts event;
//   - you receive filter function with signature `(event, cb)`;
//   - if check succeeds, callback receives `(null, event)`,
//     otherwise callback receives (`EventIgnoredError`) with nice message.
//
// eventsClient.on('users/v1', (event) => {
//   async.waterfall([
//     // start the chain since filters accept (event, cb).
//     (cb) => cb(null, event),
//
//     // Simple sync check
//     EventFilter.createSync((event) => event.type === 'LOGIN'),
//
//     // With custom message
//     // 'Event(id=42) ignored: only `"app X"` is accepted as from value, got `undefined`'
//     EventFilter.createSync((event) => {
//       return (event.from !== 'app X')
//         ? [false, 'only `%j` is accepted as from value, got `%j`', 'app X', event.from]
//         : [true];
//     }),
//
//     // Same for async
//     EventFilter.createAsync((event, cb) => {
//       findByEventId(event.id, (err, dbRecord) => {
//         if (err)
//           return cb(err);
//
//         if (dbRecord !== null)
//           return cb(null, false, 'Event already processed at %s', dbRecord.processedAt);
//
//         cb(null, true);
//       })
//     }),
//
//     // All checks have passed, process event
//     // (filter invokes its callback with `(err, event)`):
//     processEvent
//   ], (err) => {
//     if (err instanceof EventFilter.EventIgnoredError) {
//       // event was ignored
//     }
//     else if (err) {
//       // other error occured
//     }
//   })
// });
//

class EventFilter {
  static createSync (shouldAccept) {
    return (event, cb) => {
      const [accept, customErrorMessage] = shouldAccept(event);
      const args = accept
        ? [null, event]
        : [new EventFilter.EventIgnoredError(event, customErrorMessage)];

      setImmediate(cb, ...args);
    };
  }

  static createAsync (shouldAccept) {
    return (event, cb) => {
      shouldAccept(event, (err, accept, customErrorMessage) => {
        if (err)
          return cb(err);

        return accept
          ? cb(null, event)
          : cb(new EventFilter.EventIgnoredError(event, customErrorMessage));
      });
    };
  }

  static requireData (...pathes) {
    return EventFilter.createSync((event) => {
      if (!hasOwnProperty(event, 'data'))
        return [false, 'data is missing'];

      if (!lodash.isPlainObject(event.data))
        return [false, 'data is not a plain object'];

      let result = [true];

      pathes.some(path => {
        const missing = !lodash.has(event.data, path);

        if (missing)
          result = [false, 'data is missing path `' + path + '`'];

        return missing;
      });

      return result;
    });
  }

  static allowFrom (...values) {
    return EventFilter.createSync((event) => {
      return values.includes(event.from)
        ? [true, null]
        : [false, 'only from values ' + JSON.stringify(values) + ' are allowed, got `' + JSON.stringify(event.from) + '`'];
    });
  }

  static allowTypes (...types) {
    return EventFilter.createSync((event) => {
      return types.includes(event.type)
        ? [true, null]
        : [false, 'only types ' + JSON.stringify(types) + ' are allowed, got `' + JSON.stringify(event.type) + '`'];
    });
  }
}

EventFilter.EventIgnoredError = class EventIgnoredError extends GanomedeError {
  constructor (event, reasonFormat) {
    const format = reasonFormat
      ? `Event(id=${event.id}) ignored: ${reasonFormat}`
      : `Event(id=${event.id}) ignored`;

    super(format);
  }
};

module.exports = EventFilter;
