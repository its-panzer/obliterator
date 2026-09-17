"use client";
import {useEffect,useRef,useState} from "react";
import {musicMood,neutralMood,type Mood,type VisualMode} from "../lib/catalog";
import type {PlayerSnapshot} from "../lib/controller";

const vertex = `#version 300 es
in vec2 a_position;
void main(){gl_Position=vec4(a_position,0.,1.);}`;
const fragment = `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform float u_phase;
uniform float u_energy;
uniform float u_scale;
uniform vec3 u_color;
uniform vec3 u_secondary;
out vec4 outputColor;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 r=mat2(.8,.6,-.6,.8);for(int i=0;i<5;i++){v+=a*noise(p);p=r*p*2.03+3.7;a*=.5;}return v;}
void main(){
  vec2 uv=gl_FragCoord.xy/u_resolution;
  float aspect=u_resolution.x/u_resolution.y;
  vec2 p=(uv-vec2(.40,.58))*vec2(aspect,1.);
  p*=1.5*u_scale;
  float t=u_phase;
  vec2 warp=vec2(fbm(p*1.35+vec2(t*.09,0.)),fbm(p*1.2+vec2(5.2,-t*.06)))-.5;
  vec2 q=p+warp*.55;
  q=mat2(.91,.41,-.41,.91)*q;
  float radius=length(q*vec2(.71,1.12));
  float terrain=radius+.13*fbm(q*3.+t*.02)+.018*sin(q.x*4.+t*.04);
  float bands=terrain*29.;
  float d=abs(fract(bands)-.5);
  float aa=max(fwidth(bands),.01);
  float line=1.-smoothstep(.027,.027+aa,d);
  float major=1.-smoothstep(.025,.025+aa,abs(fract(bands/4.)-.5)*4.);
  float field=smoothstep(.14,.37,radius)*(1.-smoothstep(.65,1.2,radius));
  float light=.4+.6*fbm(q*1.4+3.);
  vec3 ink=mix(u_color,u_secondary,smoothstep(-.4,.8,q.y));
  vec3 base=vec3(.090,.094,.098);
  vec3 color=base+ink*field*(line*.34+major*.11)*light;
  color+=ink*field*.018*(.6+u_energy);
  outputColor=vec4(color,1.);
}`;

export default function Visualizer({music,mode}:{music:PlayerSnapshot|null;mode:VisualMode}) {
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const input=useRef({music,mode});
  const invalidate=useRef<()=>void>(()=>{});
  const [fallback,setFallback]=useState(false);
  input.current={music,mode};
  useEffect(()=>{invalidate.current();},[mode]);
  useEffect(()=>{
    const canvas=canvasRef.current!;
    const gl=canvas.getContext("webgl2",{alpha:false,antialias:false,powerPreference:"low-power"});
    if(!gl){setFallback(true);return;}
    const shader=(type:number,source:string)=>{
      const s=gl.createShader(type)!;gl.shaderSource(s,source);gl.compileShader(s);
      if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){gl.deleteShader(s);throw new Error("Shader unavailable");}return s;
    };
    let program:WebGLProgram|null=null;
    let vs:WebGLShader|null=null;let fs:WebGLShader|null=null;let buffer:WebGLBuffer|null=null;
    let disposed=false;let raf=0;let last=0;let phase=0;
    let current:Mood={...neutralMood,color:[...neutralMood.color],secondary:[...neutralMood.secondary]};
    try {
      vs=shader(gl.VERTEX_SHADER,vertex);fs=shader(gl.FRAGMENT_SHADER,fragment);
      program=gl.createProgram()!;gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error("Renderer unavailable");
      gl.useProgram(program);buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      const loc=gl.getAttribLocation(program,"a_position");gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    } catch {setFallback(true);if(vs)gl.deleteShader(vs);if(fs)gl.deleteShader(fs);if(program)gl.deleteProgram(program);return;}
    const uniforms=Object.fromEntries(["resolution","phase","energy","scale","color","secondary"].map(k=>[k,gl.getUniformLocation(program!,`u_${k}`)]));
    function draw(now:number) {
      raf=0;
      if(disposed||document.hidden||input.current.mode==="off"||gl!.isContextLost())return;
      const moving=input.current.mode==="motion";
      if(moving&&last&&now-last<32){raf=requestAnimationFrame(draw);return;}
      const dt=Math.min(.1,last ? (now-last)/1000 : .033);last=now;
      const snapshot=input.current.music;
      const target=snapshot ? musicMood(snapshot.source,snapshot.time) : neutralMood;
      if(moving){
        const smooth=1-Math.exp(-dt/3),palette=1-Math.exp(-dt/20);
        current.energy+=(target.energy-current.energy)*smooth;current.scale+=(target.scale-current.scale)*smooth;
        for(let i=0;i<3;i++){current.color[i]+=(target.color[i]-current.color[i])*palette;current.secondary[i]+=(target.secondary[i]-current.secondary[i])*palette;}
        // Source state and playback speed come ONLY from the music controller.
        if(snapshot?.status==="playing")phase+=dt*(.34+current.energy*.3)*snapshot.rate;
      }
      const rect=canvas.getBoundingClientRect();
      const ratio=Math.min(window.devicePixelRatio||1,1.5);
      const w=Math.max(1,Math.round(rect.width*ratio)),h=Math.max(1,Math.round(rect.height*ratio));
      if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl!.viewport(0,0,w,h);}
      gl!.uniform2f(uniforms.resolution,w,h);gl!.uniform1f(uniforms.phase,phase);
      gl!.uniform1f(uniforms.energy,current.energy);gl!.uniform1f(uniforms.scale,current.scale);
      gl!.uniform3fv(uniforms.color,current.color);gl!.uniform3fv(uniforms.secondary,current.secondary);
      gl!.drawArrays(gl!.TRIANGLES,0,6);
      if(moving)raf=requestAnimationFrame(draw);
    }
    function refresh(){cancelAnimationFrame(raf);last=0;if(!disposed)raf=requestAnimationFrame(draw);}
    const resize=new ResizeObserver(refresh);resize.observe(canvas);
    const lost=(e:Event)=>{e.preventDefault();cancelAnimationFrame(raf);setFallback(true);};
    canvas.addEventListener("webglcontextlost",lost);
    document.addEventListener("visibilitychange",refresh);
    invalidate.current=refresh;refresh();
    return ()=>{
      disposed=true;cancelAnimationFrame(raf);resize.disconnect();invalidate.current=()=>{};
      canvas.removeEventListener("webglcontextlost",lost);document.removeEventListener("visibilitychange",refresh);
      gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
    };
  },[]);
  return <div className={`visual-field ${mode==="off"?"is-off":""}`} aria-hidden="true">
    <div className={`static-field ${fallback?"visible":""}`}><div/><div/><div/><div/><div/><div/></div>
    <canvas ref={canvasRef} className={fallback?"unavailable":""}/>
  </div>;
}
