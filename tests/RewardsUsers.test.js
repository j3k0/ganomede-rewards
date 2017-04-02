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

  describe('#missingReward()', () => {
    it('calls UsermetaClient#hasKey() and negates its reply', (done) => {
      const usermeta = td.object(['hasKey']);
      const rewardsUsers = createClient({usermeta});

      td.when(usermeta.hasKey('alice', rewardMetaKey, td.callback))
        .thenCallback(null, true);

      rewardsUsers.missingReward('alice', (err, missingReward) => {
        expect(err).to.be.null;
        expect(missingReward).to.be.false;
        done();
      });
    });
  });
});
