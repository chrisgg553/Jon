import http from "node:http";
import crypto from "node:crypto";
import path from "node:path";
import {createRequire} from "node:module";
import express from "express";
import {scramjetPath} from "@mercuryworkshop/scramjet/path";
import {server as wisp,logging} from "@mercuryworkshop/wisp-js/server";
const require=createRequire(import.meta.url);
const dirOf=(name)=>path.dirname(require.resolve(name));
const app=express();
const port=Number(process.env.PORT||10000);
const access=process.env.ACCESS_TOKEN||"";
const hasSecret=access.length>=24;
const cookie=crypto.createHmac("sha256",access).update("noveyflow-scramjet-access-v1").digest("hex");
const secureEqual=(x,y)=>{const a=Buffer.from(x||""),b=Buffer.from(y||"");return a.length===b.length && crypto.timingSafeEqual(a,b);};
const isAllowed=req=>{const match=(req.headers.cookie||"").match(/(?:^|;\s*)nv_auth=([^;]*)/);return hasSecret && secureEqual(match?.[1],cookie);};
const fail=(res,status,msg)=>res.status(status).type("text/plain").set("Cache-Control","no-store").send(msg);
app.disable("x-powered-by");
app.use((req,res,next)=>{
  res.set("X-Content-Type-Options","nosniff");
  res.set("Referrer-Policy","no-referrer");
  res.set("Cross-Origin-Opener-Policy","same-origin");
  res.set("Cross-Origin-Embedder-Policy","require-corp");
  next();
});
app.get("/health",(req,res)=>res.json({up:true,engine:"scramjet",authenticated:hasSecret}));
app.get("/open",(req,res)=>{
  if(!hasSecret || !secureEqual(String(req.query.k||""),access)) return fail(res,403,"Invalid private invitation.");
  res.cookie("nv_auth",cookie,{httpOnly:true,secure:true,sameSite:"lax",maxAge:86400000,path:"/"});
  res.set("Cache-Control","no-store").redirect("/");
});
app.use((req,res,next)=>isAllowed(req)?next():fail(res,403,"Private NOVEYFLOW gateway: open your emailed invitation link first."));
app.use("/scram/",express.static(scramjetPath,{maxAge:"1h"}));
app.use("/controller/",express.static(dirOf("@mercuryworkshop/scramjet-controller"),{maxAge:"1h"}));
app.use("/utils/",express.static(dirOf("@mercuryworkshop/scramjet-utils"),{maxAge:"1h"}));
app.use("/libcurl/",express.static(dirOf("@mercuryworkshop/libcurl-transport"),{maxAge:"1h"}));
app.use(express.static("public",{index:"index.html",setHeaders(res,file){if(file.endsWith("/sw.js"))res.setHeader("Service-Worker-Allowed","/");}}));
app.use((req,res)=>fail(res,404,"Unknown resource."));
logging.set_level(logging.NONE);
Object.assign(wisp.options,{
  allow_udp_streams:false,
  hostname_blacklist:[/^localhost$/i,/^127(?:\.\d{1,3}){3}$/i,/^169\.254\./,/^192\.168\./,/^10\./,/^0\./,/\.local$/i,/^::1$/,/^fc/i,/^fd/i],
});
const server=http.createServer(app);
let activeSockets=0;
server.on("upgrade",(req,socket,head)=>{
  const pathname=new URL(req.url||"/","http://localhost").pathname;
  if(!isAllowed(req)||pathname!=="/wisp/"||activeSockets>=50){socket.destroy();return;}
  ++activeSockets;
  socket.once("close",()=>{activeSockets=Math.max(0,activeSockets-1);});
  req.url=pathname;
  wisp.routeRequest(req,socket,head);
});
server.listen(port,"0.0.0.0",()=>console.log("NOVEYFLOW Scramjet gateway listening on",port));
