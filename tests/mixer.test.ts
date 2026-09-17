import assert from "node:assert/strict";
import {test} from "node:test";
import {SourceController} from "../lib/controller";
import {catalog,selectSource,seededRandom} from "../lib/catalog";
import {readPreferences,savePreferences} from "../lib/preferences";
import {createSourceHistory,sourceHistoryKey} from "../lib/source-history";
import {playbackError,type PlayerOptions,type YouTubePlayer} from "../lib/youtube";

class FakePlayer implements YouTubePlayer {
  id=""; time=0; volume=50; muted=false; destroyed=false; paused=0; playRequests=0; cues:{videoId:string;startSeconds:number}[]=[];
  loads:{videoId:string;startSeconds:number}[]=[];
  constructor(_element:HTMLElement,readonly options:PlayerOptions) {}
  ready(){this.options.events.onReady({target:this,data:0});}
  cueVideoById(cue:{videoId:string;startSeconds:number}){this.cues.push(cue);this.id=cue.videoId;this.time=cue.startSeconds;}
  loadVideoById(cue:{videoId:string;startSeconds:number}){this.loads.push(cue);this.id=cue.videoId;this.time=cue.startSeconds;}
  pauseVideo(){this.paused++;}
  playVideo(){this.playRequests++;}
  setVolume(n:number){this.volume=n;}
  getVolume(){return this.volume;}
  mute(){this.muted=true;}
  unMute(){this.muted=false;}
  isMuted(){return this.muted;}
  getCurrentTime(){return this.time;}
  getVideoUrl(){return `https://www.youtube.com/watch?v=${this.id}`;}
  getPlayerState(){return 2;}
  getPlaybackRate(){return 1;}
  getIframe(){return {title:""} as HTMLIFrameElement;}
  destroy(){this.destroyed=true;}
  state(data:number){this.options.events.onStateChange({target:this,data});}
}
function setup(kind:"music"|"asmr"|"pink-noise"="music",seed=42) {
  let player!:FakePlayer;
  const API={Player:class extends FakePlayer {constructor(e:HTMLElement,o:PlayerOptions){super(e,o);player=this;}}};
  const c=new SourceController(kind,seededRandom(seed),kind==="pink-noise"?20:50);
  c.attach(API,{} as HTMLElement,"http://localhost:4179");player.ready();player.state(5);
  return {c,p:player};
}

test("ASMR replacements remain cued for manual playback",t=>{
  const {c,p}=setup("asmr");t.after(()=>c.destroy());
  assert.equal(p.options.playerVars.autoplay,0);
  assert.equal(c.snapshot.status,"ready");
  let last=c.snapshot.source.id;
  for(let i=0;i<100;i++){
    p.state(1);p.state(0);
    assert.notEqual(c.snapshot.source.id,last);
    const id=c.snapshot.source.id;
    p.state(0); // A delayed duplicate ended event cannot skip another source.
    assert.equal(c.snapshot.source.id,id);
    assert.equal(c.snapshot.status,"loading");
    p.state(5);assert.equal(c.snapshot.status,"ready");last=id;
  }
  assert.equal(p.cues.length,101);
  assert.equal(p.playRequests,0);
  assert.equal(p.loads.length,0);
});

test("music continues through repeated endings without resetting other layers",t=>{
  const {c,p}=setup();const asmr=setup("asmr"),pink=setup("pink-noise");
  t.after(()=>[c,asmr.c,pink.c].forEach(c=>c.destroy()));
  asmr.p.state(1);pink.p.state(1);const others=[{...asmr.c.snapshot},{...pink.c.snapshot}];
  assert.equal(p.loads.length,0);
  for(let i=0;i<100;i++){
    const last=c.snapshot.source.id;p.state(1);p.state(0);
    assert.notEqual(c.snapshot.source.id,last);
    assert.equal(p.loads.length,i+1);
    assert.equal(p.loads.at(-1)?.videoId,c.snapshot.source.id);
    assert.equal(p.loads.at(-1)?.startSeconds,c.snapshot.time);
    p.state(0);p.state(5);p.state(0);
    assert.equal(p.loads.length,i+1);
  }
  assert.deepEqual([asmr.c.snapshot,pink.c.snapshot],others);
  assert.equal(p.cues.length,1);
});

test("music continuation respects pause, visibility and blocked playback",t=>{
  const {c,p}=setup();t.after(()=>c.destroy());
  p.state(1);c.pause();p.state(0);assert.equal(p.loads.length,0);
  p.state(1);c.setVisible(false);p.state(0);assert.equal(p.loads.length,0);
  c.setVisible(true);p.state(1);p.state(0);assert.equal(p.loads.length,1);
  p.options.events.onAutoplayBlocked({target:p,data:0});
  assert.equal(c.snapshot.status,"blocked");
  p.state(0);assert.equal(p.loads.length,1);
  assert.equal(c.playFromGesture(),true);
  assert.equal(p.playRequests,1);
  c.next();assert.equal(p.loads.length,1); // Explicit Next still only cues.
});

