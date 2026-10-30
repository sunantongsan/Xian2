// Server and renderer share the same road endpoints and level gates.
import {MAPS,toWorld} from './maps.js';
export const TOWN_ROADS=[{id:'forest',from:[.5,.76],end:[.5,.94],arrival:[.5,.87],min:1},{id:'star',from:[.73,.54],end:[.94,.54],arrival:[.87,.54],min:61}];
export const FOREST_ROAD_EXIT=[1/6,.95],FOREST_ROAD_ARRIVAL=[1/6,.91];
export function roadDestination(map,point,level,star){
 const near=w=>Math.hypot(point.x-w.x,point.y-w.y)<85;
 if(map==='town')for(const r of TOWN_ROADS)if(near(toWorld(r.end,MAPS.town)))return level>=r.min?{map:r.id,road:r.id}:null;
 if(map==='forest'&&near(toWorld(FOREST_ROAD_EXIT,MAPS.forest)))return {map:'town',road:'forest'};
 if(map==='star'){const gate=star.pois.find(p=>p.action==='town');if(gate&&near(gate.world))return {map:'town',road:'star'};}
 return null;
}
export function roadArrival(destination,star){if(destination.map==='town')return toWorld(TOWN_ROADS.find(r=>r.id===destination.road).arrival,MAPS.town);if(destination.map==='forest')return toWorld(FOREST_ROAD_ARRIVAL,MAPS.forest);const g=star.pois.find(p=>p.action==='warp'&&p.zone===0);return {x:g.world.x+40,y:g.world.y+70};}
