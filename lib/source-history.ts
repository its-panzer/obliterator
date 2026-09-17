import {catalog,type SourceKind} from "./catalog";

export const sourceHistoryKey = "obliterator.source-history.v1";
type HistoryStorage = Pick<Storage,"getItem"|"setItem">;

/** Separate from preferences: layers still start enabled/disabled as before. */
export function createSourceHistory(storage?:HistoryStorage) {
  const memory:Record<SourceKind,string[]>={music:[],asmr:[],"pink-noise":[]};
  return {
    read(kind:SourceKind):string[] {
      try {
        const raw=JSON.parse(storage?.getItem(`${sourceHistoryKey}.${kind}`)??"null");
        if(Array.isArray(raw)) memory[kind]=raw.filter((id:unknown):id is string=>
          typeof id==="string" && catalog.some(s=>s.kind===kind && s.id===id)).slice(-3);
      } catch { /* Keep session history when storage is unavailable or corrupt. */ }
      return [...memory[kind]];
    },
    write(kind:SourceKind,history:string[]) {
      memory[kind]=history.slice(-3);
      try {storage?.setItem(`${sourceHistoryKey}.${kind}`,JSON.stringify(memory[kind]));}
      catch { /* Rotation continues in memory for this session. */ }
    },
  };
}
