import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createCommerce} from '../server/commerce.js';
import {fresh} from '../web/core.js';
function setup(t){const dir=mkdtempSync(join(tmpdir(),'vault-pin-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const a={id:'a'.repeat(64),account:'owner',map:'town',hp:100,s:fresh('sword-cockro')},b={...a,id:'b'.repeat(64),s:fresh('sword-cockro')};a.s.stones=100;const players=new Map([[a.id,a],[b.id,b]]),c=createCommerce(dir,{players:()=>players});const run=(p,action,fields={})=>c.run(p,{action,revision:c.view(p).revision,...fields});return {a,b,c,run,dir,players};}
test('PIN changes and deposits require valid inputs and expiry locks withdrawals',t=>{const {a,c,run}=setup(t);assert.throws(()=>run(a,'setVaultPin',{pin:'123'}),/invalid_pin/);run(a,'setVaultPin',{pin:'123456'});assert.throws(()=>run(a,'changeVaultPin',{pin:'999999',oldPin:'000000'}),/wrong_pin/);const clock=Date.now;Date.now=()=>clock()+301000;try{assert.equal(c.view(a).vault,null);assert.throws(()=>run(a,'withdrawMoney',{currency:'stones',amount:1}),/vault_locked/);}finally{Date.now=clock;}});

