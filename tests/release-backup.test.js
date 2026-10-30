import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {backupBefore416} from '../server/release-backup.js';
test('release backup preserves original balances and is never overwritten by migrated saves',()=>{
 const dir=mkdtempSync(join(tmpdir(),'cockro-backup-'));
 try{
  const name='a'.repeat(64)+'.json',original='{"gold":75,"money":12345}';
  writeFileSync(join(dir,name),original);
  assert.equal(backupBefore416(dir),true);
  writeFileSync(join(dir,name),'{"gold":50075}');
  assert.equal(backupBefore416(dir),false);
  assert.equal(readFileSync(join(dir,'release-backups','before-4.16.0',name),'utf8'),original);
  assert.equal(JSON.parse(readFileSync(join(dir,'release-backups','before-4.16.0','complete.json'))).accounts,1);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