test("pause or visibility loss cancels an in-flight music continuation",t=>{
  for(const hide of [false,true]){
    const {c,p}=setup();t.after(()=>c.destroy());
    p.state(1);p.state(0);assert.equal(p.loads.length,1);
    if(hide){c.setVisible(false);c.setVisible(true);}else c.pause();
    assert.equal(p.cues.length,2);
    const paused=p.paused;p.state(1);
    assert.equal(p.paused,paused+1);assert.notEqual(c.snapshot.status,"playing");
    p.state(5);assert.equal(c.snapshot.status,"ready");
    assert.equal(c.playFromGesture(),true);p.state(1);
    assert.equal(c.snapshot.status,"playing");
  }
});

test("launch playback requires a visible ready player and never carries over to a later cue",t=>{
  const {c,p}=setup();t.after(()=>c.destroy());
  c.setVisible(false);assert.equal(c.playFromGesture(),false);assert.equal(p.playRequests,0);
  c.setVisible(true);assert.equal(c.playFromGesture(),true);assert.equal(p.playRequests,1);
  p.options.events.onAutoplayBlocked({target:p,data:0});
  assert.equal(c.snapshot.status,"blocked");assert.equal(p.playRequests,1);
  c.next();assert.equal(c.playFromGesture(),false);
  p.state(5);assert.equal(p.playRequests,1);
  p.state(1);p.state(0);p.state(5);assert.equal(p.playRequests,1);
  c.destroy();assert.equal(c.playFromGesture(),false);
});

test("stale iframe metadata cannot revert the selected replacement",t=>{
  const {c,p}=setup();t.after(()=>c.destroy());
  const old=c.snapshot.source.id;c.next();const next=c.snapshot.source.id;
  p.id=old;p.time=200;c.poll();assert.equal(c.snapshot.source.id,next);
  p.id=next;p.state(5);p.time=0;c.poll();assert.equal(c.snapshot.time,p.cues.at(-1)!.startSeconds);
  p.state(1);p.time=1234;c.poll();assert.equal(c.snapshot.time,1234);
});

test("pink-noise volume, replacement, errors and removal preserve the other sources",t=>{
  const music=setup("music"),asmr=setup("asmr"),pink=setup("pink-noise");
  t.after(()=>[music,asmr,pink].forEach(({c})=>c.destroy()));
  music.p.state(1);asmr.p.state(1);pink.p.state(1);
  const a={...music.c.snapshot},b={...asmr.c.snapshot};
  pink.c.setVolume(12);pink.c.toggleMute();pink.c.next();
  pink.p.options.events.onError({target:pink.p,data:150});pink.c.destroy();
  assert.deepEqual(music.c.snapshot,a);assert.deepEqual(asmr.c.snapshot,b);
  assert.equal(music.p.paused,0);assert.equal(asmr.p.paused,0);assert.equal(pink.p.destroyed,true);
});

test("offscreen playback is paused even if a late playing event arrives",t=>{
  const {c,p}=setup();t.after(()=>c.destroy());
  p.state(1);c.setVisible(false);p.state(1);assert.ok(p.paused>=2);
  assert.equal(c.snapshot.status,"paused");c.setVisible(true);assert.equal(c.snapshot.status,"paused");
  p.state(1);assert.equal(c.snapshot.status,"playing");
});

test("native source and volume changes reconcile without misattribution",t=>{
  const {c,p}=setup();t.after(()=>c.destroy());c.poll();
  p.id="other-video";p.volume=33;p.muted=true;p.state(1);c.poll();
  assert.equal(c.snapshot.source.title,"YouTube video");assert.equal(c.snapshot.source.mood,undefined);
  assert.equal(c.snapshot.volume,33);assert.equal(c.snapshot.muted,true);
});

test("independent session seeds vary both selection and published start points",()=>{
  const results=new Set<string>();
  for(let seed=0;seed<500;seed++){
    const {source,start}=selectSource("music",[],seededRandom(seed));
    assert.ok(source.entries.includes(start));assert.ok(source.duration-start>=900);
    results.add(`${source.id}:${start}`);
  }
  assert.ok(results.size>=12);
  assert.equal(catalog.filter(s=>s.kind==="music").length,5);
});

test("fresh pink-noise sessions can choose either recording",()=>{
  const choices=new Set(Array.from({length:100},(_,seed)=>selectSource("pink-noise",[],seededRandom(seed)).source.id));
  assert.equal(choices.size,2);
});

