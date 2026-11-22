const COOKIE_NAME="mp_session",SESSION_SECONDS=8*60*60;
function json(data,status=200,headers={}){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",...headers}});}
function safeEqual(a,b){const x=new TextEncoder().encode(String(a)),y=new TextEncoder().encode(String(b));let d=x.length^y.length;for(let i=0;i<Math.max(x.length,y.length);i++)d|=(x[i]||0)^(y[i]||0);return d===0;}
function b64(bytes){let s="";for(const v of new Uint8Array(bytes))s+=String.fromCharCode(v);return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");}
async function sign(v,secret){const k=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return b64(await crypto.subtle.sign("HMAC",k,new TextEncoder().encode(v)));}
async function newToken(env){const p=b64(new TextEncoder().encode(JSON.stringify({exp:Math.floor(Date.now()/1000)+SESSION_SECONDS})));return p+"."+await sign(p,env.SESSION_SECRET);}
async function authenticated(req,env){const c=(req.headers.get("Cookie")||"").split(";").map(x=>x.trim()).find(x=>x.startsWith(COOKIE_NAME+"="));if(!c)return false;const [p,s,...rest]=c.slice(COOKIE_NAME.length+1).split(".");if(!p||!s||rest.length)return false;if(!safeEqual(s,await sign(p,env.SESSION_SECRET)))return false;try{return JSON.parse(atob(p.replace(/-/g,"+").replace(/_/g,"/"))).exp>Math.floor(Date.now()/1000);}catch{return false;}}
function cookie(v,age){return `${COOKIE_NAME}=${v}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;}
function sameOrigin(req){const o=req.headers.get("Origin");return !o||o===new URL(req.url).origin;}
function validState(d){if(!d||typeof d!=="object"||!["produtos","clientes","vendas","fin"].every(k=>Array.isArray(d[k])))return false;if(JSON.stringify(d).length>900000)return false;
for(const p of d.produtos)if(!p||typeof p.nome!=="string"||!Number.isFinite(+p.preco)||!Number.isFinite(+p.estoque)||!Number.isFinite(+(p.custo||0))||+p.preco<=0||+p.estoque<0||+(p.custo||0)<0)return false;
for(const c of d.clientes)if(!c||typeof c.nome!=="string"||!c.nome.trim())return false;
for(const v of d.vendas)if(!v||!Number.isFinite(+v.total)||+v.total<0)return false;
for(const f of d.fin)if(!f||typeof f.desc!=="string"||!Number.isFinite(+f.valor)||+f.valor<=0)return false;return true;}
async function readState(env){let r=await env.DB.prepare("SELECT data FROM app_state WHERE id=1").first();if(!r){let d={produtos:[],clientes:[],vendas:[],fin:[]};await env.DB.prepare("INSERT INTO app_state(id,data,updated_at) VALUES(1,?,datetime('now'))").bind(JSON.stringify(d)).run();return d;}return JSON.parse(r.data);}
export default {async fetch(req,env){const u=new URL(req.url);
if(u.pathname.startsWith("/api/")){
if(!env.ADMIN_PASSWORD||!env.SESSION_SECRET||!env.DB)return json({error:"Configuração do servidor incompleta."},503);
if(u.pathname==="/api/login"&&req.method==="POST"){if(!sameOrigin(req))return json({error:"Origem inválida."},403);let b;try{b=await req.json();}catch{return json({error:"JSON inválido."},400);}if(!safeEqual(b.password||"",env.ADMIN_PASSWORD))return json({error:"Credenciais inválidas."},401);return json({ok:true},200,{"Set-Cookie":cookie(await newToken(env),SESSION_SECONDS)});}
if(u.pathname==="/api/logout"&&req.method==="POST"){if(!sameOrigin(req))return json({error:"Origem inválida."},403);return json({ok:true},200,{"Set-Cookie":cookie("",0)});}
if(u.pathname==="/api/state"){if(!await authenticated(req,env))return json({error:"Não autenticado."},401);
if(req.method==="GET"){try{return json(await readState(env));}catch{return json({error:"Falha ao consultar banco."},500);}}
if(req.method==="PUT"){if(!sameOrigin(req))return json({error:"Origem inválida."},403);const len=+(req.headers.get("Content-Length")||0);if(len>1000000)return json({error:"Payload muito grande."},413);let d;try{d=await req.json();}catch{return json({error:"JSON inválido."},400);}if(!validState(d))return json({error:"Dados inválidos."},422);
try{await env.DB.prepare("INSERT INTO app_state(id,data,updated_at) VALUES(1,?,datetime('now')) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated_at=datetime('now')").bind(JSON.stringify({produtos:d.produtos,clientes:d.clientes,vendas:d.vendas,fin:d.fin})).run();return json({ok:true});}catch{return json({error:"Erro ao salvar no banco."},500);}}}
return json({error:"Rota não encontrada."},404);}
return env.ASSETS.fetch(req);}};
