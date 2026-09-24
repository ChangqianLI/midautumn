(() => {
"use strict";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const endingOverlay = document.getElementById("endingOverlay");
const dialogueBox = document.getElementById("dialogue");
const dialogueText = document.getElementById("dialogueText");
const endingMoon = document.getElementById("endingMoon");
const endingTitle = document.getElementById("endingTitle");
const endingCounts = document.getElementById("endingCounts");
const endingText = document.getElementById("endingText");
const endingDialogue = document.getElementById("endingDialogue");

const WORLD = { width: 4300, height: 1590 };
let cameraX = 0, cameraY = 1060, gameState = "start";
let lastTime = performance.now(), muted = false, dialogue = null, interactionLock = false, redirectTimer = null;

const keys = { left:false, right:false, jump:false, interact:false };

const player = {
  x: 2050, y: 1430, w: 52, h: 64,
  vx: 0, vy: 0, speed: 300, jumpPower: 760,
  grounded: false, facing: 1, fragments: 0, mooncakes: 0,
  checkpointX: 2050, checkpointY: 1430
};

// Character art:
 // Primary art is loaded from downloadable character-art pages found on the web.
 // Local SVGs remain as fallbacks so the game never breaks if an external image
 // host is temporarily unavailable.
const spriteSources = {
  chiikawa: {
    // Calmer transparent sticker: only Chiikawa, no square background.
    remote: "https://media4.giphy.com/media/V2MRU5wYxmNEtBTgCx/giphy.gif",
    fallback: "chiikawa.svg"
  },
  hachiware: {
    // Animated transparent Tenor sticker
    remote: "https://media.tenor.com/F9fPNTlsf0wAAAAj/hachiware.gif",
    fallback: "hachiware.svg"
  },
  usagi: {
    // Animated transparent Tenor sticker
    remote: "https://media.tenor.com/_vwAWnWbAwkAAAAj/chiikawa-usagi.gif",
    fallback: "usagi.svg"
  }
};

const sprites = {};
for (const [name, source] of Object.entries(spriteSources)) {
  const img = new Image();
  img.decoding = "async";
  img.onerror = () => {
    if (img.src.endsWith(source.fallback)) return;
    img.src = source.fallback;
  };
  img.src = source.remote;
  sprites[name] = img;
}

// The map is deliberately hub-like instead of one-way.
// Lower floor, upper terraces, left cave, right bamboo ridge, central shrine tower.
const platforms = [
  // central start / hub
  {x:1680,y:1510,w:950,h:80,t:"ground"},
  {x:1910,y:1370,w:190,h:22,t:"stone"},
  {x:2220,y:1370,w:190,h:22,t:"stone"},
  {x:2050,y:1240,w:170,h:22,t:"stone"},
  {x:1880,y:1110,w:150,h:22,t:"stone"},
  {x:2240,y:1110,w:150,h:22,t:"stone"},
  {x:2050,y:975,w:170,h:22,t:"stone"},
  {x:1920,y:835,w:165,h:22,t:"stone"},
  {x:2200,y:835,w:165,h:22,t:"stone"},
  {x:2050,y:700,w:180,h:25,t:"altar"},

  // left meadow: surface + two climbing branches
  {x:0,y:1510,w:510,h:80,t:"ground"},
  {x:520,y:1510,w:500,h:80,t:"ground"},
  {x:1030,y:1510,w:640,h:80,t:"ground"},
  {x:1460,y:1375,w:150,h:22,t:"grass"},
  {x:1275,y:1260,w:150,h:22,t:"grass"},
  {x:1080,y:1150,w:150,h:22,t:"grass"},
  {x:850,y:1040,w:155,h:22,t:"grass"},
  {x:620,y:920,w:155,h:22,t:"grass"},
  {x:390,y:805,w:155,h:22,t:"grass"},
  {x:130,y:690,w:180,h:22,t:"grass"},

  // secret left canopy return route
  {x:420,y:625,w:140,h:22,t:"grass"},
  {x:680,y:700,w:145,h:22,t:"grass"},
  {x:930,y:790,w:145,h:22,t:"grass"},
  {x:1180,y:865,w:150,h:22,t:"grass"},
  {x:1430,y:950,w:150,h:22,t:"grass"},
  {x:1640,y:1030,w:135,h:22,t:"grass"},

  // right mooncake street
  {x:2640,y:1510,w:510,h:80,t:"ground"},
  {x:3160,y:1510,w:500,h:80,t:"ground"},
  {x:3670,y:1510,w:630,h:80,t:"ground"},
  {x:2780,y:1370,w:150,h:22,t:"market"},
  {x:3000,y:1250,w:150,h:22,t:"market"},
  {x:3240,y:1140,w:150,h:22,t:"market"},
  {x:3490,y:1030,w:150,h:22,t:"market"},
  {x:3730,y:920,w:150,h:22,t:"market"},
  {x:3990,y:810,w:180,h:22,t:"market"},

  // bamboo ridge: loops back toward the centre
  {x:3810,y:700,w:150,h:22,t:"bamboo"},
  {x:3550,y:690,w:180,h:22,t:"bamboo"},
  {x:3280,y:620,w:170,h:22,t:"bamboo"},
  {x:3000,y:740,w:170,h:22,t:"bamboo"},
  {x:2750,y:860,w:170,h:22,t:"bamboo"},
  {x:2530,y:970,w:160,h:22,t:"bamboo"},

  // small upper-right side branch
  {x:3470,y:530,w:145,h:22,t:"bamboo"},
  {x:3720,y:565,w:145,h:22,t:"bamboo"},
  {x:3970,y:610,w:150,h:22,t:"bamboo"}
];

const fragments = [
  // Every star sits visibly ~50 px above a reachable platform.
  {x:185,y:640,collected:false},    // far-left summit
  {x:935,y:990,collected:false},    // left middle route
  {x:2280,y:785,collected:false},   // central upper-right platform
  {x:3360,y:570,collected:false},   // bamboo ridge
  {x:4075,y:760,collected:false}    // far-right summit
];

const mooncakes = [
  {x:235,y:1460,collected:false},
  {x:780,y:1460,collected:false},
  {x:1160,y:1460,collected:false},
  {x:1580,y:1460,collected:false},

  {x:455,y:755,collected:false},
  {x:690,y:870,collected:false},
  {x:890,y:990,collected:false},
  {x:1105,y:1100,collected:false},
  {x:1310,y:1210,collected:false},
  {x:1485,y:1325,collected:false},
  {x:1205,y:815,collected:false},
  {x:1665,y:980,collected:false},

  {x:1960,y:1320,collected:false},
  {x:2280,y:1320,collected:false},
  {x:2100,y:1190,collected:false},

  {x:2815,y:1460,collected:false},
  {x:3060,y:1460,collected:false},
  {x:3400,y:1460,collected:false},
  {x:3920,y:1460,collected:false},

  {x:2860,y:1320,collected:false},
  {x:3060,y:1200,collected:false},
  {x:3550,y:980,collected:false},
  {x:3790,y:870,collected:false}
];

const npcData = [
  {
    id:"hachiware", sprite:"hachiware", name:"小八",
    x:1575,y:1442,talked:false,
    lines:[
      "吉伊！晚上好呀！",
      "今天的月亮真漂亮。",
      "慢慢来，你一定可以的！我会一直给你加油！"
    ]
  },
  {
    id:"usagi", sprite:"usagi", name:"乌萨奇",
    x:3210,y:1442,talked:false,
    lines:[
      "呀哈——！！",
      "吉伊！中秋快乐——！",
      "加油加油！呀哈！！"
    ]
  }
];

const altar = {x:2092,y:625,w:98,h:75};

const zoneLabels = [];

const stars = Array.from({length:170},(_,i)=>({
  x:(i*293)%WORLD.width, y:40+((i*97)%620), r:.6+((i*13)%20)/18
}));

function resetGame(){
  stopEndingMusic();
  if(redirectTimer){
    clearTimeout(redirectTimer);
    redirectTimer=null;
  }
  Object.assign(player,{
    x:2050,y:1430,vx:0,vy:0,fragments:0,mooncakes:0,
    checkpointX:2050,checkpointY:1430
  });
  cameraX=player.x-canvas.width/2;
  cameraY=player.y-canvas.height/2;
  fragments.forEach(o=>o.collected=false);
  mooncakes.forEach(o=>o.collected=false);
  npcData.forEach(o=>o.talked=false);
  dialogue=null;
  dialogueBox.classList.add("hidden");
  endingOverlay.classList.remove("visible");
  gameState="playing";
}


const PERFECT_REDIRECT =
  "https://app.notion.com/p/patrick-li7/happy-d5a903a4d57c46bcb31393ebbd4610fd?source=copy_link";

// V9 plays the user-provided local file music.mp4 from the same folder.

let endingAudio = null;

function ensureEndingAudio(){
  if(!endingAudio){
    endingAudio = new Audio("music.mp4");
    endingAudio.preload = "auto";
    endingAudio.loop = true;
    endingAudio.volume = 0.72;

    endingAudio.addEventListener("error", ()=>{
      console.warn("Could not load music.mp4. Put music.mp4 in the same folder as index.html and game.js.");
    });
  }
  return endingAudio;
}

function stopEndingMusic(){
  if(!endingAudio) return;
  endingAudio.pause();
  try { endingAudio.currentTime = 0; } catch(e) {}
}

function playEndingMusic(){
  const audio = ensureEndingAudio();
  audio.currentTime = 0;

  const p = audio.play();
  if(p && typeof p.catch === "function"){
    p.catch(err=>{
      console.warn("Browser blocked automatic playback of music.mp4:", err);
    });
  }
}

function endGame(){
  gameState="ending";
  dialogue=null;
  dialogueBox.classList.add("hidden");

  const perfect = player.fragments===5 && player.mooncakes===23;

  let moon, title, text, resultDialogue;

  if(perfect){
    moon="🌕";
    title="圆满的中秋夜";
    text="星屑一颗不少，月饼一个不落。今晚的月亮终于完整地亮了起来。";
    resultDialogue="小八：真的全部找到了！<br>乌萨奇：呀哈——！！<br>吉伊：……わァ……！";
  } else if(player.fragments===5){
    moon="🌕";
    title="月亮圆了";
    text="五颗星屑都回到了月亮身边。还有一些月饼散落在夜色里，等着下一次散步时被发现。";
    resultDialogue="小八：月亮变圆啦！<br>乌萨奇：呀哈！<br>吉伊：……！";
  } else if(player.fragments<3){
    moon="🌒";
    title="月亮还缺了一点";
    text="今晚走过的路已经很远了，不过还有星光藏在没有踏过的岔路上。";
    resultDialogue="小八：下次再一起找找看吧。<br>吉伊：嗯……！";
  } else {
    moon="🌔";
    title="温柔的月夜";
    text="月亮还没有完全圆，可已经足够把草坡、竹林和回家的路照得很亮。";
    resultDialogue="小八：已经很好看了呢。<br>吉伊：……わァ。";
  }

  endingMoon.textContent=moon;
  endingTitle.textContent=title;
  endingCounts.textContent=`⭐ ${player.fragments}/5　　🥮 ${player.mooncakes}/23`;
  endingText.textContent=text;
  endingDialogue.innerHTML=resultDialogue;

  endingOverlay.classList.add("visible");

  playArpeggio();
  playEndingMusic();

  if(perfect){
    redirectTimer=setTimeout(()=>{
      window.location.assign(PERFECT_REDIRECT);
    },7000);
  }
}

function showDialogue(name,lines,onFinish){
  dialogue={name,lines,index:0,onFinish};
  dialogueText.textContent=lines[0];
  dialogueBox.classList.remove("hidden");
  player.vx=0;
}

function advanceDialogue(){
  if(!dialogue)return;
  dialogue.index++;
  if(dialogue.index>=dialogue.lines.length){
    const done=dialogue.onFinish;
    dialogue=null;
    dialogueBox.classList.add("hidden");
    if(done)done();
  } else {
    dialogueText.textContent=dialogue.lines[dialogue.index];
    playTone(650,.035,"triangle",.015);
  }
}

function rectsOverlap(a,b){
  return a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y;
}
function circleRect(cx,cy,r,rect){
  const nx=Math.max(rect.x,Math.min(cx,rect.x+rect.w));
  const ny=Math.max(rect.y,Math.min(cy,rect.y+rect.h));
  const dx=cx-nx,dy=cy-ny;
  return dx*dx+dy*dy<r*r;
}

function respawn(){
  player.x=player.checkpointX;
  player.y=player.checkpointY;
  player.vx=0; player.vy=-120;
  playTone(180,.18,"sine",.03);
}

function nearestInteractive(){
  const px=player.x+player.w/2,py=player.y+player.h/2;
  for(const npc of npcData){
    if(Math.hypot(px-npc.x,py-npc.y)<105) return {type:"npc",data:npc};
  }
  const ax=altar.x+altar.w/2,ay=altar.y+altar.h/2;
  if(Math.hypot(px-ax,py-ay)<125) return {type:"altar",data:altar};
  return null;
}

function handleInteract(){
  if(interactionLock)return;
  interactionLock=true;
  setTimeout(()=>interactionLock=false,140);
  if(dialogue){ advanceDialogue(); return; }
  if(gameState!=="playing")return;
  const target=nearestInteractive();
  if(!target)return;
  if(target.type==="npc"){
    const npc=target.data;
    showDialogue(npc.name,npc.lines,()=>{
      npc.talked=true;
      if(npc.id==="hachiware"){ player.checkpointX=1575; player.checkpointY=1410; }
      if(npc.id==="usagi"){ player.checkpointX=3210; player.checkpointY=1410; }
    });
  } else endGame();
}

function update(dt){
  // IMPORTANT: process E/Enter even while a dialogue box is open.
  // In V2 the early return happened first, so the dialogue could trap the player.
  if(keys.interact){
    keys.interact=false;
    handleInteract();
  }

  if(gameState!=="playing"||dialogue)return;

  const accel=player.speed*7.5, friction=.82;
  if(keys.left){ player.vx-=accel*dt; player.facing=-1; }
  if(keys.right){ player.vx+=accel*dt; player.facing=1; }
  if(!keys.left&&!keys.right) player.vx*=Math.pow(friction,dt*60);
  player.vx=Math.max(-player.speed,Math.min(player.speed,player.vx));

  if(keys.jump&&player.grounded){
    player.vy=-player.jumpPower;
    player.grounded=false;
    playTone(420,.08,"square",.018);
  }

  player.vy+=1600*dt;
  player.x+=player.vx*dt;
  player.x=Math.max(0,Math.min(WORLD.width-player.w,player.x));

  const oldY=player.y;
  player.y+=player.vy*dt;
  player.grounded=false;
  const getRect=()=>({x:player.x,y:player.y,w:player.w,h:player.h});

  for(const p of platforms){
    if(!rectsOverlap(getRect(),p))continue;
    if(player.vy>=0 && oldY+player.h<=p.y+10){
      player.y=p.y-player.h; player.vy=0; player.grounded=true;
    } else if(player.vy<0 && oldY>=p.y+p.h-10){
      player.y=p.y+p.h; player.vy=40;
    } else {
      const pc=player.x+player.w/2, qc=p.x+p.w/2;
      player.x=pc<qc?p.x-player.w:p.x+p.w;
      player.vx=0;
    }
  }

  if(player.y>WORLD.height+220)respawn();

  const pr=getRect();
  for(const f of fragments){
    if(!f.collected && circleRect(f.x,f.y,17,pr)){
      f.collected=true; player.fragments++; playTone(900,.13,"sine",.036);
    }
  }
  for(const m of mooncakes){
    if(!m.collected && circleRect(m.x,m.y,17,pr)){
      m.collected=true; player.mooncakes++; playTone(620,.08,"triangle",.025);
    }
  }

  const tx=player.x-canvas.width*.48;
  const ty=player.y-canvas.height*.56;
  cameraX+=(tx-cameraX)*Math.min(1,dt*4.2);
  cameraY+=(ty-cameraY)*Math.min(1,dt*4.2);
  cameraX=Math.max(0,Math.min(WORLD.width-canvas.width,cameraX));
  cameraY=Math.max(0,Math.min(WORLD.height-canvas.height,cameraY));
}

function roundedRect(x,y,w,h,r){
  ctx.beginPath(); ctx.roundRect(x,y,w,h,r);
}


function clamp01(v){ return Math.max(0,Math.min(1,v)); }

function mixRGB(a,b,t){
  return [
    Math.round(a[0]+(b[0]-a[0])*t),
    Math.round(a[1]+(b[1]-a[1])*t),
    Math.round(a[2]+(b[2]-a[2])*t)
  ];
}

function rgb(c,a=1){ return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }

function sceneBlend(){
  const center=cameraX+canvas.width/2;
  // 0 = left osmanthus meadow, 1 = right bamboo/lantern landscape.
  return clamp01((center-1500)/1500);
}

function drawLeftSkyDetails(weight){
  if(weight<=.01)return;
  ctx.save();
  ctx.globalAlpha=weight;

  // Soft rolling hills.
  ctx.fillStyle="rgba(48,76,72,.55)";
  ctx.beginPath();
  ctx.moveTo(0,canvas.height);
  for(let x=-80;x<=canvas.width+120;x+=120){
    const wx=x+cameraX*.22;
    const y=350+Math.sin(wx*.0055)*27-cameraY*.025;
    ctx.quadraticCurveTo(x+60,y-28,x+120,y);
  }
  ctx.lineTo(canvas.width,canvas.height);
  ctx.closePath();
  ctx.fill();

  // Distant osmanthus crowns.
  for(let i=-1;i<12;i++){
    const wx=i*115+((cameraX*.12)%115);
    const x=wx-115;
    const y=343+(i%3)*8-cameraY*.018;
    ctx.fillStyle=i%2?"rgba(71,102,75,.58)":"rgba(82,112,81,.55)";
    ctx.beginPath();
    ctx.arc(x,y,34,Math.PI,Math.PI*2);
    ctx.arc(x+29,y+2,29,Math.PI,Math.PI*2);
    ctx.arc(x+54,y,34,Math.PI,Math.PI*2);
    ctx.fill();
  }

  // Fine pale mist.
  const mist=ctx.createLinearGradient(0,260,0,470);
  mist.addColorStop(0,"rgba(210,228,210,0)");
  mist.addColorStop(.55,"rgba(210,228,210,.08)");
  mist.addColorStop(1,"rgba(210,228,210,.18)");
  ctx.fillStyle=mist;
  ctx.fillRect(0,220,canvas.width,300);

  ctx.restore();
}

function drawRightSkyDetails(weight){
  if(weight<=.01)return;
  ctx.save();
  ctx.globalAlpha=weight;

  // Darker layered mountains.
  ctx.fillStyle="rgba(55,45,65,.60)";
  ctx.beginPath();
  ctx.moveTo(0,canvas.height);
  for(let x=-120;x<=canvas.width+180;x+=150){
    const wx=x+cameraX*.20;
    const y=360+Math.sin(wx*.0042)*42-cameraY*.02;
    ctx.lineTo(x,y);
  }
  ctx.lineTo(canvas.width,canvas.height);
  ctx.closePath();
  ctx.fill();

  // Distant bamboo silhouettes.
  ctx.strokeStyle="rgba(37,71,59,.50)";
  ctx.lineWidth=7;
  for(let i=-2;i<20;i++){
    const x=i*72-((cameraX*.15)%72);
    const top=190+(i%4)*22;
    ctx.beginPath(); ctx.moveTo(x,470); ctx.lineTo(x+9,top); ctx.stroke();
    for(let y=top+50;y<430;y+=70){
      ctx.lineWidth=3;
      ctx.beginPath();
      ctx.moveTo(x+3,y);
      ctx.quadraticCurveTo(x+25,y-10,x+38,y-25);
      ctx.stroke();
      ctx.lineWidth=7;
    }
  }

  // Warm lantern glow in distance.
  for(let i=0;i<8;i++){
    const x=70+i*130-((cameraX*.08)%130);
    const y=300+(i%2)*38;
    const glow=ctx.createRadialGradient(x,y,2,x,y,36);
    glow.addColorStop(0,"rgba(255,204,118,.25)");
    glow.addColorStop(1,"rgba(255,204,118,0)");
    ctx.fillStyle=glow;
    ctx.beginPath(); ctx.arc(x,y,36,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="rgba(236,133,92,.65)";
    ctx.beginPath(); ctx.ellipse(x,y,7,10,0,0,Math.PI*2); ctx.fill();
  }

  ctx.restore();
}

function drawBackground(){
  const t=sceneBlend();

  const top=mixRGB([20,35,58],[39,25,52],t);
  const mid=mixRGB([46,78,78],[82,55,69],t);
  const bottom=mixRGB([78,103,86],[105,75,68],t);

  const g=ctx.createLinearGradient(0,0,0,canvas.height);
  g.addColorStop(0,rgb(top));
  g.addColorStop(.58,rgb(mid));
  g.addColorStop(1,rgb(bottom));
  ctx.fillStyle=g;
  ctx.fillRect(0,0,canvas.width,canvas.height);

  for(const s of stars){
    const sx=s.x-cameraX*.22, sy=s.y-cameraY*.08;
    if(sx<-5||sx>canvas.width+5||sy<-5||sy>canvas.height+5)continue;
    ctx.globalAlpha=.35+(s.r%1)*.45;
    ctx.fillStyle=t<.5?"#f5f0d3":"#ffe4c4";
    ctx.beginPath(); ctx.arc(sx,sy,s.r,0,Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha=1;

  drawMoon();
  drawLeftSkyDetails(1-t);
  drawRightSkyDetails(t);

  // Common far ridge to make the transition feel continuous.
  ctx.fillStyle=t<.5?"rgba(40,58,66,.58)":"rgba(50,41,57,.58)";
  ctx.beginPath();
  ctx.moveTo(0,canvas.height);
  for(let x=-100;x<canvas.width+180;x+=150){
    const wx=x+cameraX*.30;
    const y=405+Math.sin(wx*.005)*28-cameraY*.04;
    ctx.quadraticCurveTo(x+75,y-45,x+150,y);
  }
  ctx.lineTo(canvas.width,canvas.height);
  ctx.closePath();
  ctx.fill();
}
function drawMoon(){
  const ratio=player.fragments/fragments.length;
  const mx=805,my=88,r=50;
  ctx.save(); ctx.shadowColor="rgba(255,229,151,.55)"; ctx.shadowBlur=28; ctx.fillStyle="#ffe89e";
  ctx.beginPath(); ctx.arc(mx,my,r,0,Math.PI*2); ctx.fill(); ctx.restore();
  if(ratio<1){
    const offset=r*2*ratio-r;
    ctx.fillStyle="#2b2d52";
    ctx.beginPath(); ctx.arc(mx-offset,my,r*.96,0,Math.PI*2); ctx.fill();
  }
}

function platformColor(t){
  return ({
    ground:"#665744", stone:"#777188", grass:"#665744",
    market:"#865f65", bamboo:"#5b705d", altar:"#8d8399"
  })[t]||"#6f6a7a";
}


function hash01(n){
  const x=Math.sin(n*12.9898+78.233)*43758.5453;
  return x-Math.floor(x);
}

function drawGrassTuft(x,y,seed,scale=1){
  const sway=(hash01(seed)-.5)*4;
  ctx.strokeStyle="#7d985f";
  ctx.lineWidth=2.2*scale;
  ctx.lineCap="round";
  ctx.beginPath();
  ctx.moveTo(x,y);
  ctx.quadraticCurveTo(x-5*scale+sway,y-8*scale,x-7*scale+sway,y-15*scale);
  ctx.moveTo(x,y);
  ctx.quadraticCurveTo(x+sway,y-10*scale,x+1*scale+sway,y-18*scale);
  ctx.moveTo(x,y);
  ctx.quadraticCurveTo(x+6*scale+sway,y-8*scale,x+9*scale+sway,y-14*scale);
  ctx.stroke();
}

function drawFlower(x,y,seed){
  const palette=["#f7d7e2","#f8e8a4","#d8d5ff","#f2b9a8","#eef5cf"];
  ctx.fillStyle=palette[Math.floor(hash01(seed)*palette.length)%palette.length];
  const r=2.4;
  for(let i=0;i<5;i++){
    const a=i*Math.PI*2/5;
    ctx.beginPath();
    ctx.arc(x+Math.cos(a)*3.2,y+Math.sin(a)*3.2,r,0,Math.PI*2);
    ctx.fill();
  }
  ctx.fillStyle="#e7bd5c";
  ctx.beginPath(); ctx.arc(x,y,1.8,0,Math.PI*2); ctx.fill();
}

function drawNaturalGround(p){
  // Earth body
  const bodyH=Math.max(p.h,22);
  ctx.fillStyle="#6a5a45";
  roundedRect(p.x,p.y+4,p.w,bodyH,bodyH>30?10:8);
  ctx.fill();

  // Moss/grass cap
  const capGrad=ctx.createLinearGradient(0,p.y,0,p.y+18);
  capGrad.addColorStop(0,"#9fba72");
  capGrad.addColorStop(1,"#6f8f58");
  ctx.fillStyle=capGrad;
  roundedRect(p.x,p.y-2,p.w,17,8);
  ctx.fill();

  // Uneven soft edge
  ctx.fillStyle="#78985e";
  for(let x=p.x+7;x<p.x+p.w-6;x+=12){
    const h=4+hash01(x+p.y)*7;
    ctx.beginPath();
    ctx.ellipse(x,p.y+10,7+h*.12,h,0,0,Math.PI*2);
    ctx.fill();
  }

  // Grass blades, sparse flowers, tiny stones.
  for(let x=p.x+12;x<p.x+p.w-8;x+=24+Math.floor(hash01(x)*12)){
    const seed=x+p.y*0.37;
    drawGrassTuft(x,p.y+3,seed,.75+hash01(seed+4)*.45);
    if(hash01(seed+10)>.82) drawFlower(x+7,p.y-8,seed+20);
  }
  for(let x=p.x+35;x<p.x+p.w-20;x+=95){
    if(hash01(x+p.y)>.55){
      ctx.fillStyle="rgba(103,96,83,.45)";
      ctx.beginPath();
      ctx.ellipse(x,p.y+15,7+hash01(x)*5,3,0,0,Math.PI*2);
      ctx.fill();
    }
  }
}

function drawPlatform(p){
  if(p.t==="ground"||p.t==="grass"){
    drawNaturalGround(p);
    return;
  }
  if(p.t==="bamboo"){
    ctx.fillStyle="#5d6d58";
    roundedRect(p.x,p.y,p.w,p.h,9); ctx.fill();
    ctx.fillStyle="#839d69"; ctx.fillRect(p.x,p.y,p.w,7);
    for(let x=p.x+12;x<p.x+p.w-6;x+=28) drawGrassTuft(x,p.y+2,x+p.y,.65);
    return;
  }
  ctx.fillStyle=platformColor(p.t);
  roundedRect(p.x,p.y,p.w,p.h,p.h>30?9:10); ctx.fill();
  ctx.fillStyle="rgba(255,255,255,.15)";
  ctx.fillRect(p.x,p.y,p.w,Math.min(7,p.h));
}

function drawWorld(){
  ctx.save(); ctx.translate(-cameraX,-cameraY);


  // bamboo forest upper right
  ctx.fillStyle="rgba(33,70,58,.62)";
  for(let x=2720;x<4250;x+=88){
    ctx.fillRect(x,440,18,1080);
    for(let y=520;y<1400;y+=90){
      ctx.beginPath(); ctx.ellipse(x-15,y,26,8,-.55,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x+32,y+30,26,8,.55,0,Math.PI*2); ctx.fill();
    }
  }


  for(const p of platforms){
    drawPlatform(p);
  }

  drawDecorations();
  drawCollectibles();
  drawNPCs();
  drawAltar();
  drawPlayer();

  ctx.restore();
}

function drawDecorations(){
  const now=performance.now()*.001;

  // LEFT: osmanthus meadow — pale flowers, broad shrubs, small trees.
  for(let x=80;x<1740;x+=170){
    const seed=x*1.73;

    // Osmanthus tree every few intervals.
    if(Math.floor(x/170)%3===0){
      ctx.fillStyle="#695543";
      ctx.fillRect(x-4,1370,9,140);

      ctx.fillStyle=hash01(seed)>.5?"#66845f":"#73906a";
      const cy=1357-(hash01(seed+2)*22);
      for(const [dx,dy,r] of [[-25,3,31],[5,-13,37],[34,5,30],[6,18,34]]){
        ctx.beginPath(); ctx.arc(x+dx,cy+dy,r,0,Math.PI*2); ctx.fill();
      }

      // Golden osmanthus dots.
      ctx.fillStyle="rgba(244,211,114,.85)";
      for(let k=0;k<17;k++){
        const a=hash01(seed+k*9)*Math.PI*2;
        const rr=10+hash01(seed+k*13)*45;
        ctx.beginPath();
        ctx.arc(x+Math.cos(a)*rr,cy+Math.sin(a)*rr*.55,1.7,0,Math.PI*2);
        ctx.fill();
      }
    }

    // Meadow shrubs.
    if(hash01(seed+11)>.25){
      const w=25+hash01(seed+12)*24;
      const h=15+hash01(seed+13)*14;
      ctx.fillStyle=hash01(seed+14)>.5?"#718e64":"#7d9b6d";
      ctx.beginPath();
      ctx.ellipse(x+65,1502,w,h,0,Math.PI,Math.PI*2);
      ctx.fill();
    }
  }

  // LEFT: floating petals / fireflies.
  ctx.fillStyle="rgba(255,226,151,.72)";
  for(let i=0;i<24;i++){
    const baseX=70+(i*149)%1650;
    const baseY=760+((i*91)%610);
    const fx=baseX+Math.sin(now*1.1+i)*11;
    const fy=baseY+Math.cos(now*.8+i*.6)*7;
    ctx.beginPath(); ctx.arc(fx,fy,1.5,0,Math.PI*2); ctx.fill();
  }

  // CENTER: a subtle stone clearing, no text sign.
  ctx.fillStyle="rgba(133,126,112,.42)";
  for(let x=1810;x<2520;x+=68){
    ctx.beginPath();
    ctx.ellipse(x,1502,23,6,0,0,Math.PI*2);
    ctx.fill();
  }

  // RIGHT: mooncake street lanterns.
  for(let x=2700;x<=4200;x+=170){
    const bob=Math.sin(now*1.4+x)*2;
    ctx.strokeStyle="rgba(255,224,172,.30)";
    ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(x,1175); ctx.lineTo(x,1252+bob); ctx.stroke();

    const glow=ctx.createRadialGradient(x,1265+bob,1,x,1265+bob,34);
    glow.addColorStop(0,"rgba(255,194,104,.28)");
    glow.addColorStop(1,"rgba(255,194,104,0)");
    ctx.fillStyle=glow;
    ctx.beginPath(); ctx.arc(x,1265+bob,34,0,Math.PI*2); ctx.fill();

    ctx.fillStyle="#e78668";
    ctx.beginPath(); ctx.ellipse(x,1265+bob,16,22,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#ffd698";
    ctx.fillRect(x-2,1287+bob,4,12);
  }

  // RIGHT: stone path and bamboo undergrowth.
  for(let x=2660;x<4300;x+=76){
    const seed=x*2.17;
    ctx.fillStyle=hash01(seed)>.5?"rgba(118,111,101,.52)":"rgba(139,126,110,.46)";
    ctx.beginPath();
    ctx.ellipse(x,1501,22+hash01(seed+2)*10,5+hash01(seed+3)*3,0,0,Math.PI*2);
    ctx.fill();

    if(hash01(seed+8)>.58){
      ctx.fillStyle="#536c58";
      ctx.beginPath();
      ctx.ellipse(x+32,1496,18,11,0,Math.PI,Math.PI*2);
      ctx.fill();
    }
  }

  // RIGHT: foreground bamboo clumps.
  ctx.strokeStyle="rgba(57,88,65,.78)";
  for(let x=2760;x<4280;x+=260){
    for(let k=0;k<3;k++){
      const bx=x+k*17;
      ctx.lineWidth=5;
      ctx.beginPath(); ctx.moveTo(bx,1508); ctx.lineTo(bx+8,1335-k*35); ctx.stroke();

      ctx.lineWidth=2;
      for(let y=1380;y<1490;y+=42){
        ctx.beginPath();
        ctx.moveTo(bx+4,y);
        ctx.quadraticCurveTo(bx+25,y-6,bx+38,y-20);
        ctx.stroke();
      }
    }
  }
}
function nearCamera(x,y,margin=220){
  return x>cameraX-margin && x<cameraX+canvas.width+margin &&
         y>cameraY-margin && y<cameraY+canvas.height+margin;
}

function drawCollectibles(){
  for(const f of fragments){
    if(f.collected||!nearCamera(f.x,f.y,240))continue;
    ctx.save(); ctx.translate(f.x,f.y); ctx.rotate(performance.now()*.001);
    ctx.fillStyle="#fff2a6"; ctx.shadowColor="#fff0a0"; ctx.shadowBlur=18;
    ctx.beginPath();
    for(let i=0;i<10;i++){
      const a=i*Math.PI/5-Math.PI/2, rr=i%2?7:15;
      const x=Math.cos(a)*rr,y=Math.sin(a)*rr;
      i?ctx.lineTo(x,y):ctx.moveTo(x,y);
    }
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
  for(const m of mooncakes){
    if(m.collected||!nearCamera(m.x,m.y,210))continue;
    ctx.save(); ctx.translate(m.x,m.y);
    ctx.fillStyle="#d99a50"; ctx.beginPath(); ctx.arc(0,0,14,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle="#f5ce84"; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(0,0,9,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-7,0); ctx.lineTo(7,0); ctx.moveTo(0,-7); ctx.lineTo(0,7); ctx.stroke();
    ctx.restore();
  }
}

function drawSprite(img,x,y,w,h,facing=1,bob=0){
  ctx.save();
  ctx.translate(x,y+bob);
  ctx.scale(facing,1);
  ctx.drawImage(img,-w/2,-h/2,w,h);
  ctx.restore();
}

function drawNPCs(){
  for(const n of npcData){
    const bob=Math.sin(performance.now()*.003+n.x)*2;
    const dims=n.id==="usagi"?{w:66,h:94}:{w:78,h:82};
    drawSprite(sprites[n.sprite],n.x,n.y,dims.w,dims.h,1,bob);
  }
}

function drawPlayer(){
  const moving=Math.abs(player.vx)>25;
  const t=performance.now()*.012;
  const bob=moving?Math.abs(Math.sin(t))*4:Math.sin(t*.45)*1.6;
  const tilt=moving?Math.sin(t)*.025:0;
  ctx.save();
  ctx.translate(player.x+player.w/2,player.y+player.h/2+bob);
  ctx.rotate(tilt*player.facing);
  ctx.scale(player.facing,1);
  ctx.drawImage(sprites.chiikawa,-39,-42,78,84);
  ctx.restore();
}

function drawAltar(){
  ctx.save(); ctx.translate(altar.x,altar.y);
  ctx.fillStyle="#81788f"; roundedRect(0,32,altar.w,43,10); ctx.fill();
  ctx.fillStyle="#bdb3ca"; roundedRect(12,8,altar.w-24,34,8); ctx.fill();
  ctx.fillStyle="#ffe9a6"; ctx.beginPath(); ctx.arc(altar.w/2,2,20,0,Math.PI*2); ctx.fill(); ctx.restore();
}

function drawHUD(){
  ctx.save();

  ctx.fillStyle="rgba(15,18,31,.54)";
  roundedRect(16,16,152,70,18);
  ctx.fill();

  ctx.fillStyle="#fff4ce";
  ctx.font="800 19px ui-rounded, sans-serif";
  ctx.fillText(`⭐ ${player.fragments}/5`,31,45);
  ctx.fillText(`🥮 ${player.mooncakes}/23`,31,72);

  // Wordless glow near interactable objects.
  if(gameState==="playing"&&!dialogue){
    const target=nearestInteractive();
    if(target){
      ctx.strokeStyle="rgba(255,240,174,.72)";
      ctx.lineWidth=3;
      ctx.beginPath();
      ctx.arc(canvas.width/2,canvas.height-34,8+Math.sin(performance.now()*.005)*2,0,Math.PI*2);
      ctx.stroke();
    }
  }
  ctx.restore();
}
function render(){ drawBackground(); drawWorld(); drawHUD(); }

function frame(now){
  const dt=Math.min(.033,(now-lastTime)/1000);
  lastTime=now; update(dt); render(); requestAnimationFrame(frame);
}

let audioCtx=null;
function ensureAudio(){
  if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();
  if(audioCtx.state==="suspended")audioCtx.resume();
}
function playTone(freq,duration,type="sine",volume=.02){
  if(muted)return;
  ensureAudio();
  const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
  osc.type=type; osc.frequency.value=freq; gain.gain.value=volume;
  osc.connect(gain); gain.connect(audioCtx.destination); osc.start();
  gain.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+duration);
  osc.stop(audioCtx.currentTime+duration);
}
function playArpeggio(){
  if(muted)return;
  [523,659,784,1046].forEach((f,i)=>setTimeout(()=>playTone(f,.18,"sine",.024),i*110));
}

function mapKey(code,down,repeat=false){
  if(["ArrowLeft","KeyA"].includes(code))keys.left=down;
  if(["ArrowRight","KeyD"].includes(code))keys.right=down;
  if(["Space","ArrowUp","KeyW"].includes(code))keys.jump=down;
  if(["KeyE","Enter"].includes(code)&&down&&!repeat)keys.interact=true;
}

window.addEventListener("keydown",e=>{
  if(["ArrowLeft","ArrowRight","ArrowUp","Space"].includes(e.code))e.preventDefault();
  mapKey(e.code,true);
});
window.addEventListener("keyup",e=>mapKey(e.code,false,false));

function bindHoldButton(id,keyName){
  const el=document.getElementById(id);
  const down=e=>{e.preventDefault();keys[keyName]=true;ensureAudio();};
  const up=e=>{e.preventDefault();keys[keyName]=false;};
  ["pointerdown","touchstart"].forEach(evt=>el.addEventListener(evt,down,{passive:false}));
  ["pointerup","pointercancel","pointerleave","touchend"].forEach(evt=>el.addEventListener(evt,up,{passive:false}));
}
bindHoldButton("leftBtn","left");
bindHoldButton("rightBtn","right");
bindHoldButton("jumpBtn","jump");
document.getElementById("interactBtn").addEventListener("pointerdown",e=>{e.preventDefault();keys.interact=true;ensureAudio();});

document.getElementById("restartBtn").addEventListener("click",()=>{
  resetGame();
  endingOverlay.classList.remove("visible");
});

resetGame();
render();
requestAnimationFrame(frame);
})();