import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { discoverAndLoadExtensions, SessionManager } from "@earendil-works/pi-coding-agent";
import extension from "../extensions/index.ts";
import { body, masterWorkflow, source } from "../extensions/sources.ts";
import { NONE, SELECTOR, selection } from "../extensions/selector.ts";
const root=fileURLToPath(new URL("../",import.meta.url));
function harness(existing?: SessionManager) {
  const commands=new Map<string,any>(),tools=new Map<string,any>(),handlers=new Map<string,any>();
  const listeners=new Map<string,((data:any)=>void)[]>();
  const manager=existing??SessionManager.inMemory(root);
  let active=["read","other_plugin","pending_mcp"], sent="";
  const notices:string[]=[];
  const model={id:"fixture",provider:"fixture",api:"openai-completions",name:"fixture",reasoning:true,input:["text"],cost:{input:0,output:0,cacheRead:0,cacheWrite:0},contextWindow:32000,maxTokens:1000};
  const ctx:any={model,thinkingLevel:"high",sessionManager:manager,isProjectTrusted:()=>true,tools:[],ui:{notify:(s:string)=>notices.push(s)}};
  const api:any={registerCommand:(n:string,c:any)=>commands.set(n,c),registerTool:(t:any)=>tools.set(t.name,t),on:(n:string,h:any)=>handlers.set(n,h),getActiveTools:()=>active,setActiveTools:(a:string[])=>{assert.ok(active.every(n=>a.includes(n)),"never remove existing/pending tools");active=a;},appendEntry:(n:string,d:any)=>manager.appendCustomEntry(n,d),sendUserMessage:(s:string)=>{sent=s;},events:{on:(n:string,h:any)=>{listeners.set(n,[...(listeners.get(n)??[]),h]);},emit:(n:string,d:any)=>listeners.get(n)?.forEach(h=>h(d))}};
  extension(api);
  const command=(args:string)=>commands.get("claude-inspired").handler(args,ctx);
  const run=async(prompt="build feature",base="host",force?:string)=>{
    const e:any={prompt,messageType:"user",systemPrompt:base,systemPromptOptions:{sections:{other_extension:"keep"},forceSystemPrompt:force}};
    await handlers.get("before_agent_start")(e,ctx);return e;
  };
  return {api,ctx,manager,commands,tools,handlers,command,run,notices,get active(){return active;},get sent(){return sent;}};
}
test("real Pi loader registers default-off commands and deferred guarded tools",async()=>{
  const temp=await mkdtemp(join(tmpdir(),"claude-master-"));
  try {
    const result=await discoverAndLoadExtensions([join(root,"extensions/index.ts")],temp,join(temp,"agent"));
    assert.deepEqual(result.errors,[]);
    assert.deepEqual([...result.extensions[0].commands.keys()].sort(),["claude-inspired","feature-dev"]);
    for(const t of result.extensions[0].tools.values()) {assert.equal(t.definition.defaultActive,false);assert.equal(t.definition.exposure,"deferred");}
  }finally{await rm(temp,{recursive:true,force:true});}
});
test("default off, repeated on, fresh prompt preservation, phase-continuation routing and status read-only",async()=>{
  const h=harness();
  assert.equal((await h.run()).systemPromptOptions.sections.pi_claude_inspired,undefined);
  await assert.rejects(h.tools.get("feature_dev_todos").execute("x",{todos:[]},undefined,undefined,h.ctx),/disabled/);
  await h.command("on"); const entries=h.manager.getBranch().length;
  await h.command("on"); assert.equal(h.manager.getBranch().length,entries);
  const first=await h.run("new feature","fresh host A"), next=await h.run("I approve approach 2","fresh host B");
  assert.equal(first.systemPrompt,"fresh host A");assert.equal(next.systemPrompt,"fresh host B");
  assert.equal(next.systemPromptOptions.sections.other_extension,"keep");
  assert.equal(first.systemPromptOptions.sections.pi_claude_inspired,next.systemPromptOptions.sections.pi_claude_inspired);
  assert.match(masterWorkflow(),/do not restart Phase 1/);assert.match(masterWorkflow(),/greeting/);
  await h.command("status");assert.equal(h.manager.getBranch().length,entries);assert.match(h.notices.at(-1)!,/ON.*fixture\/fixture.*high/);
  await h.command("off");await h.command("off");
  assert.equal((await h.run("hello","updated host C")).systemPromptOptions.sections.pi_claude_inspired,undefined);
  assert.deepEqual(h.active,["read","other_plugin","pending_mcp","feature_dev_agents","feature_dev_todos"]);
  assert.deepEqual(h.tools.get("feature_dev_agents").prepareLoadout().hiddenDeclarations,["feature_dev_agents","feature_dev_todos"]);
  await assert.rejects(h.tools.get("feature_dev_agents").execute("x",{role:"code-explorer",tasks:[]},undefined,undefined,h.ctx),/disabled/);
});
test("manual command and old flag keep exact source, select manual mode, off revokes it",async()=>{
  const h=harness();
  for(const input of ["feature A","--map-sonnet-to-current feature A"]) {
    await h.commands.get("feature-dev").handler(input,h.ctx);
    assert.equal(selection(h.ctx).mode,"manual");
    assert.ok(h.sent.endsWith(body(source("commands/feature-dev.md")).replace("$ARGUMENTS","feature A")));
    await h.command("status");assert.match(h.notices.at(-1)!,/OFF; workflow: manual feature-dev/);
    await h.command("off");
    await assert.rejects(h.tools.get("feature_dev_todos").execute("x",{todos:[]},undefined,undefined,h.ctx),/disabled/);
  }
  await h.command("on");await h.commands.get("feature-dev").handler("feature B",h.ctx);assert.equal(selection(h.ctx).mode,"master");
});
test("actual SessionManager branch/resume selection and cross-package fail-closed selector",async()=>{
  const h=harness();const base=h.manager.appendCustomEntry("base",{});
  await h.command("on");const on=h.manager.getLeafId()!;
  await h.command("off");
  h.manager.branch(on);await h.handlers.get("session_tree")({},h.ctx);assert.equal(selection(h.ctx).mode,"master");
  const resumed=harness(h.manager);await resumed.handlers.get("session_start")({},resumed.ctx);assert.ok((await resumed.run()).systemPromptOptions.sections.pi_claude_inspired);
  h.manager.branch(base);await h.handlers.get("session_tree")({},h.ctx);assert.deepEqual(selection(h.ctx),NONE);
  h.manager.appendCustomEntry(SELECTOR,{version:1,owner:"codex",mode:"master"});
  h.api.events.emit(SELECTOR,{});await h.command("off");assert.equal(selection(h.ctx).owner,"codex");
  await h.commands.get("feature-dev").handler("new feature",h.ctx);assert.equal(selection(h.ctx).owner,"claude");assert.equal(selection(h.ctx).mode,"manual");
  h.manager.appendCustomEntry(SELECTOR,{version:999,owner:"claude",mode:"master"});assert.deepEqual(selection(h.ctx),NONE);
});
test("opaque earlier override preserved and blocks master tools visibly",async()=>{
  const h=harness();await h.command("on");const e=await h.run("feature","protected","protected");
  assert.equal(e.systemPromptOptions.forceSystemPrompt,"protected");assert.equal(e.systemPromptOptions.sections.pi_claude_inspired,undefined);
  assert.match(h.notices.at(-1)!,/opaque/);
  await assert.rejects(h.tools.get("feature_dev_todos").execute("x",{todos:[]},undefined,undefined,h.ctx),/blocked/);
  await h.run();assert.equal(h.tools.get("feature_dev_todos").prepareLoadout(),undefined);
});
for (const boundary of ["off", "other-owner", "branch-navigation", "parent-abort"] as const) test(`${boundary} aborts actual parallel Pi Agent children, keeping host model/thinking unchanged`,async()=>{
  const h=harness();await h.command("on");let started=0;let aborted=0;
  let ready!:()=>void;const both=new Promise<void>(r=>ready=r);
  const originalModel=h.ctx.model;
  h.ctx.modelRegistry={streamSimple:(model:any,context:any,options:any)=>{
    assert.equal(model,originalModel);assert.equal(options.reasoning,"high");started++;if(started===2)ready();
    const done=new Promise<void>(r=>{if(options.signal.aborted){aborted++;r();}else options.signal.addEventListener("abort",()=>{aborted++;r();},{once:true});});
    const message:any={role:"assistant",content:[],api:model.api,provider:model.provider,model:model.id,usage:{input:0,output:0,cacheRead:0,cacheWrite:0,totalTokens:0,cost:{input:0,output:0,cacheRead:0,cacheWrite:0,total:0}},stopReason:"aborted",timestamp:Date.now()};
    return {async *[Symbol.asyncIterator](){await done;yield{type:"error",reason:"aborted",error:message};},result:async()=>{await done;return message;}};
  }};
  const parentAbort = new AbortController();
  const batch=h.tools.get("feature_dev_agents").execute("x",{role:"code-explorer",tasks:[{prompt:"A"},{prompt:"B"}]},parentAbort.signal,undefined,h.ctx);
  await both;
  if (boundary === "off") await h.command("off");
  else if (boundary === "other-owner") { h.manager.appendCustomEntry(SELECTOR,{version:1,owner:"codex",mode:"master"}); h.api.events.emit(SELECTOR,{}); }
  else if (boundary === "branch-navigation") await h.handlers.get("session_before_tree")({},h.ctx);
  else parentAbort.abort();
  await assert.rejects(batch,/disabled|cancelled/);
  assert.equal(started,2);assert.equal(aborted,2);assert.equal(h.ctx.model,originalModel);assert.equal(h.ctx.thinkingLevel,"high");
});

