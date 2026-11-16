import {suitIcon} from './insect-armor.js';
// Alpha bounds include a three-pixel margin: fit the full suit, not transparent padding.
const BOUNDS={"scorpion-male": [23, 20, 66, 87], "ladybug-female": [18, 11, 76, 97], "beetle-female": [21, 14, 70, 94], "scorpion-female": [23, 11, 65, 96], "ladybug-male": [18, 10, 76, 97], "cockroach-male": [22, 18, 68, 89], "dragonfly-female": [16, 14, 77, 94], "cockroach-female": [20, 13, 72, 94], "mantis-male": [26, 13, 59, 95], "mantis-female": [28, 15, 56, 93]};
export function suitItemArt(item){
 const file=suitIcon(item),box=BOUNDS[item?.insect];if(!file||!box)return '';
 return `<svg class="suit-item-art" viewBox="${box.join(' ')}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false"><image href="${file}" width="112" height="112" /></svg>`;
}
