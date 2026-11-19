const TAU = Math.PI * 2;
const GOLD = 0xffc565;
const RAMP = ".:,-~+*ox%#&@";
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a,b,t) => a + (b-a)*t;
const rgb = (r,g,b) => (r << 16) | (g << 8) | b;
function random(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
const rnd = random(9061);
const petals = Array.from({length: 64}, (_, i) => {
  const inner = i >= 37;
  const n = inner ? 27 : 37;
  return {
    angle: (i % 37) * TAU / n + (inner ? .115 : 0) + (rnd() - .5) * .085,
    length: (inner ? 1.45 : 1.75) + rnd() * (inner ? .22 : .39),
    width: .14 + rnd() * .19,
    bend: (rnd() - .45) * .6,
    delay: rnd(),
    inner,
    color: rgb(inner ? 255 : 232 + Math.floor(rnd()*23), (inner ? 152 : 113) + Math.floor(rnd()*70), 19 + Math.floor(rnd()*49))
  };
});
const seeds = Array.from({length: 742}, (_, i) => {
  const a = i * 2.39996323;
  const r = Math.sqrt(i/742);
  return [Math.cos(a)*r, Math.sin(a)*r, rnd(), rnd()];
});
const sky = Array.from({length: 1450}, () => [rnd(),rnd(),rnd(),rnd(),rnd()]);
const heartCurve = Array.from({length: 140}, (_, i) => {
  const a = i / 140 * TAU;
  return [Math.sin(a)**3, -(13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a)+2)/16];
});
function insideHeart(x,y) {
  let inside = false;
  let previous = heartCurve.at(-1);
  for (const point of heartCurve) {
    const [ax,ay] = previous, [bx,by] = point;
    if ((ay > y) !== (by > y) && x < ax + (bx-ax)*(y-ay)/(by-ay)) inside = !inside;
    previous = point;
  }
  return inside;
}
const sparks = [];
for(let i=0; i<3900; i++){
  const x = (rnd()-.5)*2, y = (rnd()-.5)*2.1;
  if(!insideHeart(x,y)) continue;
  sparks.push([x,y,(rnd()-.5)*3.5,(rnd()-.5)*3.5,rnd(),rnd()]);
}

