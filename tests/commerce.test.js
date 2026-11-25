import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createCommerce} from '../server/commerce.js';
import {fresh} from '../web/core.js';
import {makeItem} from '../web/gear.js';
function fixture(t,extra={}){const dir=mkdtempSync(join(tmpdir(),'commerce-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const a={id:'a'.repeat(64),account:'a'.repeat(64),name:'A',map:'town',hp:100,x:0,y:0,s:fresh('sword-cockro')};const b={...a,id:'b'.repeat(64),account:'b'.repeat(64),name:'B',s:fresh('sword-dragonfly')};a.s.stones=b.s.stones=10000;const players=new Map([[a.id,a],[b.id,b]]),actors=new Map(players);const c=createCommerce(dir,{players:()=>players,getActor:id=>actors.get(id),...extra});const run=(p,action,fields={})=>c.run(p,{action,revision:c.view(p).revision,...fields});run(a,'setVaultPin',{pin:'123456'});run(b,'setVaultPin',{pin:'654321'});return {dir,a,b,players,actors,c,run};}
test('7.3.0 closes trading: no deposits, listings, shops or purchases between players',t=>{const {a,run}=fixture(t);run(a,'unlockVault',{pin:'123456'});for(const action of ['depositMoney','depositItem','listItem','openShop','buy','updatePromotion'])assert.throws(()=>run(a,action,{amount:1,kind:'potion',id:'hp',quantity:1,price:1,currency:'stones'}),/trading_closed/);});
