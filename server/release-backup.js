import {mkdirSync,existsSync,readdirSync,copyFileSync,writeFileSync,renameSync,constants} from 'node:fs';
import {join} from 'node:path';

// Run before listening or migrating any saves. Failure prevents the new server starting.
export function backupBefore416(directory){
 mkdirSync(directory,{recursive:true,mode:0o700});
 const root=join(directory,'release-backups'),final=join(root,'before-4.16.0');
 if(existsSync(join(final,'complete.json')))return false;
 mkdirSync(root,{recursive:true,mode:0o700});
 const stage=join(root,`before-4.16.0-${Date.now()}-${process.pid}`);
 mkdirSync(stage,{mode:0o700});
 const names=readdirSync(directory).filter(n=>/^[a-f0-9]{64}\.json$/.test(n));
 for(const name of names)copyFileSync(join(directory,name),join(stage,name),constants.COPYFILE_EXCL);
 writeFileSync(join(stage,'complete.json'),JSON.stringify({release:'4.16.0',accounts:names.length,created:new Date().toISOString()}),{mode:0o600,flag:'wx'});
 renameSync(stage,final);
 console.log(`Pre-4.16.0 backup complete: ${names.length} accounts`);
 return true;
}