test("actual Pi loadout/projection methods hide only disabled declarations and preserve pending MCP names",async()=>{
  // Bounded integration: real AgentSession methods, fixture registries; no UI/provider/session boot.
  const {AgentSession}=await import("@earendil-works/pi-coding-agent");
  const h=harness();
  const host:any=Object.create(AgentSession.prototype);
  const foreign={name:"other_plugin",description:"keep",parameters:{type:"object"}};
  host.agent={state:{tools:[foreign]}};
  host._toolRegistry=new Map([[foreign.name,foreign],...Array.from(h.tools,([name,t])=>[name,t] as [string,any])]);
  host._toolDefinitions=new Map(Array.from(h.tools,([name,definition])=>[name,{definition,sourceInfo:{path:"fixture"}}]));
  host._toolPromptGuidelines=new Map();host._pendingToolNames=new Set(["mcp__not_yet_registered"]);
  host._getToolExposure=()=>"deferred";host._isActivatable=()=>true;host._getCallableTools=()=>Array.from(host._toolRegistry.values());
  host._rebuildSystemPrompt=()=>{};
  host._installHiddenDeclarationsProjection();
  const declarations=()=>[{role:"system",content:"host",toolsAdded:[foreign,...h.tools.values()]}];
  const projected=async()=> (await host.agent.transformContext(declarations()))[0].toolsAdded.map((t:any)=>t.name);
  await h.command("on");host.setActiveToolsByName([foreign.name,...h.tools.keys()]);
  assert.deepEqual(await projected(),[foreign.name,...h.tools.keys()]);
  await h.command("off");host.setActiveToolsByName(host.getActiveToolNames());
  assert.deepEqual(await projected(),[foreign.name]);
  assert.ok(host._pendingToolNames.has("mcp__not_yet_registered"));
  assert.deepEqual(host.getActiveToolNames(),[foreign.name,...h.tools.keys()]);
  await h.command("on");host.setActiveToolsByName(host.getActiveToolNames());
  assert.deepEqual(await projected(),[foreign.name,...h.tools.keys()]);
});

