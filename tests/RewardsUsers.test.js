'use strict';

const RewardsUsers = require('../src/RewardsUsers');

describe('RewardsUsers', () => {
  const rewardId = 'login to game B and receive game A bonus';
  const rewardMetaKey = `$reward$${rewardId}`;
  const createClient = ({usermeta = td.object(), vcurrency = td.object()} = {}) => new RewardsUsers({
    rewardId,
    amount: 100,
    currency: 'game A coins',
    usermetaClient: usermeta,
    virtualCurrencyClient: vcurrency
  });

  describe('#reward()', () => {
    it('writes timestamp to usermeta and rewards user', (done) => {
      const usermeta = td.object(['write']);
      const vcurrency = td.object(['reward']);
      const rewardsUsers = createClient({usermeta, vcurrency});
      const now = Date.now();

      td.replace(Date, 'now', () => now);

      td.when(usermeta.write('alice', rewardMetaKey, String(now), td.callback))
        .thenCallback(null, {});

      td.when(vcurrency.reward('alice', 100, 'game A coins', {rewardId}, td.callback))
        .thenCallback(null, {});

      rewardsUsers.reward('alice', done);
    });

    it('when usermeta write fails, no reward is issued', (done) => {
      const usermeta = td.object(['write']);
      const vcurrency = td.object(['reward']);
      const rewardsUsers = createClient({usermeta, vcurrency});
      const now = Date.now();

      td.replace(Date, 'now', () => now);

      td.when(usermeta.write('alice', rewardMetaKey, String(now), td.callback))
        .thenCallback(new Error('Oops'));

      rewardsUsers.reward('alice', (err) => {
        expect(err).to.be.instanceof(Error);
        expect(err.message).to.equal('Oops');
        td.assert(vcurrency.reward).callCount(0);
        done();
      });
    });
  });

  describe('#shouldReward()', () => {
    it('fetches usermeta keys and asks ._shouldRewardInternal() with their values', (done) => {
      const usermeta = td.object(['read']);
      const rewardsUsers = createClient({usermeta});
      const ref = {};

      td.replace(RewardsUsers, '_shouldRewardInternal', td.function());

      td.when(usermeta.read('alice', ['auth', rewardMetaKey], td.callback))
        .thenCallback(null, {alice: {auth: 'a', [rewardMetaKey]: 'b'}});

      td.when(RewardsUsers._shouldRewardInternal({auth: 'a', [rewardMetaKey]: 'b'}, rewardMetaKey))
        .thenReturn(ref);

      rewardsUsers.shouldReward('alice', (err, should) => {
        expect(err).to.be.null;
        expect(should).to.equal(ref);
        done();
      });
    });

    describe('#_shouldRewardInternal()', () => {
      it('returns true when only auth is present', () => {
        expect(RewardsUsers._shouldRewardInternal({auth: 'auth'}, 'rewardId')).to.be.true;
      });

      it('returs false when both are present', () => {
        expect(RewardsUsers._shouldRewardInternal({
          auth: 'auth',
          rewardId: 'asd'
        }, 'rewardId')).to.be.false;
      });

      it('returns false when "auth" is missing', () => {
        expect(RewardsUsers._shouldRewardInternal({}, '')).to.be.false;
        expect(RewardsUsers._shouldRewardInternal({rewardId: 'asd'}, 'rewardId')).to.be.false;
      });
    });
  });
});
