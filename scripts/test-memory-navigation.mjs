import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';
import ts from 'typescript';

// Execute the real server component with synthetic, ownership-filtered rows.
// No environment files, backend services or user memories are accessed.
const character='00000000-0000-4000-8000-000000000010';
const active='00000000-0000-4000-8000-000000000001';
const archived='00000000-0000-4000-8000-000000000002';
const foreign='00000000-0000-4000-8000-000000000003';
const wrongCharacter='00000000-0000-4000-8000-000000000004';
const rows=[
 {id:active,user_id:'owner',character_id:character,status:'active',deleted_at:null,updated_at:'2026-10-20'},
 {id:archived,user_id:'owner',character_id:character,status:'archived',deleted_at:null,updated_at:'2026-10-19'},
 {id:foreign,user_id:'someone-else',character_id:character,status:'active',deleted_at:null},
 {id:wrongCharacter,user_id:'owner',character_id:'different-character',status:'active',deleted_at:null},
];
let unavailable=false,empty=false,calls=[];
const client={
 rpc:async()=>({data:[{id:character,name:'Zuri'}]}),
 from(table){
  const filters=[],orders=[];let maximum=Infinity;
  const result=()=>{
   if(table==='conversations'){
    calls.push(filters);
    if(unavailable)return {error:{message:'Synthetic unavailable'}};
    let found=(empty?[]:rows).filter(row=>filters.every(([key,value])=>row[key]===value));
    found=[...found].sort((a,b)=>{for(const [key,ascending] of orders){const order=String(a[key]).localeCompare(String(b[key]));if(order)return ascending?order:-order;}return 0;});
    return {data:found.slice(0,maximum)[0]??null};
   }
   return {data:table==='memory_preferences'?{enabled:true}:[]};
  };
  return {select(){return this;},eq(key,value){filters.push([key,value]);return this;},is(key,value){filters.push([key,value]);return this;},order(key,{ascending=true}={}){orders.push([key,ascending]);return this;},limit(value){maximum=value;return this;},maybeSingle:async()=>result(),then(resolve){return Promise.resolve(result()).then(resolve);}};
 },
};
const jsx=(type,props)=>({type,props});
const dependencies={
 'react/jsx-runtime':{jsx,jsxs:jsx},
 'next/link':{default:'Link'},
 '@/lib/backend/server':{currentAccount:async()=>({user:{id:'owner'},client})},
 './ui/primitives':{EmptyState:'EmptyState',Notice:'Notice'},
 './connected-memory-form':{MemoryForm:'MemoryForm'},
};
const context=createContext({});
const source=ts.transpileModule(readFileSync('components/connected-memories.tsx','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const component=new SourceTextModule(source,{context});
await component.link(name=>{
 const exports=dependencies[name];assert(exports,`Unexpected import: ${name}`);
 return new SyntheticModule(Object.keys(exports),function(){for(const [key,value]of Object.entries(exports))this.setExport(key,value);},{context});
});
await component.evaluate();
function elements(node){return !node||typeof node!=='object'?[]:[node,...[node.props?.children].flat(Infinity).flatMap(elements)];}
for(const [preferred,expected] of [[undefined,active],[archived,archived],[foreign,active],[wrongCharacter,active],['https://example.invalid',active]]){
 calls=[];
 const tree=elements(await component.namespace.ConnectedMemories({characterId:character,conversation:preferred}));
 assert(tree.some(node=>node.type==='Link'&&node.props.href===`/messages/${expected}`&&node.props.children==="Back to Zuri's chat"));
 assert(tree.some(node=>node.type==='MemoryForm'&&node.props.operation==='save'&&node.props.conversation===expected));
 for(const filters of calls){assert(filters.some(([key,value])=>key==='user_id'&&value==='owner'));assert(filters.some(([key,value])=>key==='character_id'&&value===character));assert(filters.some(([key,value])=>key==='deleted_at'&&value===null));}
}
empty=true;
let tree=elements(await component.namespace.ConnectedMemories({characterId:character}));
assert(tree.some(node=>node.type==='Link'&&node.props.href==='/messages'));
empty=false;unavailable=true;
tree=elements(await component.namespace.ConnectedMemories({characterId:character}));
assert(tree.some(node=>node.type==='Notice'&&node.props.title==='Conversation link unavailable'));
assert(!tree.some(node=>node.type==='MemoryForm'));
console.log('Memory navigation passed: direct visits, explicit chat, foreign/mismatched hints, owner/character/deletion filters, empty history and temporary lookup failure. No network calls.');
