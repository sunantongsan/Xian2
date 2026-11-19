// Legacy materials and sockets retired in 7.1.1. Protection tickets live in chain-economy.js.
export const UPGRADE_ITEMS=Object.freeze({});
export const GEM_IDS=Object.freeze([]),GEM_CAP=0;
export function normalizeUpgradeItems(s){s.upgradeItems={};return s;}
export function normalizeGems(){return {};}
export function buyUpgradeItem(){return false;}
export function socketGem(){return false;}
