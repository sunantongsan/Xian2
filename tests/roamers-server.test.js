import test from 'node:test';
import assert from 'node:assert/strict';
test('server never persists patrol actors as player save files',async()=>{
 const {startServer}=await import('../server/server.js');const {mkdtempSync,readdirSync,rmSync}=await import('node:fs');const {tmpdir}=await import('node:os');const {join}=await import('node:path');const {once}=await import('node:events');
 const directory=mkdtempSync(join(tmpdir(),'cockro-patrol-'));const app=startServer({directory,port:0,test:true,roamers:true});await once(app.server,'listening');
 try{assert.equal(app.world.roamers.size,12);await app.close();assert.ok(readdirSync(directory).every(n=>!n.startsWith('roamer-')));}finally{rmSync(directory,{recursive:true,force:true});}
});
