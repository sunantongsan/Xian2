import {readdirSync,readFileSync,writeFileSync,renameSync} from 'node:fs';import {join} from 'node:path';
// Caller must complete release backup before the first mutation.
export function migrateRetiredSystems(directory){
 let changed=0;for(const name of readdirSync(directory).filter(n=>/^[a-f0-9]{64}\.json$/.test(n))){const path=join(directory,name),s=JSON.parse(readFileSync(path,'utf8')),before=JSON.stringify(s);
 s.upgradeItems={};s.townBuffUntil=0;s.fashion={owned:[],equipped:{hat:null,outfit:null}};
 for(const it of [...Object.values(s.equip||{}),...(s.bag||[])])if(it?.gems)it.gems={};
 if(JSON.stringify(s)!==before){writeFileSync(path+'.retired.tmp',JSON.stringify(s),{mode:0o600});renameSync(path+'.retired.tmp',path);changed++;}
 }return changed;
}