test("real ExtensionRunner rebuilds fresh structured host/project sections across on/off",async()=>{
  const {ExtensionRunner}=await import("@earendil-works/pi-coding-agent");
  const temp=await mkdtemp(join(tmpdir(),"claude-runner-"));
  try {
    const loaded=await discoverAndLoadExtensions([join(root,"extensions/index.ts")],temp,join(temp,"agent"));
    assert.deepEqual(loaded.errors,[]);
    const h=harness();
    const runner=new ExtensionRunner(loaded.extensions,loaded.runtime,temp,h.manager,{} as any);
    runner.bindCore({...h.api,getThinkingLevel:()=>"high"} as any,{getModel:()=>h.ctx.model,getScopedModels:()=>[],isIdle:()=>true,isProjectTrusted:()=>true,getSignal:()=>undefined,getSystemPrompt:()=>"base",hasPendingMessages:()=>false} as any);
    const cmd=loaded.extensions[0].commands.get("claude-inspired")!;
    const ctx=runner.createContext();
    await cmd.handler("on",ctx as any);
    const base={cwd:temp,customPrompt:"MY CURRENT PI RULES",sections:{other_plugin:"KEEP OTHER"},contextFiles:[{path:"AGENTS.md",content:"PROJECT RULES"}],skills:[]};
    const first=await runner.emitBeforeAgentStart({messageType:"user",prompt:"feature request"},base);
    assert.ok(first.systemPromptOptions.sections.pi_claude_inspired);
    assert.equal(first.systemPromptOptions.sections.other_plugin,"KEEP OTHER");
    assert.equal(first.systemPromptOptions.customPrompt,"MY CURRENT PI RULES");
    assert.equal((base.sections as any).pi_claude_inspired,undefined,"runner must not mutate persistent base");
    await cmd.handler("off",ctx as any);
    const next=await runner.emitBeforeAgentStart({messageType:"user",prompt:"hello"},{...base,customPrompt:"NEW PI RULES"});
    assert.equal(next.systemPromptOptions.sections.pi_claude_inspired,undefined);
    assert.equal(next.systemPromptOptions.customPrompt,"NEW PI RULES");
    assert.deepEqual(next.systemPromptOptions.contextFiles,base.contextFiles);
  }finally{await rm(temp,{recursive:true,force:true});}
});
