import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { discoverAndLoadExtensions, type ExtensionToolContext } from "@earendil-works/pi-coding-agent";
import { body, source, workflow } from "../extensions/sources.ts";
import { parallel, forwardedTools, runDelegate, validateBatch } from "../extensions/delegate.ts";
import { todoTool } from "../extensions/todos.ts";
const root = fileURLToPath(new URL("../", import.meta.url));
test("all pinned upstream bytes match SHA256 manifest, including licenses", () => {
  const manifest = JSON.parse(readFileSync(join(root, "upstream/manifest.json"), "utf8"));
  assert.equal(manifest.commit, "58267944f92187b7d6a1c822165c96c81c864806");
  assert.equal(manifest.files.length, 6);
  for (const file of manifest.files) assert.equal(createHash("sha256").update(readFileSync(join(root,"upstream",file.path))).digest("hex"), file.sha256, file.path);
});
test("workflow source body is unchanged except argument interpolation; approvals/counts/threshold remain", () => {
  const original = body(source("commands/feature-dev.md"));
  assert.ok(workflow("a $& feature").endsWith(original.replace("$ARGUMENTS", () => "a $& feature")));
  assert.equal((original.match(/## Phase /g) || []).length, 7);
  for (const phrase of ["Launch 2-3 code-explorer", "Launch 2-3 code-architect", "Launch 3 code-reviewer", "DO NOT START WITHOUT USER APPROVAL", "Wait for answers before proceeding to architecture design", "ask what they want to do"]) assert.ok(original.includes(phrase), phrase);
  assert.ok(source("agents/code-reviewer.md").includes("confidence ≥ 80"));
  assert.ok(!source("agents/code-reviewer.md").split("\n").find(l=>l.startsWith("tools:"))?.split(/[, ]+/).includes("Bash"));
});
test("parallel batch actually starts all children and enforces original counts", async () => {
  let started = 0; let release!:()=>void;
  const barrier = new Promise<void>(r=>release=r);
  const batch = parallel("code-reviewer", [1,2,3].map(n=>({prompt:String(n)})), async t => { started++; await barrier; return t.prompt; });
  assert.equal(started,3); release(); assert.deepEqual(await batch,["1","2","3"]);
  for (const role of ["code-explorer", "code-architect"] as const) {
    validateBatch(role,[{prompt:"a"},{prompt:"b"}]);
    assert.throws(()=>validateBatch(role,[{prompt:"a"}]));
  }
  assert.throws(()=>validateBatch("code-reviewer",[{prompt:"a"},{prompt:"b"}]));
});
test("tool proxy preserves host checks and abort signal; never delegates shell/writes", async () => {
  let received: unknown[] = []; const signal = new AbortController().signal;
  const ctx = { tools: ["read","find","grep","ls","bash","write","edit"].map(name=>({name})), executeTool: async (...args: unknown[]) => {received=args; return {isError:false,result:{content:[{type:"text",text:"ok"}]}};} } as unknown as ExtensionToolContext;
  const tools = forwardedTools(ctx);
  assert.deepEqual(tools.map(t=>t.name),["read","find","grep","ls"]);
  await tools[0].execute("child",{path:"a"},signal);
  assert.deepEqual(received,["read",{path:"a"},{signal}]);
  ctx.executeTool = async () => ({isError:true,result:{content:[{type:"text",text:"blocked"}]}} as never);
  await assert.rejects(tools[0].execute("child",{}), /blocked/);
});
test("actual Pi Agent runtime uses host stream, scoped prompt and original role; no provider call", async () => {
  let seen: any;
  const model = {id:"fixture",provider:"fixture",api:"openai-completions",name:"fixture",reasoning:false,input:["text"],cost:{input:0,output:0,cacheRead:0,cacheWrite:0},contextWindow:32000,maxTokens:1000};
  const ctx = {model, thinkingLevel:"off", isProjectTrusted:()=>true,tools:[],modelRegistry:{streamSimple:(m:any,c:any)=>{
    seen={m,c};
    const message={role:"assistant",content:[{type:"text",text:"scoped result"}],api:model.api,provider:model.provider,model:model.id,usage:{input:1,output:1,cacheRead:0,cacheWrite:0,totalTokens:2,cost:{input:0,output:0,cacheRead:0,cacheWrite:0,total:0}},stopReason:"stop",timestamp:Date.now()};
    return {async *[Symbol.asyncIterator](){yield {type:"done",reason:"stop",message};}, result:async()=>message};
  }}} as unknown as ExtensionToolContext;
  assert.equal(await runDelegate("code-explorer","only explicit task",ctx),"scoped result");
  assert.equal(seen.m,model);
  assert.ok(JSON.stringify(seen.c).includes(body(source("agents/code-explorer.md")).trim().slice(0,80)));
  assert.ok(JSON.stringify(seen.c).includes("only explicit task"));
  assert.equal(JSON.stringify(seen.c).includes("parent secret history"),false);
  await assert.rejects(runDelegate("code-explorer","x",{...ctx,model:undefined}),/Select a Pi model/);
  await assert.rejects(runDelegate("code-explorer","x",{...ctx,isProjectTrusted:()=>false}),/trusted/);
  await assert.rejects(runDelegate("code-explorer","x",ctx,AbortSignal.abort()),/cancelled/);
});
test("TodoWrite adapter returns complete supplied list, not a decision ledger", async () => {
  const todos=[{content:"Discovery",status:"in_progress"}];
  assert.deepEqual((await todoTool().execute("x",{todos})).details,{todos});
});
test("real public Pi loader registers opt-in command/tools; model mapping required", async () => {
  const temp = await mkdtemp(join(tmpdir(),"feature-dev-loader-"));
  try {
    const loaded = await discoverAndLoadExtensions([join(root,"extensions/index.ts")],temp,join(temp,"agent"));
    assert.deepEqual(loaded.errors,[]);
    const ext=loaded.extensions[0];
    assert.deepEqual([...ext.commands.keys()],["feature-dev"]);
    assert.deepEqual([...ext.tools.keys()].sort(),["feature_dev_agents","feature_dev_todos"]);
    for(const entry of ext.tools.values()) assert.equal(entry.definition.defaultActive,false);
    const messages:string[]=[];
    await ext.commands.get("feature-dev")!.handler("build thing",{ui:{notify:(m:string)=>messages.push(m)}} as any);
    assert.match(messages[0],/explicitly selects/);
    const tool=ext.tools.get("feature_dev_agents")!.definition;
    await assert.rejects(tool.execute("x",{role:"code-reviewer",tasks:[]},undefined,undefined,{} as any),/explicitly authorize/);
  } finally {await rm(temp,{recursive:true,force:true});}
});

test("explicit invocation activates additively; branch boundaries clear model consent", async () => {
  const {default: extension} = await import("../extensions/index.ts");
  const commands=new Map<string,any>(), tools=new Map<string,any>(), handlers=new Map<string,any>();
  let active=["read","pending_existing_tool"]; let sent="";
  extension({registerCommand:(n:string,c:any)=>commands.set(n,c),registerTool:(t:any)=>tools.set(t.name,t),on:(n:string,h:any)=>handlers.set(n,h),getActiveTools:()=>active,setActiveTools:(a:string[])=>{active=a;},sendUserMessage:(s:string)=>{sent=s;}} as any);
  const ctx={model:{id:"fixture"},ui:{notify:()=>{throw new Error("unexpected notification");}}};
  await commands.get("feature-dev").handler("--map-sonnet-to-current example",ctx);
  assert.deepEqual(active,["read","pending_existing_tool","feature_dev_agents","feature_dev_todos"]);
  assert.ok(sent.endsWith(body(source("commands/feature-dev.md")).replace("$ARGUMENTS","example")));
  for(const event of ["session_start","session_tree","session_before_fork","session_before_switch"]) {
    await handlers.get(event)();
    await assert.rejects(tools.get("feature_dev_agents").execute("x",{role:"code-explorer",tasks:[]},undefined,undefined,{}),/explicitly authorize/);
    await commands.get("feature-dev").handler("--map-sonnet-to-current example",ctx);
  }
});
