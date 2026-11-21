// Shared model palette: preserve geometry, skinning and animation clips.
const palette={
 Burnished_Umber_Chitin:{color:0xef343b,metalness:.18,roughness:.42,emissive:0x4c0509,emissiveIntensity:.22},
 Graphite_Undersuit:{color:0x962c36,metalness:.05,roughness:.72},
 Joint_Seals:{color:0x632e38,metalness:.08,roughness:.6},
 Warm_Bronze_Edge:{color:0xffcb66,metalness:.45,roughness:.3},
 Smoked_Amber_Visor:{color:0xffcf57,metalness:.25,roughness:.24,emissive:0xff9a19,emissiveIntensity:.18}
};
export function applyCockroachPalette(root){root.traverse(o=>{if(!o.isMesh)return;const recolor=source=>{const colors=palette[source.name];if(!colors)return source;const m=source.clone();m.color.setHex(colors.color);m.metalness=colors.metalness;m.roughness=colors.roughness;if(colors.emissive!==undefined){m.emissive.setHex(colors.emissive);m.emissiveIntensity=colors.emissiveIntensity;}return m;};o.material=Array.isArray(o.material)?o.material.map(recolor):recolor(o.material);});}
