import {createVisual} from './visual.js';
import {createAlhambra} from './alhambra.js';

const root = document.querySelector('.installation');
const art = document.querySelector('#artwork');
const renderAlhambra = createAlhambra(document.querySelector('#alhambra'));
const story = document.querySelector('#story');
const start = document.querySelector('#start');
const replay = document.querySelector('#replay');
const sound = document.querySelector('.sound');
const soundLabel = document.querySelector('#sound-label');
const progress = document.querySelector('#progress');
const artLabel = document.querySelector('#art-label');
const footerTitle = document.querySelector('#footer-title');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const chapters = ['EL COMIENZO','LA HISTORIA','LA FLORACIÓN','GRATITUD','EL FINAL'];
const lines = [
  {time:1,scene:1,text:'A veces, las cosas más bonitas de la vida llegan sin que las estemos buscando.'},
  {time:7,scene:1,text:'Y de repente, alguien consigue hacer que los días sean un poquito más especiales.'},
  {time:13,scene:1,text:'Hay personas que iluminan incluso los momentos más normales.'},
  {time:19,scene:1,text:'Y que, sin darse cuenta, se convierten en una parte muy bonita de nuestra historia.'},
  {time:26,scene:2},
  {time:43,scene:3,text:'Y si tuviera que elegir una sola cosa para agradecer...'},
  {time:49,scene:3,text:'...sería todo lo bonito que has traído a mi vida.'},
  {time:54,scene:3,text:'Gracias por todo.',emphasis:true},
  {time:59,scene:4},
  {time:71,scene:4,final:true}
];
let playing = false;
let elapsed = -1;
let seconds = 0;
let oldFrame;
let renderedAt = -1;
let lineIndex = -1;
let fragments = 0;
let quality = false;
let frameAverage = 16.7;

function chapter(index){
  root.dataset.scene=index;
  progress.setAttribute('aria-valuenow',index);
  Array.from(progress.children).forEach((bar,i)=>{
    bar.classList.toggle('complete',i<index);
    bar.classList.toggle('current',i===index);
  });
  footerTitle.textContent=chapters[index];
  artLabel.textContent=['ALHAMBRA · GRANADA','POLVO DE ESTRELLAS','HELIANTHUS ANNUUS','HELIANTHUS ANNUUS','CORAZÓN'][index];
}
function show(line){
  chapter(line.scene);
  story.replaceChildren();
  if(!line.text&&!line.final)return;
  const article=document.createElement('article');
  const tag=document.createElement('div');
  tag.className='eyebrow';
  tag.textContent=chapters[line.scene];
  const p=document.createElement('p');
  if(line.final)p.className='dedication';
  if(line.emphasis){
    const italic=document.createElement('em');
    italic.textContent=line.text;
    p.append(italic);
  }else if(line.text)p.textContent=line.text;
  article.append(tag,p);
  story.append(article);
}
const finalWords=['Te quiero','por siempre,','mi Annys'];
function addGoldDust(word, last){
  if(motion.matches)return;
  const dust=document.createElement('span');
  dust.className='gold-dust';
  dust.setAttribute('aria-hidden','true');
  const count=art.clientWidth<550?(last?32:19):(last?56:32);
  for(let i=0;i<count;i++){
    const spark=document.createElement('i');
    const angle=i*2.39996323;
    const distance=(last?2.55:1.55)*(.36+(i%13)/13);
    spark.style.setProperty('--x',`${(i*37)%98}%`);
    spark.style.setProperty('--y',`${12+(i*19)%65}%`);
    spark.style.setProperty('--dx',`${Math.cos(angle)*distance}em`);
    spark.style.setProperty('--dy',`${Math.sin(angle)*distance*.52}em`);
    spark.style.setProperty('--delay',`${(i*53)%340}ms`);
    spark.style.setProperty('--size',`${1+(i%6)*.32}px`);
    dust.append(spark);
  }
  word.append(dust);
}
function revealFinal(count){
  const p=story.querySelector('.dedication');
  if(!p)return;
  while(fragments<count){
    const last=fragments===2;
    const word=document.createElement(last?'em':'span');
    word.className=last?'reveal reveal-name':'reveal';
    const letters=document.createElement('span');
    letters.className='reveal-letters';
    letters.textContent=finalWords[fragments];
    word.append(letters);
    addGoldDust(word,last);
    if(fragments>0)p.append(document.createTextNode(' '));
    p.append(word);
    fragments++;
    chime(last?'final':'line');
  }
  replay.hidden=fragments<3;
}

