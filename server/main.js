import {startServer} from './server.js';
const app=startServer({directory:process.env.COCKRO_ONLINE_DATA||'/var/lib/cockro-online',port:Number(process.env.PORT||8091)});
console.log('COCKRO online server started on loopback');
for(const sig of ['SIGTERM','SIGINT'])process.on(sig,async()=>{await app.close();process.exit(0);});
