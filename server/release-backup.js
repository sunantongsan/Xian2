import {mkdirSync,existsSync,readdirSync,copyFileSync,cpSync,writeFileSync,renameSync,constants} from 'node:fs';
import {join} from 'node:path';

// Run before listening or migrating any saves. Failure prevents the new server starting.
export function backupBefore416(directory,release='4.16.0'){
 mkdirSync(directory,{recursive:true,mode:0o700});
 const root=join(directory,'release-backups'),final=join(root,'before-'+release);
 if(existsSync(join(final,'complete.json')))return false;
 mkdirSync(root,{recursive:true,mode:0o700});
 const stage=join(root,`before-${release}-${Date.now()}-${process.pid}`);
 mkdirSync(stage,{mode:0o700});
 const names=readdirSync(directory).filter(n=>/^[a-f0-9]{64}\.json$/.test(n));
 for(const name of names)copyFileSync(join(directory,name),join(stage,name),constants.COPYFILE_EXCL);
 for(const name of ['accounts','deleted-characters','account-deletions','commerce.json','commerce-pending.json','referrals.json','play-receipts','account-cleanup-key.pem'])if(existsSync(join(directory,name)))cpSync(join(directory,name),join(stage,name),{recursive:true,errorOnExist:true,force:false});
 writeFileSync(join(stage,'complete.json'),JSON.stringify({release,accounts:names.length,created:new Date().toISOString()}),{mode:0o600,flag:'wx'});
 renameSync(stage,final);
 console.log(`Pre-${release} backup complete: ${names.length} accounts`);
 return true;
}


