"use client";
import {useEffect,useRef,useState} from "react";
import {ArrowUpRight,RotateCw,SkipForward,Volume2,VolumeX} from "lucide-react";
import {type SourceKind,sourceUrl} from "../lib/catalog";
import {SourceController,type PlayerSnapshot} from "../lib/controller";
import {loadYouTube} from "../lib/youtube";

const labels:Record<SourceKind,string>={music:"Music",asmr:"ASMR","pink-noise":"Pink noise"};
const statuses={loading:"Connecting…",ready:"Press Play in the video",playing:"Playing",paused:"Paused · press Play to resume",buffering:"Buffering…",error:"Source unavailable",blocked:"Press Play in the video"};
export default function SourcePlayer({controller,onSnapshot}:{controller:SourceController;onSnapshot:(kind:SourceKind,s:PlayerSnapshot)=>void}) {
  const [snapshot,setSnapshot]=useState(controller.snapshot);
  const [attempt,setAttempt]=useState(0);
  const [apiFailed,setApiFailed]=useState(false);
  const host=useRef<HTMLDivElement>(null);
  const card=useRef<HTMLElement>(null);
  const callback=useRef(onSnapshot);callback.current=onSnapshot;
  useEffect(()=>controller.subscribe(s=>{setSnapshot(s);callback.current(controller.kind,s);}),[controller]);
  useEffect(()=>{
    let active=true;
    const container=host.current!;
    const mount=document.createElement("div");container.replaceChildren(mount);
    setApiFailed(false);
    loadYouTube().then(api=>{
      if(active)controller.attach(api,mount,location.origin);
    }).catch(error=>{if(active){setApiFailed(true);controller.fail(error.message);}});
    return ()=>{active=false;controller.detach();};
  },[controller,attempt]);
  useEffect(()=>{
    const observer=new IntersectionObserver(([entry])=>{
      controller.setVisible(entry.isIntersecting && entry.intersectionRatio>=.99);
    },{threshold:[0,.99,1]});
    observer.observe(host.current!);
    return ()=>observer.disconnect();
  },[controller]);
  const {source,status,volume,muted}=snapshot;
  return <section ref={card} className="source-card" data-kind={controller.kind} data-status={status} aria-label={`${labels[controller.kind]} mixer`}>
    <div className="source-heading">
      <span className="eyebrow">{labels[controller.kind]}</span>
      <a href={sourceUrl(source.id,snapshot.time)} target="_blank" rel="noopener noreferrer" title={source.title} aria-label={`Open ${labels[controller.kind]} source: ${source.title}`}>Source <ArrowUpRight size={12}/></a>
    </div>
    <div className="source-name"><h2 title={source.title}>{source.shortTitle}</h2><span title={source.creator}>{source.creator}</span></div>
    <div className="youtube-host" ref={host}/>
    <div className="source-status" role="status"><span className={`status-dot ${status==="playing"?"playing":""}`}/><span>{snapshot.message||statuses[status]}</span></div>
    <div className="source-controls">
      <button className="icon-button" aria-label={`${muted?"Unmute":"Mute"} ${labels[controller.kind]}`} aria-pressed={muted} onClick={()=>controller.toggleMute()}>{muted||volume===0?<VolumeX size={17}/>:<Volume2 size={17}/>}</button>
      <input type="range" min="0" max="100" step="1" value={volume} onChange={e=>controller.setVolume(Number(e.target.value))} aria-label={`${labels[controller.kind]} volume`} style={{"--level":`${volume}%`} as React.CSSProperties}/>
      <span className="volume-value">{volume}</span>
      {status==="error"?<button className="icon-button" aria-label={`Retry ${labels[controller.kind]}`} onClick={()=>apiFailed?setAttempt(n=>n+1):controller.retry()}><RotateCw size={16}/></button>:null}
      <button className="icon-button next-button" aria-label={`Next ${labels[controller.kind]} source`} disabled={apiFailed} onClick={()=>controller.next()}><SkipForward size={17}/></button>
    </div>
  </section>;
}
