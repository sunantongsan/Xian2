// Per-connection cursor: WebSocket is ordered; reconnect starts a new cursor.
export function stateForWire(data,cursor=0){
 if(data.type!=='state')return data;
 return {...data,events:data.events.filter(e=>e.id>cursor)};
}
