type Tool = {name:string;description:string;inputSchema:object;annotations:{readOnlyHint:boolean};execute:(input:unknown)=>unknown};
type Context = {registerTool:(tool:Tool,options:{signal:AbortSignal})=>void|Promise<void>};
/** Optional browser API; unsupported browsers use the same visible controls. */
export function registerMixTools(read:()=>unknown,pause:()=>void) {
  const context=(document as Document & {modelContext?:Context}).modelContext;
  if(!context?.registerTool)return ()=>{};
  const lifecycle=new AbortController();
  const inputSchema={type:"object",properties:{},additionalProperties:false};
  function validate(input:unknown){
    if(!input||typeof input!=="object"||Array.isArray(input)||Object.keys(input).length)throw new Error("Expected an empty object.");
  }
  const tools:Tool[]=[
    {name:"get_mix_state",description:"Read the current sources, playback status, volumes, pink-noise setting, and visual mode.",inputSchema,annotations:{readOnlyHint:true},execute(input){validate(input);return read();}},
    {name:"pause_mix",description:"Pause all Obliterator sources. Resuming requires each video's native Play button.",inputSchema,annotations:{readOnlyHint:false},execute(input){validate(input);pause();return read();}},
  ];
  for(const tool of tools){try{void Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{/* Optional support. */}}
  return ()=>lifecycle.abort();
}
