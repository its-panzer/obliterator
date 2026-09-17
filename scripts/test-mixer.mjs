import {build} from "esbuild";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawnSync} from "node:child_process";
const dir=await mkdtemp(join(tmpdir(),"obliterator-tests-"));
try {
  const outfile=join(dir,"mixer.test.mjs");
  await build({entryPoints:["tests/mixer.test.ts"],bundle:true,platform:"node",format:"esm",outfile});
  const result=spawnSync(process.execPath,["--test",outfile],{stdio:"inherit"});
  process.exitCode=result.status??1;
} finally {await rm(dir,{recursive:true,force:true});}
