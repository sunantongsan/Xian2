import {startServer} from './server.js';
import ads from '../admob-config.json' with {type:'json'};
const app=startServer({directory:process.env.COCKRO_ONLINE_DATA||'/var/lib/cockro-online',port:Number(process.env.PORT||8091),adUnit:process.env.ADMOB_REWARDED_UNIT_ID??ads.rewardedUnitId});
console.log('COCKRO online server started on loopback');
for(const sig of ['SIGTERM','SIGINT'])process.on(sig,async()=>{await app.close();process.exit(0);});

