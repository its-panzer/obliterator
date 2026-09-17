import * as THREE from "three/webgpu";
import {Fn,Loop,instancedArray,instanceIndex,uniform,uniformArray,vec3,vec4,mix,uv,float,hash} from "three/tsl";
import {musicMood,neutralMood,type Mood,type VisualMode} from "./catalog";
import type {PlayerSnapshot} from "./controller";
import {defaultParticlePalette,particlePalette} from "./particle-palettes";

export interface VisualInput {music:PlayerSnapshot|null;mode:VisualMode}

// Independent-particle compute adapted from the Three.js r186 attractor example.
// See THIRD-PARTY-NOTICES.md for attribution and license.
export async function createAttractorRenderer(canvas:HTMLCanvasElement,read:()=>VisualInput,onFailure:()=>void,isCancelled:()=>boolean) {
  const renderer=new THREE.WebGPURenderer({canvas,antialias:false,alpha:false,powerPreference:"low-power"});
  let stopped=false,disposed=false,raf=0,last=0,phase=0,frames=0,accumulator=0;
  let resize:ResizeObserver|undefined,intersection:IntersectionObserver|undefined,visible=true;
  const geometry=new THREE.PlaneGeometry(1,1);
  const material=new THREE.SpriteNodeMaterial({blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false,transparent:true});
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(34,1,.1,100);
  const count=window.innerWidth<600?24576:65536;
  const positions=new Float32Array(count*3),velocities=new Float32Array(count*3);
  // Compose the initial folded ring without warm-up animation, also for Still mode.
  for(let i=0;i<count;i++) {
    const a=i/count*Math.PI*2,strand=Math.random()*Math.PI*2;
    const width=.08+Math.pow(Math.random(),2)*.38;
    const radius=1.7+.4*Math.cos(a*3)+width*Math.cos(strand);
    positions[i*3]=Math.cos(a)*radius;
    positions[i*3+1]=.58*Math.sin(a*2)+width*Math.sin(strand);
    positions[i*3+2]=Math.sin(a)*radius*.78;
    velocities[i*3]=-.22*Math.sin(a);velocities[i*3+2]=.22*Math.cos(a);
  }
  const positionBuffer=instancedArray(positions,"vec3"),velocityBuffer=instancedArray(velocities,"vec3");
  const attractorVectors=[new THREE.Vector3(-1,0,0),new THREE.Vector3(1,0,-.5),new THREE.Vector3(0,.5,1)];
  const attractors=uniformArray<"vec3">(attractorVectors,"vec3");
  const axes=uniformArray<"vec3">([new THREE.Vector3(0,1,0),new THREE.Vector3(0,1,0),new THREE.Vector3(1,0,-.5).normalize()],"vec3");
  const delta=uniform(1/60),spin=uniform(2.5),strength=uniform(6.67);
  const colors=defaultParticlePalette.map(hex=>uniform(new THREE.Color(hex)));
  const mass=hash(instanceIndex.add(317)).mul(.75).add(.25);
  const update=Fn(()=>{
    const p=positionBuffer.element(instanceIndex),v=velocityBuffer.element(instanceIndex),force=vec3(0).toVar();
    Loop(3,({i})=>{
      const offset=attractors.element(i).sub(p),distance=offset.length().max(.001);
      // Softened gravity avoids singularities and non-finite positions.
      const pull=strength.mul(mass).div(distance.mul(distance).add(.18));
      force.addAssign(offset.div(distance).mul(pull));
      force.addAssign(axes.element(i).cross(offset).mul(pull).mul(spin));
    });
    force.subAssign(p.mul(.18));
    v.addAssign(force.mul(delta));
    v.mulAssign(float(1).div(v.length().div(5).max(1)));
    v.mulAssign(delta.mul(-6.3).exp());
    p.addAssign(v.mul(delta));
  })().compute(count).setName("Obliterator attractors");
  material.positionNode=positionBuffer.toAttribute();
  const speed=velocityBuffer.toAttribute().length().div(5).smoothstep(0,.65);
  const position=positionBuffer.toAttribute();
  const band=position.x.mul(.17).add(position.y.mul(.12)).add(position.z.mul(.1)).add(.5).add(speed.mul(.1)).clamp(0,1);
  const cool=mix(colors[0],colors[1],band.smoothstep(0,.34));
  const warm=mix(cool,colors[2],band.smoothstep(.34,.67));
  material.colorNode=vec4(mix(warm,colors[3],band.smoothstep(.67,1)),1);
  material.opacityNode=uv().sub(.5).length().smoothstep(.12,.5).oneMinus().mul(.52);
  material.scaleNode=mass.mul(.012).add(.007);
  const particles=new THREE.InstancedMesh(geometry,material,count);particles.frustumCulled=false;scene.add(particles);
  const current:Mood={...neutralMood,color:[.486,.733,.702],secondary:[.545,.47,.725]};
  const paletteTargets=defaultParticlePalette.map(hex=>new THREE.Color(hex));
  let paletteTag:string|undefined;
  let width=0,height=0;
  const fail=()=>{if(stopped||disposed)return;stopped=true;cancelAnimationFrame(raf);onFailure();};
  const originalLost=renderer.onDeviceLost.bind(renderer);
  renderer.onDeviceLost=info=>{originalLost(info);fail();};
  renderer.onError=fail;
  const lost=(event:Event)=>{event.preventDefault();fail();};canvas.addEventListener("webglcontextlost",lost);
  async function dispose() {
    if(disposed)return;
    disposed=true;stopped=true;cancelAnimationFrame(raf);resize?.disconnect();intersection?.disconnect();
    document.removeEventListener("visibilitychange",refresh);canvas.removeEventListener("webglcontextlost",lost);
    update.dispose();geometry.dispose();material.dispose();particles.dispose();scene.clear();
    await renderer.dispose();
  }
  function draw(now:number) {
    raf=0;
    if(stopped||disposed||isCancelled()||!visible||document.hidden||read().mode==="off")return;
    try {
      const {music,mode}=read(),dt=Math.min(1/30,last?(now-last)/1000:1/60);last=now;
      if(mode==="motion"&&music?.status==="playing") {
        const target=musicMood(music.source,music.time),smoothing=1-Math.exp(-dt/3),palette=1-Math.exp(-dt/20);
        current.energy+=(target.energy-current.energy)*smoothing;current.scale+=(target.scale-current.scale)*smoothing;
        if(paletteTag!==music.source.tag){
          paletteTag=music.source.tag;
          particlePalette(paletteTag).forEach((hex,i)=>paletteTargets[i].set(hex));
        }
        colors.forEach((color,i)=>color.value.lerp(paletteTargets[i],palette));
        // Fixed steps cap catch-up after stalls and keep 60/120 Hz displays consistent.
        accumulator=Math.min(accumulator+dt,3/60);
        delta.value=(1/60)*(.32+current.energy*.38)*music.rate;
        while(accumulator>=1/60) {
          accumulator-=1/60;phase+=delta.value;spin.value=2.2+current.energy;
          attractorVectors[0].set(-1,Math.sin(phase*.11)*.2,Math.sin(phase*.07)*.2);
          attractorVectors[1].set(1,Math.cos(phase*.09)*.15,-.5);attractorVectors[2].set(Math.sin(phase*.08)*.2,.5,1);
          renderer.compute(update);
        }
        particles.rotation.y=phase*.023;particles.rotation.z=Math.sin(phase*.04)*.09;particles.scale.setScalar(.95+current.scale*.05);
      } else accumulator=0;
      const rect=canvas.getBoundingClientRect();
      if(width!==rect.width||height!==rect.height) {
        width=rect.width;height=rect.height;
        renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5,Math.sqrt(1800000/Math.max(1,width*height))));
        renderer.setSize(Math.max(1,width),Math.max(1,height),false);camera.aspect=width/Math.max(1,height);
        const distance=Math.max(6.6,5.7/Math.max(.4,camera.aspect));
        camera.position.set(0,distance*.56,distance);camera.lookAt(0,0,0);
        camera.zoom=width<600?1.18:1.3;camera.updateProjectionMatrix();
      }
      renderer.render(scene,camera);frames++;
      if(frames%60===1){canvas.dataset.frames=String(frames);canvas.dataset.phase=phase.toFixed(4);}
      if(mode==="motion"&&music?.status==="playing")raf=requestAnimationFrame(draw);
    } catch {fail();}
  }
  function refresh(){cancelAnimationFrame(raf);last=0;accumulator=0;if(!stopped&&!disposed)raf=requestAnimationFrame(draw);}
  try {
    await renderer.init();
    if(isCancelled()){await dispose();return {refresh,dispose};}
    renderer.setClearColor("#171819",1);
    await renderer.compileComputeAsync(update);
    await renderer.compileAsync(scene,camera);
    if(isCancelled()){await dispose();return {refresh,dispose};}
    canvas.dataset.renderer="isWebGPUBackend" in renderer.backend?"webgpu":"webgl2";canvas.dataset.particles=String(count);
    intersection=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;refresh();});intersection.observe(canvas);
    resize=new ResizeObserver(refresh);resize.observe(canvas);document.addEventListener("visibilitychange",refresh);refresh();
    return {refresh,dispose};
  } catch(error) {await dispose();throw error;}
}
