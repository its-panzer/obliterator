import {catalog,selectSource,type Source,type SourceKind} from "./catalog";
import {playbackError,type PlayerOptions,type YouTubeAPI,type YouTubePlayer} from "./youtube";

export type Status = "loading"|"ready"|"playing"|"paused"|"buffering"|"error"|"blocked";
export interface PlayerSnapshot {source:Source;time:number;status:Status;volume:number;muted:boolean;message:string;rate:number}
export class SourceController {
  private player:YouTubePlayer | null = null;
  private alive = true;
  private ready = false;
  private allowed = true;
  private history:string[] = [];
  private start:number;
  private endHandled = false;
  private awaitingId:string|null=null;
  private attachment=0;
  private timer:ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<(s:PlayerSnapshot)=>void>();
  snapshot:PlayerSnapshot;
  constructor(readonly kind:SourceKind, private random:()=>number, volume:number,
    history:string[]=[], private saveHistory:(history:string[])=>void=()=>{}) {
    const {source,start} = selectSource(kind,history,random);
    this.start = start; this.history=[...history,source.id].slice(-3);
    this.saveHistory([...this.history]);
    this.snapshot={source,time:start,status:"loading",volume,muted:false,message:"",rate:1};
  }
  subscribe(listener:(s:PlayerSnapshot)=>void) {
    this.listeners.add(listener); listener(this.snapshot);
    return () => {this.listeners.delete(listener);};
  }
  private update(values:Partial<PlayerSnapshot>) {
    if (!this.alive) return;
    const next = {...this.snapshot,...values};
    if (Object.keys(values).every(k => this.snapshot[k as keyof PlayerSnapshot] === next[k as keyof PlayerSnapshot])) return;
    this.snapshot=next; this.listeners.forEach(fn=>fn(next));
  }
  fail(message:string) {this.update({status:"error",message});}
  attach(api:YouTubeAPI, element:HTMLElement, origin:string) {
    if (!this.alive) return;
    this.detach();
    const attachment=this.attachment;
    const current=()=>this.alive && attachment===this.attachment;
    const options:PlayerOptions = {
      width:"100%",height:"100%",playerVars:{autoplay:0,controls:1,playsinline:1,origin,rel:0},
      events:{
        onReady:({target})=>{
          if (!current()) return;
          this.player=target; this.ready=true;
          target.getIframe().title=`${this.kind === "pink-noise" ? "Pink noise" : this.kind === "music" ? "Music" : "ASMR"} YouTube player`;
          target.setVolume(this.snapshot.volume);
          this.cue();
          this.timer=setInterval(()=>this.poll(),500);
        },
        onStateChange:({data})=>{if(current())this.handleState(data);},
        onError:({data})=>{if(current())this.fail(playbackError(data));},
        onAutoplayBlocked:()=>{if(current())this.update({status:"blocked",message:"Press Play in the video to continue."});},
        onPlaybackRateChange:({data})=>{if(current())this.update({rate:data});},
      }
    };
    this.player=new api.Player(element,options);
  }
  private cue(continueMusic=false) {
    if (!this.ready || !this.player || !this.alive) return;
    this.awaitingId=this.snapshot.source.id;
    this.update({status:"loading",time:this.start,message:""});
    const selection={videoId:this.snapshot.source.id,startSeconds:this.start};
    if(continueMusic){
      try {this.player.loadVideoById(selection);}
      catch {this.player.cueVideoById(selection);this.update({status:"blocked",message:"Press Play in the video to continue."});}
    }else this.player.cueVideoById(selection);
  }
  handleState(data:number) {
    if (!this.alive) return;
    if (data === 1 && (!this.allowed || (typeof document !== "undefined" && document.hidden))) {
      this.pause(); return;
    }
    if (data === 0) {
      if (!this.endHandled) {
        const continueMusic=this.kind==="music" && this.allowed &&
          (typeof document==="undefined" || !document.hidden) &&
          ["playing","buffering"].includes(this.snapshot.status);
        this.endHandled=true; this.next(continueMusic);
      }
      return;
    }
    const states:Record<number,Status>={[-1]:"ready",1:"playing",2:"paused",3:"buffering",5:"ready"};
    if (states[data]) this.update({status:states[data],message:""});
    // A replacement must actually play before another ended event advances it.
    if (data===1) this.endHandled=false;
  }
  poll() {
    if (!this.ready || !this.player || !this.alive) return;
    if (typeof document!=="undefined" && document.hidden) return;
    try {
      const time = Math.floor(this.player.getCurrentTime() || 0);
      const volume = Math.round(this.player.getVolume());
      const muted = this.player.isMuted();
      const url = this.player.getVideoUrl();
      const id = url ? new URL(url).searchParams.get("v") : null;
      // The old iframe URL/time can linger until the new cue is acknowledged.
      if(this.awaitingId && id!==this.awaitingId)return;
      if(id===this.awaitingId)this.awaitingId=null;
      let source=this.snapshot.source;
      if (id && id!==source.id) {
        source = catalog.find(s=>s.id===id) ?? {...source,id,title:"YouTube video",shortTitle:"YouTube source",creator:"YouTube",tag:"Selected video",chapters:[],mood:undefined};
      }
      const cueTime=this.snapshot.status==="ready"?this.start:time;
      this.update({source,time:cueTime,volume:Number.isFinite(volume)?volume:this.snapshot.volume,muted});
    } catch { /* A destroyed or still-loading iframe can temporarily reject calls. */ }
  }
  next(continueMusic=false) {
    const {source,start}=selectSource(this.kind,this.history,this.random);
    this.start=start; this.history=[...this.history,source.id].slice(-3);
    this.saveHistory([...this.history]);
    this.update({source,time:start,message:""}); this.cue(continueMusic);
  }
  retry() {this.cue();}
  /** Called synchronously by the launch click. Never retained for a later ready event. */
  playFromGesture() {
    if(!this.alive || !this.ready || !this.player || !this.allowed ||
      (typeof document!=="undefined" && document.hidden) ||
      !["ready","paused","blocked"].includes(this.snapshot.status))return false;
    try {this.player.playVideo();return true;}
    catch {this.update({status:"blocked",message:"Press Play in the video to continue."});return false;}
  }
  setVolume(volume:number) {
    const bounded=Math.max(0,Math.min(100,Math.round(volume)));
    this.update({volume:bounded});
    if(this.ready) this.player?.setVolume(bounded);
  }
  toggleMute() {
    if (!this.ready) return;
    const muted=!this.snapshot.muted;
    if(muted)this.player?.mute(); else this.player?.unMute();
    this.update({muted});
  }
  pause() {
    if(!this.ready) return;
    this.player?.pauseVideo();
    if(this.snapshot.status==="playing"||this.snapshot.status==="buffering") this.update({status:"paused"});
  }
  setVisible(visible:boolean) {this.allowed=visible; if(!visible)this.pause();}
  detach() {
    this.attachment++;
    if(this.timer) clearInterval(this.timer);
    this.timer=null; this.ready=false;
    try {this.player?.pauseVideo();this.player?.destroy();} catch { /* Already detached. */ }
    this.player=null;
  }
  destroy() {this.alive=false;this.listeners.clear();this.detach();}
}
