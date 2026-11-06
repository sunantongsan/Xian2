import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {defaultLanguage,createLanguage} from '../web/language.js';
import {identityLanguage} from '../server/language.js';
import {createAccounts} from '../server/accounts.js';
import {fresh} from '../web/core.js';
import {language,t,ui} from '../web/i18n.js';
test('country selects default, manual preference wins, unknown countries use locale',()=>{
 for(const [profile,device,want] of [[{country:'TH',locale:'en-US'},'en','th'],[{country:'US',locale:'th-TH'},'th','en'],[{country:'TH',language:'en'},'th','en'],[{locale:'th_TH'},'en','th'],[{},'th-TH','th'],[{},'ja-JP','en'],[{country:123,locale:null},null,'en']])assert.equal(defaultLanguage(profile,device),want);
});
test('manual language is account-scoped and survives reload',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 const a=createLanguage({storage,deviceLocale:'th-TH'});a.bind('alice');a.choose('en');
 assert.equal(a.bind('bob'),'th');assert.equal(a.bind('alice'),'en');
 const b=createLanguage({storage,deviceLocale:'th-TH'});assert.equal(b.bind('alice'),'en');assert.equal(b.bind('alice',{language:'th'}),'th');assert.throws(()=>b.choose('fr'));
 const unavailable=createLanguage({storage:{getItem(){throw Error();},setItem(){throw Error();}},deviceLocale:'th'});assert.equal(unavailable.bind('alice'),'th');assert.equal(unavailable.choose('en'),'en');
});
test('identity metadata validates values without guessing country from name or email',()=>{
 assert.deepEqual(identityLanguage({user_metadata:{country_code:'th',locale:'th-TH'}}),{country:'TH',locale:'th-TH'});
 assert.deepEqual(identityLanguage({user_metadata:{name:'ไทย',email:'thai@example.th',country_code:{},locale:[]}}),{});
});
test('server preference survives restart and invalid values cannot replace it',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'cockro-language-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const token='a'.repeat(64),account=createHash('sha256').update(token).digest('hex');const save=fresh('sword-cockro');save.name='QA';writeFileSync(join(dir,account+'.json'),JSON.stringify(save));
 let api=createAccounts(dir);assert.equal((await api.manage(token,{action:'status',deviceLocale:'th-TH'})).language,'th');await api.manage(token,{action:'language',language:'en'});api=createAccounts(dir);assert.equal((await api.manage(token,{action:'status',deviceLocale:'th-TH'})).language,'en');await assert.rejects(api.manage(token,{action:'language',language:'zz'}));assert.equal(api.languageProfile(account,'th').language,'en');
});
test('UI localizes authored text without changing interpolated player names',()=>{
 language.choose('en');assert.equal(t('กลับ'),'Back');assert.equal(ui`<h2>ตั้งค่า</h2><b>${'กลับ'}</b>`,'<h2>Settings</h2><b>กลับ</b>');language.choose('th');assert.equal(t('กลับ'),'กลับ');
});

test('catalogue labels switch both ways without changing gameplay identities',async()=>{
 const {HERO_CLASSES}=await import('../web/hero-ui.js');const {SLOTS,TIERS}=await import('../web/gear.js');const {UPGRADE_ITEMS}=await import('../web/upgrade-items.js');
 const records=[...HERO_CLASSES,...Object.values(SLOTS),...TIERS,...Object.values(UPGRADE_ITEMS)];
 language.choose('th');const thai=records.map(r=>r.name),ids=HERO_CLASSES.map(h=>h.id);
 language.choose('en');for(const r of records)assert.doesNotMatch(r.name,/[\u0e00-\u0e7f]/);
 language.choose('th');assert.deepEqual(records.map(r=>r.name),thai);assert.deepEqual(HERO_CLASSES.map(h=>h.id),ids);
});
test('server notices translate while chat and player payloads remain byte-identical',async()=>{
 const {localizeNotice}=await import('../web/i18n.js');language.choose('en');
 assert.equal(localizeNotice({type:'opResult',message:'แต้มไม่พอหรือจำนวนไม่ถูกต้อง'}).message,'Insufficient points or invalid amount');
 for(const type of ['chat','state','roster']){const payload={type,name:'กลับ',text:'ตั้งค่า',message:'ภาษา'};assert.equal(localizeNotice(payload),payload);}
 language.choose('th');
});
