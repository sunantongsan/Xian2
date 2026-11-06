export function characterName(value){
 if(typeof value!=='string')return null;
 const name=value.normalize('NFC').trim().replace(/ +/g,' ');
 if(name.length<2||name.length>20||!/[\p{L}\p{N}]/u.test(name)||!/^[\p{L}\p{M}\p{N} _-]+$/u.test(name))return null;
 return name;
}
