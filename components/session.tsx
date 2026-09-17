"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {flushSync} from "react-dom";
import {Maximize,Minimize,Pause} from "lucide-react";
import {seededRandom,type SourceKind,type VisualMode,type VisualStyle} from "../lib/catalog";
import {SourceController,type PlayerSnapshot} from "../lib/controller";
import {readPreferences,savePreferences,type Preferences} from "../lib/preferences";
import SourcePlayer from "./source-player";
import Visualizer from "./visualizer";
import {registerMixTools} from "../lib/webmcp";
import {createSourceHistory} from "../lib/source-history";

const layerOrder:SourceKind[]=["music","asmr","pink-noise"];
const layerLabels:Record<SourceKind,string>={music:"Music",asmr:"ASMR","pink-noise":"Pink noise"};

function Credits(){
  return <footer className="site-credits"><a href="https://twitter.com/panzer" target="_blank" rel="noopener noreferrer">by @panzer</a><span aria-hidden="true">·</span><a href="https://github.com/its-panzer/obliterator" target="_blank" rel="noopener noreferrer">GitHub ↗</a></footer>;
}

export default function Session() {
  const [started,setStarted]=useState(false);
  const [controllers,setControllers]=useState<SourceController[]>([]);
  const [mode,setMode]=useState<VisualMode>("still");
  const [visualStyle,setVisualStyle]=useState<VisualStyle>("particles");
  const lastMotionMode=useRef<"motion"|"still">("motion");
  const [music,setMusic]=useState<PlayerSnapshot|null>(null);
  const [fullscreen,setFullscreen]=useState(false);
  const [notice,setNotice]=useState("");
  const [reduced,setReduced]=useState(false);
  const prefs=useRef<Preferences>({volumes:{music:50,asmr:50,"pink-noise":20},visualMode:"still",visualStyle:"particles"});
  const active=useRef<SourceController[]>([]);
  const all=useRef(new Set<SourceController>());
  const main=useRef<HTMLElement>(null);
  const sourceHistory=useRef<ReturnType<typeof createSourceHistory>|null>(null);
  const create=useCallback((kind:SourceKind)=>{
    if(!sourceHistory.current){
      try{sourceHistory.current=createSourceHistory(localStorage);}
      catch{sourceHistory.current=createSourceHistory();}
    }
    const history=sourceHistory.current;
    const seed=crypto.getRandomValues(new Uint32Array(1))[0];
    const controller=new SourceController(kind,seededRandom(seed),prefs.current.volumes[kind],history.read(kind),next=>history.write(kind,next));
    all.current.add(controller);return controller;
  },[]);
  useEffect(()=>{
    const motion=matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(motion.matches);
    try{prefs.current=readPreferences(localStorage,motion.matches);}catch{prefs.current={volumes:{music:50,asmr:50,"pink-noise":20},visualMode:motion.matches?"still":"motion",visualStyle:"particles"};}
    setMode(prefs.current.visualMode);setVisualStyle(prefs.current.visualStyle);
    lastMotionMode.current=prefs.current.visualMode==="still"?"still":"motion";
    const initial=[create("music"),create("asmr")];active.current=initial;setControllers(initial);
    const visibility=()=>{if(document.hidden)active.current.forEach(c=>c.pause());};
    const reducedChange=()=>{setReduced(motion.matches);if(motion.matches){setMode("still");prefs.current.visualMode="still";}};
    const fsChange=()=>setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("visibilitychange",visibility);document.addEventListener("fullscreenchange",fsChange);motion.addEventListener("change",reducedChange);
    const owned=all.current;
    return()=>{owned.forEach(c=>c.destroy());owned.clear();document.removeEventListener("visibilitychange",visibility);document.removeEventListener("fullscreenchange",fsChange);motion.removeEventListener("change",reducedChange);};
  },[create]);
  const persist=useCallback(()=>{try{savePreferences(localStorage,prefs.current);}catch{/* Disabled storage. */}},[]);
  useEffect(()=>registerMixTools(
    ()=>({visualStyle:prefs.current.visualStyle,visualMode:prefs.current.visualMode,pinkNoiseEnabled:active.current.some(c=>c.kind==="pink-noise"),sources:active.current.map(c=>({kind:c.kind,videoId:c.snapshot.source.id,title:c.snapshot.source.title,status:c.snapshot.status,seconds:c.snapshot.time,volume:c.snapshot.volume,muted:c.snapshot.muted}))}),
    ()=>active.current.forEach(c=>c.pause()),
  ),[]);
  const onSnapshot=useCallback((kind:SourceKind,snapshot:PlayerSnapshot)=>{
    if(kind==="music")setMusic(snapshot);
    if(prefs.current.volumes[kind]!==snapshot.volume){prefs.current.volumes[kind]=snapshot.volume;persist();}
  },[persist]);
  const toggleLayer=(kind:SourceKind)=>{
    const existing=active.current.find(c=>c.kind===kind);
    if(existing){
      existing.destroy();all.current.delete(existing);active.current=active.current.filter(c=>c!==existing);
      if(kind==="music")setMusic(null);
    }
    else active.current=[...active.current,create(kind)].sort((a,b)=>layerOrder.indexOf(a.kind)-layerOrder.indexOf(b.kind));
    setControllers([...active.current]);
  };
  const changeMode=(next:VisualMode)=>{if(reduced&&next==="motion")return;setMode(next);prefs.current.visualMode=next;if(next!=="off")lastMotionMode.current=next;persist();};
  const changeVisual=(next:VisualStyle|"none")=>{
    if(next==="none"){changeMode("off");return;}
    setVisualStyle(next);prefs.current.visualStyle=next;
    changeMode(reduced?"still":lastMotionMode.current);
  };
  const launch=()=>{
    // Reveal prepared players before requesting playback, within this same user click.
    flushSync(()=>setStarted(true));
    active.current.forEach(controller=>{
      const frame=main.current?.querySelector<HTMLIFrameElement>(`[data-kind="${controller.kind}"] iframe`);
      const rect=frame?.getBoundingClientRect();
      const visible=Boolean(rect && rect.width>=200 && rect.height>=200 && rect.top>=0 && rect.left>=0 && rect.bottom<=window.innerHeight+1 && rect.right<=window.innerWidth+1);
      controller.setVisible(visible);
      controller.playFromGesture();
    });
  };
  async function toggleFullscreen(){
    try{if(document.fullscreenElement)await document.exitFullscreen();else await main.current?.requestFullscreen();setNotice("");}
    catch{setNotice("Fullscreen isn’t available here. Use a separate browser window.");}
  }
  return <>
    <main className="entry" hidden={started}><button className="enter-button" onClick={launch}>obliterate me<span aria-hidden="true">↗</span></button><Credits/></main>
    <main className="session" ref={main} hidden={!started}>
    {started?<Visualizer mode={mode} music={music} style={visualStyle}/>:null}
    <header className="session-header">
      <div className="wordmark"><svg width="25" height="25" viewBox="0 0 32 32" fill="none" aria-hidden="true"><ellipse cx="16" cy="16" rx="12" ry="8" transform="rotate(-35 16 16)"/><ellipse cx="16" cy="16" rx="7" ry="4" transform="rotate(-35 16 16)"/></svg><h1>obliterator</h1></div>
      <div className="session-actions"><button className="text-button" onClick={()=>active.current.forEach(c=>c.pause())}><Pause size={14}/>Pause all</button><button className="icon-button" onClick={toggleFullscreen} aria-label={fullscreen?"Exit fullscreen":"Enter fullscreen"}>{fullscreen?<Minimize size={17}/>:<Maximize size={17}/>}</button></div>
    </header>
    <div className="scene-space">
      <div className="scene-caption"><span className="eyebrow">{music?.source.tag??"YOUR MIX"}</span><p>{music?.source.shortTitle??""}</p></div>
    </div>
    <div className="mixer-area">
      <div className="mixer-toolbar">
        <div className="visual-options">
          <fieldset className="visual-controls"><legend className="sr-only">Visualization</legend><span aria-hidden="true">Visuals</span>{(["particles","contours","none"] as const).map(value=>{
            const selected=value==="none"?mode==="off":mode!=="off"&&visualStyle===value;
            return <button key={value} className={selected?"selected":""} aria-pressed={selected} onClick={()=>changeVisual(value)}>{value[0].toUpperCase()+value.slice(1)}</button>;
          })}</fieldset>
          {mode!=="off"?<button className="still-control" aria-pressed={mode==="still"} disabled={reduced} title={reduced?"Reduced motion is enabled on your device":undefined} onClick={()=>changeMode(mode==="still"?"motion":"still")}>Still</button>:null}
        </div>
        <div className="layer-switches" role="group" aria-label="Audio layers">{layerOrder.map(kind=>{
          const enabled=controllers.some(c=>c.kind===kind);
          return <button key={kind} role="switch" aria-checked={enabled} className="noise-switch" onClick={()=>toggleLayer(kind)}><span>{layerLabels[kind]}</span><span className={`switch-track ${enabled?"checked":""}`} aria-hidden="true"><span/></span></button>;
        })}</div>
      </div>
      {controllers.length>0?<div className={`player-dock ${controllers.length===3?"three-layers":controllers.length===1?"single-layer":""}`}>{controllers.map(controller=><SourcePlayer key={controller.kind} controller={controller} onSnapshot={onSnapshot}/>)}</div>:null}
      <div className="mixer-foot"><span>{controllers.length?"Use Play in a video if needed. Keep this window visible.":"Enable a layer to prepare your mix."}</span></div>
      {notice?<p className="notice" role="status">{notice}</p>:null}
    </div>
    <Credits/>
  </main></>;
}
