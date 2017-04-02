'use strict';

const RewardsUsers = require('../src/RewardsUsers');

describe('RewardsUsers', () => {
  const rewardId = 'login to game B and receive game A bonus';
  const rewardMetaKey = `$reward$${rewardId}`;
  const createClient = ({usermeta = td.object(), vcurrency = td.object()}) => new RewardsUsers({
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

  describe('#hasReward()', () => {
    it('returns true for truthy values', (done) => {
      const usermeta = td.object(['read']);
      const rewardsUsers = createClient({usermeta});

      td.when(usermeta.read('alice', rewardMetaKey, td.callback))
        .thenCallback(null, {alice: {[rewardMetaKey]: new Date().toISOString()}});

      rewardsUsers.hasReward('alice', (err, rewarded) => {
        expect(err).to.be.null;
        expect(rewarded).to.be.true;
        done();
      });
    });

    it('returns false for missing values', (done) => {
      const usermeta = td.object(['read']);
      const rewardsUsers = createClient({usermeta});

      td.when(usermeta.read('alice', `$reward$${rewardId}`, td.callback))
        .thenCallback(null, {alice: {}});

      rewardsUsers.hasReward('alice', (err, rewarded) => {
        expect(err).to.be.null;
        expect(rewarded).to.be.false;
        done();
      });
    });
  });
});
