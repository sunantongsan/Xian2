import {World as SoloWorld} from '../web/solo-world.js';
import mapJSON from '../web/maps/hero-star.json' with {type:'json'};
export {HEROES,PROTOCOL} from '../web/solo-world.js';
export class World extends SoloWorld {
 constructor(options={}){super({...options,mapJSON});}
}