function ellipse(g,x,y,rx,ry,color,alpha=1){
  g.ellipse(x,y,rx,ry).fill({color,alpha});
}
function path(g, start, curves, color, alpha=1) {
  g.moveTo(...start);
  for(const curve of curves) g.bezierCurveTo(...curve);
  g.closePath().fill({color,alpha});
}
function stalk(g, x, y, s, growth, sway, alpha) {
  if(growth <= 0) return;
  const bottom = y+2.31*s;
  const top = bottom - 2.38*s*growth;
  const endX = x + sway*s*growth;
  const baseX = x-.19*s;
  g.moveTo(baseX,bottom).bezierCurveTo(x+.46*s,bottom-.92*s*growth,x-.34*s,top+.8*s*growth,endX,top)
    .stroke({width:s*.13,color:0x65813c,alpha,cap:"round"});
  g.moveTo(baseX-.046*s,bottom).bezierCurveTo(x+.415*s,bottom-.92*s*growth,x-.385*s,top+.8*s*growth,endX-.035*s,top)
    .stroke({width:s*.036,color:0xc0b566,alpha:alpha*.85,cap:"round"});
  for(let i=0; i<6; i++){
    const k = i-2.5;
    g.moveTo(baseX,bottom-.04*s).bezierCurveTo(baseX+k*.05*s,bottom+.12*s,baseX+k*.12*s,bottom+.17*s,baseX+k*.21*s,bottom+(.17+Math.abs(k)*.047)*s)
      .stroke({width:s*.012,color:0xb48c4f,alpha:alpha*.5,cap:"round"});
  }
}
function leaf(g,x,y,s,sign,angle,alpha,shade){
  if(s<.01) return;
  const anchor = (a,b) => {
    const u = a*sign;
    return [x+s*(u*Math.cos(angle)-b*Math.sin(angle)),y+s*(u*Math.sin(angle)+b*Math.cos(angle))];
  };
  const bezier = (...v) => [...anchor(v[0],v[1]),...anchor(v[2],v[3]),...anchor(v[4],v[5])];
  path(g, anchor(0,0), [
    bezier(.27,-.18,.24,-.89,1.57,-.79),
    bezier(1.46,-.65,1.4,-.43,1.26,-.38),
    bezier(1.21,-.34,1.27,-.26,1.12,-.28),
    bezier(.86,.07,.35,.23,0,0)
  ],shade,alpha);
  path(g,anchor(0,0),[
    bezier(.25,-.17,.29,-.82,1.57,-.79),
    bezier(1.13,-.67,.52,-.1,0,0)
  ],0x9ca84c,alpha*.71);
  g.moveTo(...anchor(0,0)).bezierCurveTo(...bezier(.53,-.07,1.15,-.65,1.57,-.79))
    .stroke({width:s*.021,color:0xe6c875,alpha:alpha*.76});
  for(let i=1;i<=5;i++){
    const a=i*.23, b=-.48*a;
    for(const side of [-1,1]){
      g.moveTo(...anchor(a,b)).quadraticCurveTo(...anchor(a+.05,b+side*.19),...anchor(a+.25,b+side*(.23-i*.019)))
        .stroke({width:s*.013,color:0xdfc16c,alpha:alpha*.56});
    }
  }
}
function blossom(g, x, y, s, t, stage, alpha){
  if(stage <= 0 || alpha <= 0) return;
  for(const p of petals){
    const open = smooth(stage*1.75-p.delay*.72-(p.inner?.05:0));
    if(open<.005) continue;
    const breeze=Math.sin(t*1.05-p.angle*1.8)+.35*Math.sin(t*2.37+p.delay*4);
    const a=p.angle+t*.057+breeze*(p.inner?.026:.048)+(1-open)*.23;
    const facing=.5+.5*Math.cos(a+1.95+breeze*.23);
    const shade=lerpColor(p.color,0x91432b,(1-facing)*(p.inner?.19:.32));
    const len = lerp(.74,p.length,open)*(1+breeze*.036);
    const w = p.width*lerp(.26,1,open);
    const bend = p.bend+breeze*.115;
    const point = (u,v) => [x+s*(u*Math.cos(a)-v*Math.sin(a)), y+s*(.89+.035*Math.sin(t*.51))*(u*Math.sin(a)+v*Math.cos(a))];
    const bezier = (...v) => [...point(v[0],v[1]),...point(v[2],v[3]),...point(v[4],v[5])];
    path(g,point(.45,0),[
      bezier(.85,-w*.97,len*.8,-w+bend*.58,len,bend),
      bezier(len*.87,w*.76+bend*.8,len*.66,w*1.18,.45,0)
    ],shade,open*alpha);
    path(g,point(.56,.016),[
      bezier(.89,.02,len*.85,bend*.75,len,bend),
      bezier(len*.94,bend*.74,len*.58,w*.65,.56,.016)
    ],p.inner?0xffef8c:0xffdb78,open*alpha*(.34+facing*.46));
    g.moveTo(...point(.67,0)).bezierCurveTo(...bezier(.99,-w*.33,len*.83,bend*.64,len*.97,bend*.92))
      .stroke({width:s*.014,color:0xffefad,alpha:open*alpha*(.21+facing*.46)});
  }
  const core = s*(.16+.59*smooth(stage*2));
  ellipse(g,x,y,core*1.04,core*.99,0xcb8c43,alpha);
  ellipse(g,x,y,core*.96,core*.91,0x774123,alpha);
  for(const [u,v,k,l] of seeds){
    const rx=u*Math.cos(t*.057)-v*Math.sin(t*.057), ry=u*Math.sin(t*.057)+v*Math.cos(t*.057);
    const r=clamp(.2+Math.hypot(u,v)*.7+k*.24);
    ellipse(g,x+core*rx,y+core*.94*ry,core*(.024+l*.022),core*(.016+k*.017),rgb(113+Math.floor(111*r),56+Math.floor(95*r),25+Math.floor(50*r)),alpha);
  }
}
function draw(skyLayer, ink, w, h, t, elapsed, reduced, quality) {
  skyLayer.clear();
  ink.clear();
  const clock = reduced ? 0 : t;
  const finale = elapsed >= 59;
  const pulse = Math.exp(-((elapsed-77.25)**2)/.42);
  const x = w*.505;
  const s = Math.min(w*.217,h*.195);
  const y = h*.425;
  const drift = Math.sin(clock*.63)*.1;
  const n = quality ? 430 : sky.length;
  const warmth = smooth((elapsed-34)/12);
  ellipse(skyLayer,x,y,s*2.24,s*1.87,0x8b5747,.045+warmth*.045);
  for(let i=0;i<n;i++){
    const [u,v,a,b,c] = sky[i];
    const px = ((u+clock*(c-.5)*.005)%1+1)%1*w;
    const py = ((v-clock*(.003+a*.003))%1+1)%1*h;
    const twinkle = .65+.35*Math.sin(clock*(.6+b)+i);
    const size = a>.955 ? 1.15+b*.9 : .26+b*.57;
    if(a>.98){
      ellipse(skyLayer,px,py,size*3,size*3,0xf9b473,.043*twinkle);
      skyLayer.moveTo(px-size*2.6,py).lineTo(px+size*2.6,py).moveTo(px,py-size*2.6).lineTo(px,py+size*2.6)
        .stroke({width:.5,color:0xffdea3,alpha:.47*twinkle});
    }
    ellipse(skyLayer,px,py,size,size,a>.92?0xffd991:(b>.6?0xbdb3d8:0xf0ba83),(.15+c*.55)*twinkle);
  }
  const fade = 1-smooth((elapsed-59)/3);
  const build = smooth((elapsed-29)/12);
  if (fade>0 && elapsed>25){
    const growth = smooth((elapsed-28)/7);
    const open = smooth((elapsed-33)/9);
    const naturalX=x+drift*s;
    if(build<.45){
      const seedY=y+2.28*s;
      const blink=.76+Math.sin(clock*3.3)*.24;
      ellipse(skyLayer,x,seedY,s*.34,s*.34,GOLD,(1-build)*.08*blink);
      ellipse(ink,x,seedY,s*.071,s*.043,GOLD,(1-build)*blink);
    }
    stalk(ink,x,y,s,growth,drift,fade);
    leaf(ink,x+s*.05,y+1.54*s,s*.84*smooth((elapsed-30.5)/5),1,Math.sin(clock*.79)*.16-.15,fade,0x647b39);
    leaf(ink,x+s*.08,y+1.99*s,s*.82*smooth((elapsed-32)/5),-1,Math.sin(clock*.9+1)*.13+.16,fade,0x597238);
    const halo=open*fade*(.065+warmth*.06);
    for(let band=4;band>=1;band--){
      const radius=s*(.92+band*.39);
      ellipse(skyLayer,naturalX-s*.15,y-s*.12,radius,radius*.88,0xef9c38,halo*.24);
    }
    blossom(ink,naturalX,y,s,clock,open,fade);
  }
  if(finale){
    const hs=Math.min(w*.416,h*.414)*(1+pulse*.079+Math.sin(clock*1.3)*.012);
    const hy=h*.451;
    const launch=clamp((elapsed-59.35)/2.8);
    const burst=1-(1-launch)**3;
    const end=clamp((elapsed-63)/7.2);
    const body=smooth((end-.77)/.23);
    for(let layer=0;layer<6;layer++){
      const k=1-layer*.135;
      const first=heartCurve[0];
      ink.moveTo(x+first[0]*hs*k,hy+first[1]*hs*k);
      for(const [u,v] of heartCurve) ink.lineTo(x+u*hs*k,hy+v*hs*k);
      ink.closePath().fill({color:[0xae474d,0xc75857,0xdd735d,0xea8b67,0xf29a71,0xffac79][layer],alpha:body*.93});
    }
    const step=quality?2:1;
    for(let i=0;i<sparks.length;i+=step){
      const [u,v,sx,sy,k,l]=sparks[i];
      const gather=smooth((end-k*.24)/.76);
      const turn=reduced?0:(.16+k*.3)*burst+(1-gather)*Math.sin(clock*.51+k*9)*.12;
      const cloudX=(sx*Math.cos(turn)-sy*Math.sin(turn))*burst*.75;
      const cloudY=(sx*Math.sin(turn)+sy*Math.cos(turn))*burst*.75;
      const fx=x+hs*lerp(cloudX,u,gather);
      const fy=hy+hs*lerp(cloudY,v,gather);
      const radius=lerp(1.2+k*1.8,1.1+l*2.8,gather)*(1+pulse*.6);
      ellipse(ink,fx,fy,radius,radius,lerpColor(0xfcca6f,0xff806b,k),burst*(.45+l*.53));
      if(i%20===0 && gather<.96 && burst>.06){
        ellipse(skyLayer,fx,fy,radius*1.65,radius*1.65,0xffcc86,burst*(1-gather)*.33);
      }
    }
    const flash=Math.exp(-((elapsed-59.65)**2)*7);
    if(pulse>.02 && !reduced){
      const travel=clamp((elapsed-77.05)/1.22);
      for(let i=0;i<(quality?30:56);i++){
        const angle=i*2.39996323;
        const radius=hs*(.56+travel*1.07+(i%7)*.029);
        const px=x+Math.cos(angle)*radius, py=hy+Math.sin(angle)*radius*.78;
        ellipse(skyLayer,px,py,1.9,1.35,0xffdc9d,pulse*.68);
      }
    }
    ellipse(skyLayer,x,hy,hs*(.61+pulse),hs*(.46+pulse),0xffae6b,flash*.17+pulse*.13);
    const keepsake=smooth((elapsed-72)/5)*.66;
    if(keepsake>0){
      const small=Math.min(w,h)*.036;
      const bx=w*.848+drift*small, by=h*.77;
      stalk(ink,bx,by,small,1,drift,keepsake);
      leaf(ink,bx,by+small*1.6,small*.7,1,-.1,keepsake,0x647b39);
      blossom(ink,bx,by,small,clock,1,keepsake);
    }
    if(flash>.01){
      ellipse(skyLayer,x,hy,hs*.92,flash*hs*.014,0xffd380,flash*.5);
      ellipse(ink,x,hy,hs*.09,hs*.082,0xffeed2,flash);
    }
  }
}
function lerpColor(a,b,t){
  return rgb(lerp(a>>16,b>>16,t)|0,lerp((a>>8)&255,(b>>8)&255,t)|0,lerp(a&255,b&255,t)|0);
}