test("refreshes and layer recreation avoid previous videos and ASMR creators",()=>{
  const saved=new Map<string,string>();
  const storage={getItem:(key:string)=>saved.get(key)??null,setItem:(key:string,value:string)=>{saved.set(key,value);}};
  for(const kind of ["music","asmr","pink-noise"] as const){
    let last:typeof catalog[number]|undefined;
    const seen=new Set<string>();
    for(let refresh=0;refresh<30;refresh++){
      // Recreate both the history store and controller as a reload would.
      const history=createSourceHistory(storage);
      const c=new SourceController(kind,seededRandom(refresh),50,history.read(kind),next=>history.write(kind,next));
      const source=c.snapshot.source;
      if(last){
        assert.notEqual(source.id,last.id);
        if(kind==="asmr")assert.notEqual(source.creator,last.creator);
      }
      seen.add(source.id);last=source;
      if(refresh%3===0){
        c.next();
        assert.notEqual(c.snapshot.source.id,source.id);
        if(kind==="asmr")assert.notEqual(c.snapshot.source.creator,source.creator);
      }
      assert.equal(createSourceHistory(storage).read(kind).at(-1),c.snapshot.source.id);
      last=c.snapshot.source;c.destroy();
    }
    assert.ok(seen.size>=2);
  }
});

test("source history validates saved IDs and survives blocked storage",()=>{
  const id=catalog.find(s=>s.kind==="asmr")!.id;
  let stored=JSON.stringify([null,4,"unknown",catalog[0].id,id]);
  const storage={getItem:()=>stored,setItem:()=>{throw new Error("blocked");}};
  const history=createSourceHistory(storage);
  assert.deepEqual(history.read("asmr"),[id]);
  stored="{";assert.deepEqual(history.read("music"),[]);
  history.write("asmr",[id]);assert.deepEqual(history.read("asmr"),[id]);
  const blocked=createSourceHistory({getItem(){throw new Error("blocked");},setItem(){throw new Error("blocked");}});
  blocked.write("asmr",[id]);assert.deepEqual(blocked.read("asmr"),[id]);
  assert.equal(sourceHistoryKey,"obliterator.source-history.v1");
});

test("preferences survive corruption, blocked storage and reduced motion",()=>{
  let stored="{";
  const storage={getItem:()=>stored,setItem:(_key:string,value:string)=>{stored=value;}};
  assert.equal(readPreferences(storage,false).volumes["pink-noise"],20);
  stored=JSON.stringify({volumes:{music:1000,asmr:-50,"pink-noise":14},visualMode:"motion",pinkEnabled:true});
  const prefs=readPreferences(storage,true);
  assert.deepEqual(prefs,{volumes:{music:100,asmr:0,"pink-noise":14},visualMode:"still",visualStyle:"particles"});
  savePreferences(storage,prefs);assert.ok(!stored.includes("pinkEnabled"));
  savePreferences(storage,{...prefs,visualStyle:"contours",visualMode:"off"});
  assert.equal(readPreferences(storage,false).visualStyle,"contours");
  assert.equal(readPreferences(storage,false).visualMode,"off");
  stored=JSON.stringify({visualStyle:"invalid"});
  assert.equal(readPreferences(storage,false).visualStyle,"particles");
  assert.doesNotThrow(()=>savePreferences({setItem(){throw new Error("disabled");}},prefs));
  assert.equal(readPreferences({getItem(){throw new Error("disabled");}},true).visualMode,"still");
});

test("source errors remain recoverable without affecting manual-start behavior",t=>{
  const {c,p}=setup();t.after(()=>c.destroy());
  for(const code of [2,5,100,101,150,153,999]){
    p.options.events.onError({target:p,data:code});assert.equal(c.snapshot.status,"error");
    assert.equal(c.snapshot.message,playbackError(code));
    c.retry();p.state(5);assert.equal(c.snapshot.status,"ready");
  }
  p.options.events.onAutoplayBlocked({target:p,data:0});assert.equal(c.snapshot.status,"blocked");
  p.state(1);assert.equal(c.snapshot.status,"playing");
});

test("destroyed controllers ignore late iframe events and remove subscriptions",()=>{
  const {c,p}=setup();let calls=0;c.subscribe(()=>calls++);c.destroy();const before=calls;
  p.state(1);p.options.events.onError({target:p,data:5});assert.equal(calls,before);
});

test("detached iframe callbacks cannot corrupt a remounted controller",t=>{
  const {c,p}=setup();t.after(()=>c.destroy());
  c.detach();const before={...c.snapshot};p.state(1);p.options.events.onError({target:p,data:100});
  assert.deepEqual(c.snapshot,before);assert.equal(p.destroyed,true);
  let replacement!:FakePlayer;
  c.attach({Player:class extends FakePlayer{constructor(e:HTMLElement,o:PlayerOptions){super(e,o);replacement=this;}}},{} as HTMLElement,"http://localhost:4179");
  replacement.ready();replacement.state(5);p.state(0);
  assert.equal(replacement.cues.length,1);assert.equal(c.snapshot.status,"ready");
});
