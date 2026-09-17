// Art-directed color families, selected only by music metadata.
// Four simultaneous hues retain variation even when particle speeds converge.
export type ParticlePalette = readonly [string,string,string,string];
export const defaultParticlePalette:ParticlePalette=["#a17bda","#d878ae","#e0ab70","#65bdb2"];
const palettes:Record<string,ParticlePalette>={
  Synthwave:["#797fe0","#c878c3","#e4a077","#63b5c1"],
  Vaporwave:["#8f7bd9","#da78b2","#e6b77d","#62bcae"],
  Darksynth:["#7378cf","#b567ac","#dc817c","#caaa67"],
  Dreamwave:["#7b96dc","#b187d3","#dc9dab","#71bbb1"],
  Chillwave:["#69a9c9","#7dbb9d","#d4bb79","#c48fc1"],
};
export function particlePalette(tag?:string):ParticlePalette{return tag?palettes[tag]??defaultParticlePalette:defaultParticlePalette;}
