// Server and renderer share the same road endpoints; level ranges describe monsters only.
import {MAPS,toWorld} from './maps.js';
import {DEPTHS_EXIT,DEPTHS_MIN_LEVEL} from './crystal-depths.js';
// `gate` is where the road label is painted: walking onto the label leaves town (7.9.1).
export const TOWN_ROADS=[{id:'depths',from:[.27,.50],end:[.06,.50],gate:[.144,.50],arrival:[.22,.50],min:DEPTHS_MIN_LEVEL},{id:'forest',from:[.5,.76],end:[.5,.94],gate:[.5,.809],arrival:[.5,.74],min:1},{id:'star',from:[.73,.50],end:[.94,.50],gate:[.787,.50],arrival:[.72,.50],min:61},{id:'aurora',from:[.67,.77],end:[.79,.89],gate:[.702,.802],arrival:[.65,.75],min:1}];
export const FOREST_ROAD_EXIT=[1/6,.95],FOREST_ROAD_ARRIVAL=[1/6,.91];
export function roadDestination(map,point,level,star){
 const near=w=>Math.hypot(point.x-w.x,point.y-w.y)<85;
 if(map==='town')for(const r of TOWN_ROADS)if((r.id!=='depths'||level>=DEPTHS_MIN_LEVEL)&&near(toWorld(r.gate||r.end,MAPS.town)))return {map:r.id,road:r.id};
 if(map==='depths'&&near(toWorld(DEPTHS_EXIT,MAPS.depths)))return {map:'town',road:'depths'};
 if(map==='forest'&&near(toWorld(FOREST_ROAD_EXIT,MAPS.forest)))return {map:'town',road:'forest'};
 if(map==='aurora'){if(near(toWorld([.5,.94],MAPS.aurora)))return {map:'town',road:'aurora'};if(near(toWorld([.94,.54],MAPS.aurora)))return {map:'ruins',road:'aurora'};}
 if(map==='ruins'&&near(toWorld(FOREST_ROAD_EXIT,MAPS.ruins)))return {map:'aurora',road:'ruins'};
 if(map==='star'){const gate=star.pois.find(p=>p.action==='town');if(gate&&near(gate.world))return {map:'town',road:'star'};}
 return null;
}
export function roadArrival(destination,star){if(destination.map==='depths')return toWorld(MAPS.depths.spawn,MAPS.depths);if(destination.map==='aurora')return toWorld(destination.road==='ruins'?[.87,.54]:[.5,.87],MAPS.aurora);if(destination.map==='ruins')return toWorld(FOREST_ROAD_ARRIVAL,MAPS.ruins);if(destination.map==='town')return toWorld(TOWN_ROADS.find(r=>r.id===destination.road).arrival,MAPS.town);if(destination.map==='forest')return toWorld(FOREST_ROAD_ARRIVAL,MAPS.forest);const g=star.pois.find(p=>p.action==='warp'&&p.zone===0);return {x:g.world.x+40,y:g.world.y+70};}
