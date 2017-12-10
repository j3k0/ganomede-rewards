'use strict';

const {GanomedeError} = require('../src/errors');
const EventFilter = require('../src/EventFilter');

describe('EventFilter', () => {
  const eventRef = {id: 42};

  const shouldAccept = (accept, errorMessage) => {
    const func = td.function();
    td.when(func(eventRef)).thenReturn([accept, errorMessage]);
    return func;
  };

  describe('.createSync()', () => {
    it('invokes check function with (event)', (done) => {
      const filter = EventFilter.createSync(shouldAccept(true));
      filter(eventRef, (error, event) => {
        expect(event).to.equal(eventRef);
        done();
      });
    });

    it('callback invoked on next tick', (done) => {
      const filter = EventFilter.createSync(shouldAccept(true))
      let sameTick = true;

      filter(eventRef, () => {
        expect(sameTick).to.be.false;
        done();
      });

      sameTick = false;
    });

    it('invokes callback(null, event) when function returns true', (done) => {
      const filter = EventFilter.createSync(shouldAccept(true));

      filter(eventRef, (err, event) => {
        expect(err).to.be.null;
        expect(event).to.equal(eventRef);
        done();
      });
    });

    it('invokes callback(EventIgnoredError) when function returns false', (done) => {
      const filter = EventFilter.createSync(shouldAccept(false));

      filter(eventRef, (err, event) => {
        expect(err).to.be.instanceof(EventFilter.EventIgnoredError);
        expect(event).to.be.undefined;
        done();
      });
    });

    it('EventIgnoredError\' message is customizable', (done) => {
      const filter = EventFilter.createSync(shouldAccept(false, 'apple is not banana'));

      filter(eventRef, (err, event) => {
        expect(err).to.be.instanceof(EventFilter.EventIgnoredError);
        expect(err.message).to.equal('Event(id=42) ignored: apple is not banana');
        done();
      });
    });
  });

  describe('.createAsync', () => {
    it('invoked with (event, cb)', (done) => {
      const func = td.function();
      const filter = EventFilter.createAsync(func);

      td.when(func(eventRef, td.callback))
        .thenCallback();


      filter(eventRef, () => done());
    });

    it('invokes callback(null, event) if check is successfull', (done) => {
      const func = td.function();
      const filter = EventFilter.createAsync(func);

      td.when(func(eventRef, td.callback))
        .thenCallback(null, true);

      filter(eventRef, (err, event) => {
        expect(err).to.be.null;
        expect(event).to.equal(eventRef);
        done();
      });
    });

    it('invokes callback(EventIgnoredError) if check is unsuccessfull', (done) => {
      const func = td.function();
      const filter = EventFilter.createAsync(func);

      td.when(func(eventRef, td.callback))
        .thenCallback(null, false);

      filter(eventRef, (err, event) => {
        expect(err).to.be.instanceof(EventFilter.EventIgnoredError);
        expect(err.message).to.be.equal('Event(id=42) ignored');
        expect(event).to.be.undefined;
        done();
      });
    });

    it('invokes callback(error) if check errored', (done) => {
      const func = td.function();
      const filter = EventFilter.createAsync(func);

      td.when(func(eventRef, td.callback))
        .thenCallback(new Error('Ooops'));

      filter(eventRef, (err, event) => {
        expect(err).to.be.instanceof(Error);
        expect(err.message).to.equal('Ooops');
        expect(event).to.be.undefined;
        done();
      });
    });

    it('EventIgnoredError\' message is customizable', (done) => {
      const func = td.function();
      const filter = EventFilter.createAsync(func);

      td.when(func(eventRef, td.callback))
        .thenCallback(null, false, 'apple is not banana');

      filter(eventRef, (err, event) => {
        expect(err).to.be.instanceof(EventFilter.EventIgnoredError);
        expect(err.message).to.be.equal('Event(id=42) ignored: apple is not banana');
        expect(event).to.be.undefined;
        done();
      });
    });
  });

  describe('.requireData()', () => {
    it('accepts events with data and all pathes present', (done) => {
      const filter = EventFilter.requireData('userId', 'count.x');
      filter({id: 42, data: {userId: 'joe', count: {x: 0}}}, done);
    });

    it('rejects events without data', (done) => {
      const filter = EventFilter.requireData();

      filter({id: 42}, (err) => {
        expect(err).to.be.instanceof(EventFilter.EventIgnoredError);
        expect(err.message).to.equal('Event(id=42) ignored: data is missing');
        done();
      });
    });

    it('rejects events with data being non-object', (done) => {
      const filter = EventFilter.requireData();

      filter({id: 42, data: []}, (err) => {
        expect(err).to.be.instanceof(EventFilter.EventIgnoredError);
        expect(err.message).to.equal('Event(id=42) ignored: data is not a plain object');
        done();
      });
    });

    it('rejects events with data missing passed in pathes', (done) => {
      const filter = EventFilter.requireData('flag', 'x.y');

      filter({id: 42, data: {flag: true, x: {}}}, (err) => {
        expect(err).to.be.instanceof(EventFilter.EventIgnoredError);
        expect(err.message).to.equal('Event(id=42) ignored: data is missing path `x.y`');
        done();
      });
    });
  });

  describe('.allowFrom()', () => {
    it('events with matching from values are accepted', (done) => {
      const filter = EventFilter.allowFrom('app x');
      filter({id: 42, from: 'app x'}, done);
    });

    it('non-matching event from values are EventIgnoredError with nice message', (done) => {
      const filter = EventFilter.allowFrom('app x');

      filter({id: 42}, (err, event) => {
        expect(err).to.be.instanceof(EventFilter.EventIgnoredError);
        expect(err.message).to.equal('Event(id=42) ignored: only from values ["app x"] are allowed, got `undefined`');
        done();
      });
    });
  });

  describe('.allowTypes()', () => {
    it('events with matching types are accepted', (done) => {
      const filter = EventFilter.allowTypes('apple', 'banana');
      filter({id: 42, type: 'banana'}, done);
    });

    it('non-matching event types are EventIgnoredError with nice message', (done) => {
      const filter = EventFilter.allowTypes('apple', 'banana');

      filter({id: 42, type: 'missing'}, (err, event) => {
        expect(err).to.be.instanceof(EventFilter.EventIgnoredError);
        expect(err.message).to.equal('Event(id=42) ignored: only types ["apple","banana"] are allowed, got `"missing"`');
        done();
      });
    });
  });

  describe('EventIgnoredError', () => {
    it('is GanomedeError', () => {
      expect(new EventFilter.EventIgnoredError(eventRef)).to.be.instanceof(GanomedeError);
    });

    it('appends reason to message', () => {
      const error = new EventFilter.EventIgnoredError(eventRef, 'xxx');
      expect(error.message).to.equal('Event(id=42) ignored: xxx');
    });

    // it('reason may be util.format() style args', () => {
    //   const error = new EventFilter.EventIgnoredError(eventRef, 'num %d', 42);
    //   expect(error.message).to.equal('Event(id=42) ignored: num 42');
    // });

    it('reason is optional', () => {
      const error = new EventFilter.EventIgnoredError(eventRef);
      expect(error.message).to.equal('Event(id=42) ignored');
    });
  });
});
