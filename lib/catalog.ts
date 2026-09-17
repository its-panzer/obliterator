export type SourceKind = "music" | "asmr" | "pink-noise";
export type VisualMode = "motion" | "still" | "off";
export type VisualStyle = "particles" | "contours";
export type Palette = [number, number, number];
export interface Mood { color: Palette; secondary: Palette; energy: number; scale: number }
export interface Source {
  id: string;
  kind: SourceKind;
  title: string;
  shortTitle: string;
  creator: string;
  tag: string;
  duration: number;
  entries: number[];
  chapters: number[];
  volume: number;
  mood?: Mood;
  evidence: "creator-metadata";
}

// Entry points are published chapter boundaries, not acoustic measurements.
// Equal slider levels are provisional; perceived balance is listener adjustable.
export const catalog: Source[] = [
  {id:"wOMwO5T3yT4",kind:"music",title:"ＳＰＡＣＥ　ＴＲＩＰ [ Chillwave - Synthwave - Retrowave Mix ]",shortTitle:"Space Trip",creator:"Asthenic",tag:"Synthwave",duration:2246,entries:[334,632,944],chapters:[0,334,632,944,1125,1458,1784,2040],volume:50,mood:{color:[.46,.60,.54],secondary:[.48,.48,.65],energy:.4,scale:1},evidence:"creator-metadata"},
  {id:"bJGvLLEZQAA",kind:"music",title:"2814 : 新しい日の誕生",shortTitle:"新しい日の誕生",creator:"2814 · Vapor Memory",tag:"Vaporwave",duration:4045,entries:[351,729,1260],chapters:[0,351,729,1260,1656,2219,2651,3259],volume:50,mood:{color:[.61,.46,.56],secondary:[.42,.53,.59],energy:.25,scale:.92},evidence:"creator-metadata"},
  {id:"DAleE9JDQKE",kind:"music",title:"'CURSED' | Best of Darkwave and Darksynth Halloween Music Mix For 1 Hour",shortTitle:"Cursed",creator:"ThePrimeThanatos",tag:"Darksynth",duration:3716,entries:[0],chapters:[],volume:50,mood:{color:[.62,.40,.34],secondary:[.39,.40,.52],energy:.6,scale:1.1},evidence:"creator-metadata"},
  {id:"CKJrNY2TD6c",kind:"music",title:"ＭＥＭＯＲＩＥＳ ＩＶ [ Synthwave - Dreamwave - Retrowave Mix ]",shortTitle:"Memories IV",creator:"Asthenic",tag:"Dreamwave",duration:2365,entries:[250,425,660],chapters:[0,250,425,660,844,1034,1240,1498,1682,1914,2103],volume:50,mood:{color:[.49,.58,.66],secondary:[.57,.48,.62],energy:.3,scale:.95},evidence:"creator-metadata"},
  {id:"kwLTw8F8yN8",kind:"music",title:"Waves - A Chillwave Mix",shortTitle:"Waves",creator:"Odysseus",tag:"Chillwave",duration:3092,entries:[217,464,740,978],chapters:[0,217,464,740,978,1196,1506,1747,1962,2206,2444,2644,2886],volume:50,mood:{color:[.54,.63,.43],secondary:[.37,.54,.52],energy:.25,scale:.9},evidence:"creator-metadata"},
  {id:"mo2OFxbJWUQ",kind:"asmr",title:"ASMR Hypnotic Mic Brushing for Deep, Peaceful Sleep with 3D Brain Penetrations (No Talking)",shortTitle:"Soft brushing",creator:"ASMR Bakery",tag:"Brushing",duration:3841,entries:[592,999,1311],chapters:[0,242,592,999,1311,1675,2013,2404,2765,3147,3506],volume:50,evidence:"creator-metadata"},
  {id:"9CVWDtdBOlY",kind:"asmr",title:"ASMR 1 Hour Tapping Session (No Talking)",shortTitle:"An hour of tapping",creator:"ASMR Bakery",tag:"Tapping",duration:3844,entries:[53,561,1048],chapters:[0,53,561,1048,1466,1954,2360,2954,3397],volume:50,evidence:"creator-metadata"},
  {id:"uYXi3PJQAIQ",kind:"asmr",title:"ASMR PAGE TURNING • 1 HOUR [No Talking]",shortTitle:"Page turning",creator:"Prim ASMR",tag:"Paper",duration:3974,entries:[0],chapters:[],volume:50,evidence:"creator-metadata"},
  {id:"q76bMs-NwRk",kind:"asmr",title:"3 Hours of Gentle Night Rain, Rain Sounds for Sleeping - Dark Screen to Beat insomnia, Relax, Study",shortTitle:"Gentle night rain",creator:"The Relaxed Guy",tag:"Rain",duration:10896,entries:[0],chapters:[],volume:50,evidence:"creator-metadata"},
  {id:"HIkAOMw_sjw",kind:"pink-noise",title:"Pink Noise Black Screen | Sleep, Focus, Study | 10 Hours",shortTitle:"Pink noise",creator:"Relaxing White Noise",tag:"Pink noise",duration:36036,entries:[0],chapters:[],volume:20,evidence:"creator-metadata"},
  {id:"scI2l4rw68w",kind:"pink-noise",title:"PINK NOISE | Fight Insomnia, Sleep Well, Be Energized In The Morning",shortTitle:"Pink noise · alternate",creator:"Relaxing White Noise",tag:"Pink noise",duration:36000,entries:[0],chapters:[],volume:20,evidence:"creator-metadata"},
];

export const neutralMood: Mood = {color:[.5,.6,.45],secondary:[.35,.48,.48],energy:.2,scale:1};

/** Seedable only for repeatable tests. Production uses a fresh cryptographic seed. */
export function seededRandom(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6d2b79f5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function selectSource(kind: SourceKind, history: string[], random: () => number) {
  const pool = catalog.filter(s => s.kind === kind);
  const last = pool.find(s => s.id === history.at(-1));
  // Different videos can share a channel; vary the creator when possible too.
  const otherCreators = pool.filter(s => s.creator !== last?.creator);
  const eligible = otherCreators.length ? otherCreators : pool.filter(s => s.id !== last?.id);
  let candidates = eligible.filter(s => !history.includes(s.id));
  if (!candidates.length) candidates = eligible;
  if (!candidates.length) candidates = pool;
  const source = candidates[Math.floor(random() * candidates.length)];
  const entries = source.entries.filter(t => t <= source.duration - 900);
  const start = entries[Math.floor(random() * entries.length)] ?? 0;
  return {source,start};
}

export function sourceUrl(id: string, seconds = 0) {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(id)}${seconds > 0 ? `&t=${Math.floor(seconds)}s` : ""}`;
}

/** Authored mood variations are not measured music energy or beat detection. */
export function musicMood(source: Source, time: number): Mood {
  if (source.kind !== "music" || !source.mood) return neutralMood;
  const chapter = Math.max(0, source.chapters.findLastIndex(t => t <= time));
  return {...source.mood, energy:source.mood.energy + (chapter % 3 - 1) * .035};
}