const vertex = `
in vec2 aPosition;
out vec2 vTextureCoord;
uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;
void main(){
  vec2 p = aPosition*uOutputFrame.zw+uOutputFrame.xy;
  p.x = p.x*(2.0/uOutputTexture.x)-1.0;
  p.y = p.y*(2.0*uOutputTexture.z/uOutputTexture.y)-uOutputTexture.z;
  gl_Position=vec4(p,0.0,1.0);
  vTextureCoord=aPosition*(uOutputFrame.zw*uInputSize.zw);
}`;
const fragment = `
precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform sampler2D uGlyphs;
uniform vec4 uInputSize;
uniform vec4 uInputClamp;
uniform vec2 uCell;
void main(){
  vec2 p=vTextureCoord*uInputSize.xy/uCell;
  vec2 center=(floor(p)+.5)*uCell*uInputSize.zw;
  vec2 d=uCell*uInputSize.zw*.22;
  vec4 c=texture(uTexture,clamp(center,uInputClamp.xy,uInputClamp.zw))*.5;
  c+=texture(uTexture,clamp(center-d,uInputClamp.xy,uInputClamp.zw))*.25;
  c+=texture(uTexture,clamp(center+d,uInputClamp.xy,uInputClamp.zw))*.25;
  vec3 rgb=c.rgb/max(c.a,.001);
  float lum=dot(c.rgb,vec3(.2126,.7152,.0722));
  float sat=max(rgb.r,max(rgb.g,rgb.b))-min(rgb.r,min(rgb.g,rgb.b));
  float noise=fract(sin(dot(floor(p),vec2(12.9898,78.233)))*43758.5453);
  float glyph=floor(clamp(pow(lum,.79)*.86+sat*.18+noise*.13,0.,.999)*${RAMP.length}.0);
  vec2 q=fract(p);
  float mask=texture(uGlyphs,vec2((glyph+q.x)/${RAMP.length}.0,q.y)).a;
  float coverage=smoothstep(.018,.38,c.a);
  float a=max(mask*coverage,.025*c.a);
  vec3 tint=mix(rgb,vec3(1.,.88,.71),.075);
  finalColor=vec4(tint*a,a);
}`;
function glyphCanvas() {
  const atlas = document.createElement('canvas');
  atlas.width=24*RAMP.length;
  atlas.height=36;
  const ctx=atlas.getContext('2d');
  ctx.font='bold 36px monospace';
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.fillStyle='white';
  [...RAMP].forEach((token,i)=>ctx.fillText(token,i*24+12,19));
  return atlas;
}
function cellWidth(w, quality, fallback=false){
  return Math.max(fallback?4:quality?3.65:3,Math.min(6,w/(quality?116:190)));
}
async function gpu(host) {
  const {Application, Graphics, Filter, GlProgram, Texture, Rectangle} = await import('./assets/pixi.min.mjs');
  const app = new Application();
  await app.init({preference:'webgl',width:1,height:1,backgroundAlpha:0, antialias:false,resolution:Math.min(devicePixelRatio,2),autoDensity:true,autoStart:false, powerPreference:'low-power'});
  try {
    const skyLayer = new Graphics(), ink = new Graphics();
    const atlas = Texture.from(glyphCanvas());
    const cell = new Float32Array([4,6]);
    ink.filters=[new Filter({
      glProgram:GlProgram.from({vertex,fragment,name:'colored-ascii'}),
      resources:{uGlyphs:atlas.source,asciiUniforms:{uCell:{value:cell,type:'vec2<f32>'}}},
      antialias:'off'
    })];
    const area=new Rectangle(0,0,1,1);
    ink.filterArea=area;
    app.stage.addChild(skyLayer,ink);
    host.replaceChildren(app.canvas);
    let width=0,height=0,resolution=0;
    const render=(t,e,r,q)=>{
      const w=host.clientWidth,h=host.clientHeight;
      if(!w||!h)return;
      const targetResolution=Math.min(devicePixelRatio,q?1.25:1.75);
      if(w!==width||h!==height||targetResolution!==resolution){
        resolution=targetResolution;
        app.renderer.resize(w,h,resolution);
        area.width=width=w;area.height=height=h;
      }
      cell[0]=cellWidth(w,q);cell[1]=cell[0]*1.48;
      draw(skyLayer,ink,w,h,t,e,r,q);
      app.render();
    };
    render(0,-1,false,false);
    return render;
  } catch(error) {
    app.destroy(true);
    throw error;
  }
}

