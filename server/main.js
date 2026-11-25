import {startServer} from './server.js';
import {backupBefore416} from './release-backup.js';
backupBefore416(process.env.COCKRO_ONLINE_DATA||'/var/lib/cockro-online','7.2.0-skill-books');
import ads from '../admob-config.json' with {type:'json'};
// ISO 8601 dates with explicit time zones, for example 2026-12-01T00:00:00+07:00.
const goldEvent=process.env.COCKRO_GOLD_EVENT_START?{
 startMs:Date.parse(process.env.COCKRO_GOLD_EVENT_START),
 endMs:Date.parse(process.env.COCKRO_GOLD_EVENT_END),
 multiplier:Number(process.env.COCKRO_GOLD_EVENT_MULTIPLIER)
}:undefined;
const app=startServer({goldEvent,testRewards:false,directory:process.env.COCKRO_ONLINE_DATA||'/var/lib/cockro-online',port:Number(process.env.PORT||8091),adUnit:process.env.ADMOB_REWARDED_UNIT_ID??ads.rewardedUnitId});
console.log('COCKRO online server started on loopback');
for(const sig of ['SIGTERM','SIGINT'])process.on(sig,async()=>{await app.close();process.exit(0);});






