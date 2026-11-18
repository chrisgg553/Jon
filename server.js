'use strict';
const http = require('node:http');
const { createHmac, timingSafeEqual } = require('node:crypto');
const { Readable } = require('node:stream');
const fs = require('node:fs');
const { gzipSync } = require('node:zlib');
const PORT = Number(process.env.PORT || 10000);
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || '';
const ZENROWS_API_KEY = process.env.ZENROWS_API_KEY || '';
const ORIGIN = process.env.PUBLIC_ORIGIN || '';
const VALID_HOSTS = ['tiktok.com', 'tiktokcdn.com', 'tiktokcdn-us.com', 'tiktokv.com', 'tiktokv.us', 'byteoversea.com', 'ibytedtos.com', 'muscdn.com', 'ttwstatic.com', 'tiktokstatic.com', 'ttlivecdn.com'];
const page = fs.readFileSync('./public/index.html');
const authCookie = createHmac('sha256', ACCESS_TOKEN).update('noveyflow-private-gateway-v2').digest('hex');
const quota = new Map();
const pageCache = new Map();
const PAGE_CACHE_MS = 60_000; // short-lived, in-memory public-page cache; no account data
function equal(a, b) { const x = Buffer.from(String(a)), y=Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x,y); }
function cookies(req) { return Object.fromEntries((req.headers.cookie || '').split(';').map(p=>p.trim().split('=').slice(0,2)).filter(p=>p.length===2)); }
function authorized(req) { return ACCESS_TOKEN.length >= 24 && equal(cookies(req).nv_auth || '', authCookie); }
function safeURL(text, base) {
  try {
    const u = new URL(text, base);
    const h = u.hostname.toLowerCase();
    if (u.protocol !== 'https:' || (u.port && u.port !== '443') || u.username || u.password ||
        !VALID_HOSTS.some(d => h === d || h.endsWith('.' + d))) return null;
    return u;
  } catch { return null; }
}
function proxyLink(text, base) {
  if (!text || /^(?:#|data:|blob:|javascript:|mailto:)/i.test(text)) return text;
  const u = safeURL(text, base);
  return u ? '/p?u=' + encodeURIComponent(u.toString()) : text;
}
function rewriteHTML(html, base) {
  html = html.replace(/\b(href|src|poster|action)\s*=\s*(["'])(.*?)\2/gi, (m,a,q,v)=>a+'='+q+proxyLink(v,base)+q);
  html = html.replace(/\bsrcset\s*=\s*(["'])(.*?)\1/gi, (m,q,v)=>'srcset='+q+v.split(',').map(x=>{const p=x.trim().split(/\s+/);p[0]=proxyLink(p[0],base);return p.join(' ')}).join(', ')+q);
  html = html.replace(/url\(\s*(["']?)([^"'()]+)\1\s*\)/gi,(m,q,v)=>'url('+q+proxyLink(v.trim(),base)+q+')');
  return html.replace(/<head(\s[^>]*)?>/i, '$&<meta name="referrer" content="no-referrer">');
}
function send(res, code, body, type='text/plain; charset=utf-8') {
  res.writeHead(code, {'Content-Type':type,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer'});
  res.end(body);
}
function sendHTML(req,res,code,html,cacheHit=false) {
  const body=Buffer.from(html,'utf8');
  const headers={'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store',
    'X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow',
    'Referrer-Policy':'no-referrer','Vary':'Accept-Encoding','X-NOVEYFLOW-Cache':cacheHit?'HIT':'MISS'};
  if (/\bgzip\b/i.test(String(req.headers['accept-encoding']||'')) && body.length>1024) {
    const compressed=gzipSync(body,{level:4});
    headers['Content-Encoding']='gzip';headers['Content-Length']=String(compressed.length);
    res.writeHead(code,headers);return res.end(compressed);
  }
  headers['Content-Length']=String(body.length);
  res.writeHead(code,headers);return res.end(body);
}
function limited(req) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0];
  const now = Date.now(), cur=quota.get(ip);
  if (!cur || now-cur.t>60000) {quota.set(ip,{t:now,n:1});return false;}
  cur.n++;return cur.n>150;
}
async function getUpstream(url, req, isDoc) {
  if (isDoc && ZENROWS_API_KEY) {
    const u = new URL('https://api.zenrows.com/v1/');
    u.searchParams.set('apikey', ZENROWS_API_KEY);
    u.searchParams.set('url', url.toString());
    u.searchParams.set('mode', 'auto');
    const result = await fetch(u,{signal:AbortSignal.timeout(25000),headers:{'Accept':'text/html'}});
    if (result.ok) return result;
    console.warn('ZenRows HTML fetch failed with status',result.status);
  }
  const headers={'Accept':req.headers.accept || '*/*','User-Agent':'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'};
  if(req.headers.range) headers.Range=req.headers.range;
  return fetch(url,{headers,redirect:'manual',signal:AbortSignal.timeout(25000)});
}
const server = http.createServer(async(req,res)=>{
  const here=new URL(req.url,'https://localhost');
  if(here.pathname==='/health') return send(res,200,JSON.stringify({ok:true,proxy:'read-only',zenrowsConfigured:!!ZENROWS_API_KEY}),'application/json');
  if(here.pathname==='/open') {
    if(ACCESS_TOKEN.length<24 || !equal(here.searchParams.get('k')||'',ACCESS_TOKEN)) return send(res,403,'Invalid private access link');
    res.writeHead(302,{Location:'/', 'Set-Cookie':'nv_auth='+authCookie+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400','Cache-Control':'no-store','Referrer-Policy':'no-referrer'});return res.end();
  }
  if(!authorized(req)) return send(res,403,'Private gateway: open your invitation link from email.');
  if(here.pathname==='/') return send(res,200,page,'text/html; charset=utf-8');
  // TikTok loads scripts, images, and API reads using path-relative URLs.
  // The previous /p-only handler returned a plain "Not found" 404 for those requests.
  // Resolve otherwise-unmatched GET/HEAD paths strictly against the allowlisted TikTok origin.
  if(req.method!=='GET'&&req.method!=='HEAD') return send(res,405,'This gateway is read-only. Sign in and post only on the official TikTok website.');
  if(limited(req)) return send(res,429,'Request limit reached. Try again in one minute.');
  const requestUrl = here.pathname==='/p'
    ? here.searchParams.get('u')
    : 'https://www.tiktok.com' + here.pathname + here.search;
  if(!requestUrl) return send(res,400,'Missing TikTok URL');
  const target=safeURL(requestUrl);
  if(!target) return send(res,400,'Only allowlisted HTTPS TikTok destinations are permitted.');
  const contentAccept=String(req.headers.accept||'');
  const docExt=/\.(?:js|mjs|css|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|otf|mp4|webm|m3u8|ts|json|map)(?:$|\?)/i.test(target.pathname);
  const isDoc=!docExt&&(contentAccept.includes('text/html')||target.pathname==='/'||target.pathname==='/foryou');
  try{
    if (isDoc && req.method==='GET') {
      const saved=pageCache.get(target.href);
      if (saved && Date.now()-saved.at < PAGE_CACHE_MS) return sendHTML(req,res,saved.code,saved.html,true);
      if (saved) pageCache.delete(target.href);
    }
    const upstream=await getUpstream(target,req,isDoc);
    if([301,302,303,307,308].includes(upstream.status)){
      const loc=upstream.headers.get('location');
      const moved=safeURL(loc,target);
      if(!moved)return send(res,502,'TikTok redirected to an unsupported domain.');
      res.writeHead(302,{Location:proxyLink(moved.href,target.href),'Cache-Control':'no-store'});
      return res.end();
    }
    const type=upstream.headers.get('content-type')||'application/octet-stream';
    if(type.includes('text/html') || (isDoc && ZENROWS_API_KEY && (type.includes('text/plain') || type.includes('application/octet-stream')))){
      const raw=await upstream.text();
      if(raw.length>8_000_000)return send(res,413,'Page too large.');
      const blocked = /slardar_us_waf|_wafchallengeid|<body>\s*Please wait\.\.\./i.test(raw);
      if (blocked) {
        return sendHTML(req,res,200,'<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>TikTok verification</title><body style="font:16px -apple-system,sans-serif;background:#10111a;color:white;padding:2rem;max-width:35rem;margin:auto"><h2>TikTok requires verification</h2><p>This page is a TikTok security check. ZenRows cannot provide a reliable fully interactive account experience through this personal proxy.</p><p>For account access, use the <a href="https://www.tiktok.com/" rel="noopener noreferrer" style="color:#b5a0ff">official TikTok website</a> or the official app.</p><p><a href="/" style="color:#b5a0ff">Return to NOVEYFLOW</a></p></body></html>');
      }
      const rewritten=rewriteHTML(raw,target.href);
      if (isDoc && upstream.ok && req.method==='GET') {
        if (pageCache.size>=12) pageCache.delete(pageCache.keys().next().value);
        pageCache.set(target.href,{at:Date.now(),code:upstream.status,html:rewritten});
      }
      return sendHTML(req,res,upstream.status,rewritten);
    }
    if(type.includes('text/css')){
      const raw=await upstream.text();
      if(raw.length>3_000_000)return send(res,413,'CSS too large');
      const rewritten=raw.replace(/url\(\s*(["']?)([^"'()]+)\1\s*\)/gi,(m,q,u)=>'url('+q+proxyLink(u.trim(),target.href)+q+')');
      return send(res,upstream.status,rewritten,'text/css; charset=utf-8');
    }
    res.writeHead(upstream.status,{'Content-Type':type,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
      ...(upstream.headers.get('content-range')?{'Content-Range':upstream.headers.get('content-range')}:{})});
    if(!upstream.body || req.method==='HEAD')return res.end();
    let total=0;
    Readable.fromWeb(upstream.body).on('data',chunk=>{total+=chunk.length;if(total>50_000_000)res.destroy()}).on('error',()=>res.destroy()).pipe(res);
  } catch(err) {
    console.error('Proxy request failed',String(err).slice(0,200));
    send(res,502,'Unable to load TikTok through the proxy. TikTok may block automated requests or this host.');
  }
});
server.listen(PORT,'0.0.0.0',()=>console.log('NOVEYFLOW private gateway online on port',PORT));