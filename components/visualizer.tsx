"use client";
import {useEffect,useRef,useState} from "react";
import type {VisualMode,VisualStyle} from "../lib/catalog";
import type {PlayerSnapshot} from "../lib/controller";
import ContourVisualizer from "./contour-visualizer";
import type {createAttractorRenderer} from "../lib/attractor-renderer";

type Renderer=Awaited<ReturnType<typeof createAttractorRenderer>>;
function AttractorVisualizer({music,mode}:{music:PlayerSnapshot|null;mode:VisualMode}) {
  const canvas=useRef<HTMLCanvasElement>(null),input=useRef({music,mode});
  const renderer=useRef<Renderer|null>(null);
  const [failed,setFailed]=useState(false);
  input.current={music,mode};
  useEffect(()=>{renderer.current?.refresh();},[mode,music?.status]);
  useEffect(()=>{
    let cancelled=false,unavailable=false;
    const fail=()=>{unavailable=true;if(!cancelled)setFailed(true);};
    void import("../lib/attractor-renderer").then(async({createAttractorRenderer})=>{
      if(cancelled)return;
      const instance=await createAttractorRenderer(canvas.current!,()=>input.current,fail,()=>cancelled);
      if(cancelled||unavailable){await instance.dispose();return;}
      renderer.current=instance;
    }).catch(fail);
    return()=>{cancelled=true;void renderer.current?.dispose();renderer.current=null;};
  },[]);
  useEffect(()=>{if(failed){void renderer.current?.dispose();renderer.current=null;}},[failed]);
  if(failed)return <><ContourVisualizer music={music} mode={mode}/><span className="visual-fallback-note" role="status">Particles unavailable. Showing contours.</span></>;
  return <div className="visual-field particle-field" aria-hidden="true"><canvas ref={canvas}/></div>;
}
export default function Visualizer({music,mode,style}:{music:PlayerSnapshot|null;mode:VisualMode;style:VisualStyle}) {
  if(mode==="off")return null;
  return style==="particles"?<AttractorVisualizer music={music} mode={mode}/>:<ContourVisualizer music={music} mode={mode}/>;
}
