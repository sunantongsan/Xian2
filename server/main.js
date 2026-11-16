import {startServer} from './server.js';
import {backupBefore416} from './release-backup.js';
backupBefore416(process.env.COCKRO_ONLINE_DATA||'/var/lib/cockro-online','insect-professions-v2');
import ads from '../admob-config.json' with {type:'json'};
const app=startServer({testRewards:(process.env.COCKRO_TEST_REWARDS??String(ads.internalTestRewards||false))==='true',directory:process.env.COCKRO_ONLINE_DATA||'/var/lib/cockro-online',port:Number(process.env.PORT||8091),adUnit:process.env.ADMOB_REWARDED_UNIT_ID??ads.rewardedUnitId});
console.log('COCKRO online server started on loopback');
for(const sig of ['SIGTERM','SIGINT'])process.on(sig,async()=>{await app.close();process.exit(0);});







