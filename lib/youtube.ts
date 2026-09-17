export interface YouTubePlayer {
  cueVideoById(options:{videoId:string;startSeconds:number}): void;
  playVideo(): void;
  pauseVideo(): void;
  setVolume(n:number): void;
  getVolume(): number;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  getCurrentTime(): number;
  getVideoUrl(): string;
  getPlayerState(): number;
  getPlaybackRate(): number;
  getIframe(): HTMLIFrameElement;
  destroy(): void;
}
export type PlayerEvent = {target:YouTubePlayer;data:number};
export interface PlayerOptions {
  width:string; height:string;
  playerVars: {autoplay:0;controls:1;playsinline:1;origin:string;rel:0};
  events: {
    onReady:(e:PlayerEvent)=>void;
    onStateChange:(e:PlayerEvent)=>void;
    onError:(e:PlayerEvent)=>void;
    onAutoplayBlocked:(e:PlayerEvent)=>void;
    onPlaybackRateChange:(e:PlayerEvent)=>void;
  };
}
export interface YouTubeAPI {Player:new (element:HTMLElement,options:PlayerOptions)=>YouTubePlayer}
declare global { interface Window { YT?:YouTubeAPI; onYouTubeIframeAPIReady?:()=>void } }
let pending: Promise<YouTubeAPI> | null = null;

export function loadYouTube(): Promise<YouTubeAPI> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (pending) return pending;
  pending = new Promise<YouTubeAPI>((resolve,reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    let done = false;
    const fail = () => {
      if (done) return;
      done = true; clearTimeout(timer); script.remove(); pending = null;
      window.onYouTubeIframeAPIReady = previous;
      reject(new Error("YouTube couldn’t load. Check your connection, then retry."));
    };
    const timer = setTimeout(fail,15000);
    window.onYouTubeIframeAPIReady = () => {
      if (done) return;
      if (!window.YT?.Player) return fail();
      done = true; clearTimeout(timer); script.onerror = null;
      window.onYouTubeIframeAPIReady = previous;
      resolve(window.YT);
      try { previous?.(); } catch { /* An unrelated listener must not break playback setup. */ }
    };
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return pending;
}

export function playbackError(code:number) {
  switch(code) {
    case 2:return "This source couldn’t be loaded. Try the next source.";
    case 5:return "YouTube couldn’t play this source. Retry or choose another.";
    case 100:return "This video is unavailable. Choose the next source.";
    case 101: case 150:return "This video doesn’t allow embedded playback. Choose the next source.";
    case 153:return "YouTube couldn’t identify this page. Open the app through its local web address and retry.";
    default:return "YouTube playback failed. Retry or choose another source.";
  }
}
