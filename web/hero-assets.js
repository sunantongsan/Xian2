import {humanFiles} from './human-hero.js';
import {mutationFiles} from './mutation-art.js';
import {layeredHeroFiles} from './layered-hero.js';
// Request only the selected look. Existing loaded art remains a fallback during a level transition.
export function heroAssetFiles(hero,level=1){const human=humanFiles(hero);if(human.length)return human;const evolved=mutationFiles(hero,level);return evolved.length?evolved:layeredHeroFiles(hero);}
export function createHeroAssetLoader(loadImage,onReady=()=>{}){
 const completed=new Set(),pending=new Map();
 return function loadHero(hero,level=1){
  const files=heroAssetFiles(hero,level),key=files.join('|');
  if(completed.has(key))return Promise.resolve();if(pending.has(key))return pending.get(key);
  const task=Promise.all(files.map(loadImage)).then(()=>{completed.add(key);onReady(hero);}).finally(()=>pending.delete(key));
  pending.set(key,task);return task;
 };
}
