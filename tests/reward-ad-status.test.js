import test from 'node:test';
import assert from 'node:assert/strict';
import {rewardAdBlockReason} from '../web/reward-ad-status.js';
import {RewardedAdsClient} from '../web/rewarded-ads.js';
const ready={supported:true,state:{ready:true},online:true,enabled:true,testRewards:false,pending:false,item:'crystal'};
test('ready real requests proceed; each unavailable stage has a visible reason',()=>{
 assert.equal(rewardAdBlockReason(ready),'');
 for(const change of [{supported:false},{online:false},{enabled:false},{pending:true},{state:{ready:false}}])assert.ok(rewardAdBlockReason({...ready,...change}));
 assert.equal(rewardAdBlockReason({...ready,state:{ready:false,diagnostic:'SDK failure 3'}}),'SDK failure 3');
});
test('test ads cannot claim checkin or bypass server test-reward gate',()=>{
 const t={...ready,state:{test:true,ready:true},testRewards:true};assert.equal(rewardAdBlockReason(t),'');assert.ok(rewardAdBlockReason({...t,item:'dailyCheckin'}));assert.ok(rewardAdBlockReason({...t,testRewards:false}));
});
test('broken native bridge returns failure rather than swallowing the click in an exception',()=>{
 globalThis.window={addEventListener(){},CockroAds:{postMessage(){throw Error('bridge closed');}}};
 assert.equal(new RewardedAdsClient().show({nonce:'n',user:'u'}),false);delete globalThis.window;
});