function canvasLayer(ctx) {
  let pending = false;
  function begin() { if(!pending){ctx.beginPath(); pending=true;} }
  function paint({color,alpha},stroke=false){
    const css='#'+color.toString(16).padStart(6,'0');
    ctx.globalAlpha=alpha;
    if(stroke){ctx.strokeStyle=css;ctx.stroke();}else{ctx.fillStyle=css;ctx.fill();}
    ctx.globalAlpha=1;pending=false;
  }
  return {
    clear(){ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);},
    moveTo(...args){begin();ctx.moveTo(...args);return this;},
    lineTo(...args){ctx.lineTo(...args);return this;},
    quadraticCurveTo(...args){ctx.quadraticCurveTo(...args);return this;},
    bezierCurveTo(...args){ctx.bezierCurveTo(...args);return this;},
    closePath(){ctx.closePath();return this;},
    ellipse(x,y,rx,ry){begin();ctx.moveTo(x+rx,y);ctx.ellipse(x,y,rx,ry,0,0,TAU);return this;},
    fill(style){paint(style);return this;},
    stroke(style){ctx.lineWidth=style.width;ctx.lineCap=style.cap||'butt';paint(style,true);return this;}
  };
}
function cpu(host){
  const canvas=document.createElement('canvas');
  const vector=document.createElement('canvas');
  const sample=document.createElement('canvas');
  const ctx=canvas.getContext('2d');
  const sampleCtx=sample.getContext('2d',{willReadFrequently:true});
  const skyLayer=canvasLayer(ctx),ink=canvasLayer(vector.getContext('2d'));
  host.replaceChildren(canvas);
  let previous=-1;
  return (t,e,r)=>{
    const w=host.clientWidth,h=host.clientHeight;
    if(t-previous<1/25 && canvas.width===w && canvas.height===h)return;
    previous=t;
    if(!w||!h)return;
    if(canvas.width!==w||canvas.height!==h){canvas.width=vector.width=w;canvas.height=vector.height=h;}
    const cw=cellWidth(w,true,true), ch=cw*1.5;
    const columns=Math.ceil(w/cw),rows=Math.ceil(h/ch);
    if(sample.width!==columns||sample.height!==rows){sample.width=columns;sample.height=rows;}
    draw(skyLayer,ink,w,h,t,e,r,true);
    sampleCtx.clearRect(0,0,columns,rows);
    sampleCtx.drawImage(vector,0,0,w,h,0,0,columns,rows);
    const data=sampleCtx.getImageData(0,0,columns,rows).data;
    ctx.font=`bold ${ch}px monospace`;
    ctx.textAlign='center';ctx.textBaseline='middle';
    for(let i=0;i<data.length;i+=4){
      const opacity=data[i+3]/255;
      if(opacity<.04)continue;
      const red=data[i],green=data[i+1],blue=data[i+2];
      const lum=(.2126*red+.7152*green+.0722*blue)/255*opacity;
      const sat=(Math.max(red,green,blue)-Math.min(red,green,blue))/255;
      const pick=Math.min(RAMP.length-1,Math.floor((lum**.79*.86+sat*.18+(i%97)/97*.13)*RAMP.length));
      ctx.fillStyle=`rgba(${red},${green},${blue},${smooth(opacity*2.6)})`;
      const index=i/4;
      ctx.fillText(RAMP[pick],(index%columns+.5)*cw,(Math.floor(index/columns)+.5)*ch);
    }
  };
}
export async function createVisual(host){
  let render;
  try{
    render=await gpu(host);
    host.dataset.renderer='webgl';
    host.firstElementChild.addEventListener('webglcontextlost',()=>{render=cpu(host);host.dataset.renderer='canvas';},{once:true});
  }catch(error){
    console.warn('WebGL unavailable; using Canvas ASCII rendering.',error);
    render=cpu(host);
    host.dataset.renderer='canvas';
  }
  return (...args)=>render(...args);
}