let audio,master,musicTimer,beat=0;
const tunes=[[196,293.66,369.99,440],[164.81,246.94,293.66,392],[146.83,220,293.66,369.99],[130.81,196,261.63,329.63]];
function note(freq, when, length, level, type='sine'){
  const oscillator=audio.createOscillator(), envelope=audio.createGain();
  oscillator.type=type;
  oscillator.frequency.value=freq;
  envelope.gain.setValueAtTime(.0001,when);
  envelope.gain.exponentialRampToValueAtTime(level,when+.095);
  envelope.gain.exponentialRampToValueAtTime(.0001,when+length);
  oscillator.connect(envelope).connect(master);
  oscillator.start(when);
  oscillator.stop(when+length+.025);
}
function music(){
  if(document.hidden||audio?.state!=='running'||sound.getAttribute('aria-pressed')!=='true')return;
  const chord=tunes[beat++%tunes.length];
  const now=audio.currentTime+.03;
  note(chord[0]/2,now,4.2,.11);
  chord.slice(1).forEach((frequency,index)=>note(frequency,now+index*.23,3.6,.15));
}
function chime(kind){
  if(!audio||!playing||sound.getAttribute('aria-pressed')!=='true')return;
  const now=audio.currentTime+.015;
  if(kind==='final')note(98,now,2.8,.15);
  const tones=kind==='final'?[392,587.33,783.99,987.77]:kind==='bloom'?[329.63,493.88,659.25]:[587.33,783.99];
  tones.forEach((frequency,index)=>note(frequency,now+index*.13,1.45,.042));
}
const AudioEngine=window.AudioContext||window.webkitAudioContext;
sound.hidden=!AudioEngine;
sound.addEventListener('click',async()=>{
  const enabled=sound.getAttribute('aria-pressed')!=='true';
  if(enabled){
    try{
      if(!audio){
        audio=new AudioEngine();
        master=audio.createGain();
        master.gain.value=0;
        master.connect(audio.destination);
      }
      await audio.resume();
    }catch{
      sound.hidden=true;
      return;
    }
  }
  sound.setAttribute('aria-pressed',enabled);
  sound.setAttribute('aria-label',enabled?'Desactivar sonido':'Activar sonido');
  soundLabel.textContent=enabled?'SONIDO ACTIVADO':'SONIDO DESACTIVADO';
  master.gain.setTargetAtTime(enabled?.78:0,audio.currentTime,.12);
  clearInterval(musicTimer);
  if(enabled){
    music();
    musicTimer=setInterval(music,4250);
  }
});
function begin(){
  elapsed=0;
  playing=true;
  lineIndex=-1;
  fragments=0;
  replay.hidden=true;
  chapter(1);
  story.replaceChildren();
  story.tabIndex=-1;
  story.focus({preventScroll:true});
  if(audio?.state==='suspended')audio.resume().then(music).catch(()=>{});
}
start.addEventListener('click',begin);
replay.addEventListener('click',()=>{
  elapsed=-1;playing=false;lineIndex=-1;fragments=0;
  replay.hidden=true;
  story.replaceChildren();
  chapter(0);
  start.focus({preventScroll:true});
});
document.addEventListener('visibilitychange',()=>{
  oldFrame=undefined;
  if(master)master.gain.setTargetAtTime(!document.hidden&&sound.getAttribute('aria-pressed')==='true'?.78:0,audio.currentTime,.12);
});
chapter(0);
const render = await createVisual(art);
start.disabled=false;
function frame(now){
  const delta = oldFrame === undefined ? 0 : Math.min(.1,(now-oldFrame)/1000);
  oldFrame=now;
  if(!document.hidden){
    seconds+=delta;
    if(playing)elapsed+=delta;
    if(delta>0)frameAverage=frameAverage*.975+delta*1000*.025;
    quality=art.clientWidth<550||(quality?frameAverage>18:frameAverage>24);
    const line=lines[lineIndex+1];
    if(playing&&line&&elapsed>=line.time){
      lineIndex++;
      show(line);
      if(!line.final)chime(line.scene===2?'bloom':'line');
    }
    const upcoming=lines[lineIndex+1];
    if(lineIndex>=0&&upcoming&&elapsed>upcoming.time-.8)story.firstElementChild?.classList.add('leaving');
    if(elapsed>=71)revealFinal(elapsed>=77.25?3:elapsed>=74?2:1);
    if(seconds-renderedAt>(motion.matches?.09:quality?.028:.015)){
      render(seconds,elapsed,motion.matches,quality);
      if(elapsed<0)renderAlhambra(seconds,motion.matches);
      renderedAt=seconds;
    }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
