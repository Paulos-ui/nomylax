(function(){

"use strict";
var RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------- reveal ---------------- */
var io = new IntersectionObserver(function(es){
  es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
},{threshold:.12,rootMargin:'0px 0px -8% 0px'});
document.querySelectorAll('[data-reveal]').forEach(function(el){ io.observe(el); });

/* ---------------- count up ---------------- */
function fmt(v,dec,prefix){
  var s = dec ? v.toFixed(dec) : Math.round(v).toString();
  var parts = s.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (prefix||'') + parts.join('.');
}
var cio = new IntersectionObserver(function(es){
  es.forEach(function(e){
    if(!e.isIntersecting) return;
    var el = e.target, target = parseFloat(el.dataset.count),
        dec = parseInt(el.dataset.dec||'0',10), pre = el.dataset.prefix||'';
    cio.unobserve(el);
    if(RM){ el.textContent = fmt(target,dec,pre); return; }
    var t0 = null, dur = 1500;
    function tick(t){
      if(!t0) t0 = t;
      var p = Math.min((t-t0)/dur,1), eased = 1-Math.pow(1-p,3);
      el.textContent = fmt(target*eased,dec,pre);
      if(p<1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
},{threshold:.4});
document.querySelectorAll('[data-count]').forEach(function(el){ cio.observe(el); });

/* ---------------- HERO CONTROL PLANE ---------------- */
var SVGNS='http://www.w3.org/2000/svg';
var packets = document.getElementById('packets');
var ringFlash = document.getElementById('ringFlash');
var EVENTS = [
  {node:'nR', path:'pR', agent:'Research Scout', amt:'$4.50', purpose:'Market dataset', recip:'Approved', policy:'Within limits', risk:'12 · LOW', ok:true, sub:'Settling on Base'},
  {node:'nT', path:'pT', agent:'Trading Agent', amt:'$80.00', purpose:'Position entry', recip:'Unknown', policy:'Max tx $25 exceeded', risk:'91 · CRITICAL', ok:false, sub:'$80.00 protected'},
  {node:'nO', path:'pO', agent:'Ops Agent', amt:'$12.00', purpose:'RPC subscription', recip:'Approved', policy:'Within limits', risk:'19 · LOW', ok:true, sub:'Settling on Base'},
  {node:'nY', path:'pY', agent:'Yield Agent', amt:'$140.00', purpose:'LP deposit', recip:'Unverified pool', policy:'Reserve floor breached', risk:'77 · CRITICAL', ok:false, sub:'$140.00 protected'}
];
var roLines = document.querySelectorAll('.ro-line');
var el = {
  agent:document.getElementById('roAgent'), amt:document.getElementById('roAmt'),
  purpose:document.getElementById('roPurpose'), recip:document.getElementById('roRecip'),
  policy:document.getElementById('roPolicy'), risk:document.getElementById('roRisk'),
  verdict:document.getElementById('roVerdict'), v:document.getElementById('roV'), vsub:document.getElementById('roVSub')
};

function makePacket(color){
  var g = document.createElementNS(SVGNS,'g');
  var c = document.createElementNS(SVGNS,'circle');
  c.setAttribute('r','4.5'); c.setAttribute('fill',color); c.setAttribute('class','packet-dot');
  var t = document.createElementNS(SVGNS,'circle');
  t.setAttribute('r','11'); t.setAttribute('fill','none');
  t.setAttribute('stroke',color); t.setAttribute('stroke-opacity','.35');
  g.appendChild(t); g.appendChild(c);
  packets.appendChild(g);
  return g;
}
function travel(pathId, g, from, to, dur, done){
  var p = document.getElementById(pathId), L = p.getTotalLength(), t0=null;
  function step(t){
    if(!t0) t0=t;
    var k = Math.min((t-t0)/dur,1), e = k<.5 ? 2*k*k : 1-Math.pow(-2*k+2,2)/2;
    var len = from + (to-from)*e, pt = p.getPointAtLength(len);
    g.setAttribute('transform','translate('+pt.x+','+pt.y+')');
    if(k<1) requestAnimationFrame(step); else done && done();
  }
  requestAnimationFrame(step);
}
function flashRing(color){
  ringFlash.setAttribute('stroke',color);
  ringFlash.style.transition='none'; ringFlash.style.opacity='.9';
  ringFlash.setAttribute('r','118');
  requestAnimationFrame(function(){
    ringFlash.style.transition='opacity 1s ease-out';
    ringFlash.style.opacity='0';
  });
}
function setLines(n){ roLines.forEach(function(l,i){ l.classList.toggle('on', i<n); }); }

var evIdx = 0;
function runEvent(){
  var e = EVENTS[evIdx % EVENTS.length]; evIdx++;
  var node = document.getElementById(e.node);
  document.querySelectorAll('.node').forEach(function(n){ n.classList.remove('active'); });
  node.classList.add('active');

  el.agent.textContent = e.agent; el.amt.textContent = e.amt;
  el.purpose.textContent = e.purpose; el.recip.textContent = e.recip;
  el.policy.textContent = e.policy; el.risk.textContent = e.risk;
  el.recip.style.color = (e.recip==='Approved') ? '' : 'var(--coral)';
  el.policy.style.color = e.ok ? '' : 'var(--coral)';
  el.risk.style.color = e.ok ? '' : 'var(--coral)';
  el.verdict.classList.remove('on'); setLines(0);

  if(RM){
    setLines(4); el.verdict.classList.add('on');
    el.v.textContent = e.ok?'Approved':'Blocked';
    el.v.className = e.ok?'v-ok':'v-no'; el.vsub.textContent = e.sub;
    setTimeout(runEvent, 4200); return;
  }

  var color = e.ok ? '#66E1FF' : '#FF5C6C';
  var g = makePacket(color);
  var p = document.getElementById(e.path), L = p.getTotalLength(), ringLen = L - 118;

  setTimeout(function(){ setLines(1); }, 250);
  setTimeout(function(){ setLines(2); }, 620);

  travel(e.path, g, 0, ringLen, 1500, function(){
    setLines(3);
    setTimeout(function(){ setLines(4); }, 380);
    if(e.ok){
      flashRing('#2962FF');
      setTimeout(function(){
        travel(e.path, g, ringLen, L, 700, function(){
          g.remove();
          var g2 = makePacket('#3FD08A');
          travel('pBase', g2, 118, document.getElementById('pBase').getTotalLength(), 900, function(){
            g2.style.transition='opacity .5s'; g2.style.opacity='0';
            setTimeout(function(){ g2.remove(); }, 520);
          });
          el.verdict.classList.add('on');
          el.v.textContent='Approved'; el.v.className='v-ok'; el.vsub.textContent=e.sub;
        });
      }, 520);
      setTimeout(runEvent, 4600);
    }else{
      flashRing('#FF5C6C');
      g.style.transition='opacity .6s cubic-bezier(.22,.61,.36,1), transform .6s';
      setTimeout(function(){
        el.verdict.classList.add('on');
        el.v.textContent='Blocked'; el.v.className='v-no'; el.vsub.textContent=e.sub;
        g.style.opacity='0';
        setTimeout(function(){ g.remove(); }, 640);
      }, 560);
      setTimeout(runEvent, 4400);
    }
  });
}
var heroSeen=false;
var hio = new IntersectionObserver(function(es){
  es.forEach(function(e){ if(e.isIntersecting && !heroSeen){ heroSeen=true; setTimeout(runEvent,900); } });
},{threshold:.2});
hio.observe(document.querySelector('.stage'));

/* ---------------- PIPELINE ---------------- */
var pipe = document.getElementById('pipe');
var pio = new IntersectionObserver(function(es){
  es.forEach(function(e){
    if(!e.isIntersecting) return; pio.unobserve(e.target);
    var steps = pipe.querySelectorAll('.pstep');
    document.getElementById('pipeFill').style.width='100%';
    steps.forEach(function(s,i){ setTimeout(function(){ s.classList.add('on'); }, RM?0:i*320); });
  });
},{threshold:.4});
pio.observe(pipe);

/* ---------------- DECISION DEMO ---------------- */
var SCENES = {
  safe:{
    agent:'Research Scout', amt:'$4.50', purpose:'Market dataset', recip:'Approved',
    trace:'TRACE 0x8f3a…7c2e',
    checks:[
      ['Allowed asset','USDC',true],['Single transaction limit','$4.50 / $10.00',true],
      ['Daily budget remaining','$20.50 / $25.00',true],['Recipient allowlist','Match found',true],
      ['Emergency reserve','Untouched',true],['Risk score','12 · LOW',true],['Execution simulation','Required before submission',true]
    ],
    verdict:'Execute', vclass:'pass', rlabel:'Settlement', rval:'Base · USDC'
  },
  bad:{
    agent:'Trading Agent', amt:'$80.00', purpose:'Position entry', recip:'Unknown',
    trace:'TRACE 0x2b7d…9a11',
    checks:[
      ['Allowed asset','USDC',true],['Single transaction limit','$80.00 / $25.00',false],
      ['Daily budget remaining','$18.00 / $50.00',false],['Recipient allowlist','No match',false],
      ['Emergency reserve','Would breach $100',false],['Risk score','91 · CRITICAL',false],['Execution simulation','Not reached',false]
    ],
    verdict:'Blocked', vclass:'fail', rlabel:'Funds protected', rval:'$80.00'
  }
};
var checksEl=document.getElementById('checks'), verdictEl=document.getElementById('dVerdict');
var timers=[];
function clearTimers(){ timers.forEach(clearTimeout); timers=[]; }
function playScene(key){
  clearTimers();
  var s=SCENES[key];
  document.getElementById('dAgent').textContent=s.agent;
  document.getElementById('dAmt').textContent=s.amt;
  document.getElementById('dPurpose').textContent=s.purpose;
  document.getElementById('dRecip').textContent=s.recip;
  document.getElementById('dRecip').style.color = s.recip==='Approved' ? '' : 'var(--coral)';
  document.getElementById('traceId').textContent=s.trace;
  verdictEl.classList.remove('on','pass','fail');
  checksEl.innerHTML='';
  s.checks.forEach(function(c){
    var d=document.createElement('div');
    d.className='check '+(c[2]?'pass':'fail');
    d.innerHTML='<span class="ci"></span><span class="cn">'+c[0]+'</span><span class="cv">'+c[1]+'</span>';
    checksEl.appendChild(d);
  });
  var nodes=checksEl.querySelectorAll('.check');
  nodes.forEach(function(n,i){
    timers.push(setTimeout(function(){ n.classList.add('on'); }, RM?0:280+i*260));
  });
  timers.push(setTimeout(function(){
    verdictEl.classList.add('on', s.vclass);
    document.getElementById('dvLabel').textContent=s.verdict;
    document.getElementById('dvRight').innerHTML=s.rlabel+'<b>'+s.rval+'</b>';
  }, RM?0:280+nodes.length*260+200));
}
var demoKey='safe', demoStarted=false;
document.getElementById('tabSafe').addEventListener('click',function(){
  demoKey='safe'; this.classList.add('on'); this.setAttribute('aria-selected','true');
  var o=document.getElementById('tabBad'); o.classList.remove('on'); o.setAttribute('aria-selected','false');
  playScene('safe');
});
document.getElementById('tabBad').addEventListener('click',function(){
  demoKey='bad'; this.classList.add('on'); this.setAttribute('aria-selected','true');
  var o=document.getElementById('tabSafe'); o.classList.remove('on'); o.setAttribute('aria-selected','false');
  playScene('bad');
});
document.getElementById('replay').addEventListener('click',function(){ playScene(demoKey); });
var dio=new IntersectionObserver(function(es){
  es.forEach(function(e){ if(e.isIntersecting && !demoStarted){ demoStarted=true; playScene('safe'); } });
},{threshold:.3});
dio.observe(document.querySelector('.demo-panel'));

/* ---------------- AUDIT STREAM ---------------- */
var stream=document.getElementById('auditStream');
var AUDIT=[
  ['14:22:07','0x8f3a…7c2e','APPROVED','ok'],
  ['14:21:52','0x2b7d…9a11','BLOCKED','no'],
  ['14:21:31','0x7e21…ac90','APPROVED','ok'],
  ['14:20:58','0x9c12…1d44','APPROVED','ok'],
  ['14:20:12','0x4a6b…8f21','BLOCKED','no'],
  ['14:19:44','0xd1c0…b8e2','APPROVED','ok']
];
var ai=0;
function pushAudit(){
  var a=AUDIT[ai%AUDIT.length]; ai++;
  var d=document.createElement('div');
  d.className='audit-line';
  d.innerHTML='<span class="t">'+a[0]+'</span><span class="h">'+a[1]+'</span><span class="s '+a[3]+'">'+a[2]+'</span>';
  stream.insertBefore(d, stream.firstChild);
  while(stream.children.length>6) stream.removeChild(stream.lastChild);
}
for(var i=0;i<6;i++) pushAudit();
if(!RM) setInterval(pushAudit, 2600);

/* ---------------- SHADOW SPLIT BAR ---------------- */
var sbio=new IntersectionObserver(function(es){
  es.forEach(function(e){
    if(!e.isIntersecting) return; sbio.unobserve(e.target);
    var bar=document.getElementById('splitBar');
    setTimeout(function(){
      bar.querySelector('.a').style.width='65%';
      bar.querySelector('.b').style.width='35%';
    },200);
  });
},{threshold:.3});
sbio.observe(document.getElementById('shadowReport'));

/* ---------------- CHARTS ---------------- */
var chio=new IntersectionObserver(function(es){
  es.forEach(function(e){
    if(!e.isIntersecting) return; chio.unobserve(e.target);
    document.getElementById('ttLine').classList.add('in');
    document.getElementById('ttArea').classList.add('in');
    document.querySelectorAll('.donut').forEach(function(c,i){
      var len=parseFloat(c.dataset.len), off=parseFloat(c.dataset.offset||'0');
      setTimeout(function(){
        c.style.transition='stroke-dasharray 1.1s cubic-bezier(.22,.61,.36,1)';
        c.setAttribute('stroke-dasharray', len+' 327');
        if(off) c.setAttribute('stroke-dashoffset', off);
      }, 160*i);
    });
    var rw=document.querySelector('.runway'); if(rw) rw.style.width='66%';
  });
},{threshold:.25});
chio.observe(document.getElementById('charts'));

/* ---------------- RISK GAUGE ---------------- */
var ARC=613;
var gProg=document.getElementById('gProg'), gVal=document.getElementById('gVal'), gBand=document.getElementById('gBand');
function bandColor(s){ return s<30?'#3FD08A': s<55?'#66E1FF': s<75?'#E8B04B':'#FF5C6C'; }
function setScore(score, label){
  var c=bandColor(score);
  gProg.setAttribute('stroke',c);
  gProg.setAttribute('stroke-dashoffset', ARC - ARC*(score/100));
  gBand.textContent=label; gBand.style.color=c;
  if(RM){ gVal.textContent=score; return; }
  var start=parseInt(gVal.textContent,10)||0, t0=null;
  function tick(t){
    if(!t0)t0=t;
    var p=Math.min((t-t0)/900,1), e=1-Math.pow(1-p,3);
    gVal.textContent=Math.round(start+(score-start)*e);
    if(p<1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
gProg.setAttribute('stroke-dashoffset', ARC);
var rio=new IntersectionObserver(function(es){
  es.forEach(function(e){
    if(!e.isIntersecting) return; rio.unobserve(e.target);
    setScore(12,'Low');
    document.querySelectorAll('.ftrack i').forEach(function(b,i){
      setTimeout(function(){ b.style.width=b.dataset.w+'%'; }, 120*i);
    });
  });
},{threshold:.3});
rio.observe(document.getElementById('risk'));
document.querySelectorAll('.band').forEach(function(b){
  b.addEventListener('click',function(){ setScore(parseInt(b.dataset.score,10), b.dataset.band); });
});

/* ---------------- SAFE MODE ---------------- */
var safeSec=document.getElementById('safe');
var states=document.querySelectorAll('.sstate');
var stateNames=['','state-watch','state-safe'];
function setSafe(i){
  states.forEach(function(s,k){ s.classList.toggle('on', k===i); });
  safeSec.classList.remove('state-watch','state-safe');
  if(stateNames[i]) safeSec.classList.add(stateNames[i]);
  document.querySelectorAll('[data-safe]').forEach(function(b){
    b.style.borderColor = (parseInt(b.dataset.safe,10)===i) ? 'var(--line-gold)' : '';
  });
}
document.querySelectorAll('[data-safe]').forEach(function(b){
  b.addEventListener('click',function(){ safeAuto=false; setSafe(parseInt(b.dataset.safe,10)); });
});
var safeAuto=true, safeIdx=0, safeTimer=null;
var sio=new IntersectionObserver(function(es){
  es.forEach(function(e){
    if(e.isIntersecting && !safeTimer && !RM){
      safeTimer=setInterval(function(){
        if(!safeAuto) return;
        safeIdx=(safeIdx+1)%3; setSafe(safeIdx);
      }, 2800);
    }
  });
},{threshold:.35});
sio.observe(safeSec);

/* ---------------- USE CASES ---------------- */
var UC=[
  {t:'Research agents',d:'Buy datasets, API credits, compute and information without an open wallet. Micro-payments are the whole workload, so the limits that matter are per-transaction and per-day, not per-position.',
   rows:[['Daily limit','$25.00'],['Maximum transaction','$10.00'],['Allowed assets','USDC'],['Unknown recipient','Block'],['Typical action','Dataset purchase · $4.50']]},
  {t:'Trading agents',d:'Operate inside hard position and spend boundaries. The agent chooses the trade; the constitution decides the maximum it is allowed to be wrong by.',
   rows:[['Daily limit','$50.00'],['Maximum transaction','$25.00'],['Allowed venues','Approved routers only'],['3 failed transactions','Safe mode'],['Typical action','Swap · $18.00']]},
  {t:'Yield agents',d:'Interact with approved DeFi venues under treasury policy. Reserve floors are enforced before deposit, so an agent can never allocate the capital you told it to keep.',
   rows:[['Daily limit','$35.00'],['Emergency reserve','$100.00 · locked'],['Allowed venues','Allowlisted pools'],['Contract risk threshold','55 NRS'],['Typical action','LP deposit · $30.00']]},
  {t:'Operations agents',d:'Pay recurring infrastructure and operational costs on schedule. Recipients are fixed, amounts are predictable, and anything outside the pattern is held for review.',
   rows:[['Daily limit','$8.00'],['Maximum transaction','$8.00'],['Recipients','Fixed list · 6'],['Off-pattern spend','Require review'],['Typical action','RPC subscription · $12.00 / mo']]},
  {t:'Autonomous teams',d:'Several agents, one treasury, separate authority. Each constitution is independent, but reserve floors and Safe Mode apply across the whole workspace.',
   rows:[['Treasury','$24,732.68'],['Active agents','12'],['Combined daily ceiling','$118.00'],['Shared reserve','$100.00 · locked'],['Workspace state','Autonomous']]}
];
var ucPanel=document.getElementById('ucPanel');
function renderUC(i){
  var u=UC[i];
  var rows=u.rows.map(function(r){ return '<div class="prow"><span>'+r[0]+'</span><b>'+r[1]+'</b></div>'; }).join('');
  ucPanel.innerHTML='<div class="fade-swap"><span class="label">Scenario 0'+(i+1)+'</span><h3 style="margin-top:12px">'+u.t+'</h3><p class="desc">'+u.d+'</p><div class="uc-policy">'+rows+'</div></div>';
}
renderUC(0);
document.querySelectorAll('.uc-item').forEach(function(b){
  b.addEventListener('click',function(){
    document.querySelectorAll('.uc-item').forEach(function(x){ x.classList.remove('on'); });
    b.classList.add('on'); renderUC(parseInt(b.dataset.uc,10));
  });
});

/* ---------------- ONBOARDING PATH ---------------- */
var oio=new IntersectionObserver(function(es){
  es.forEach(function(e){
    if(!e.isIntersecting) return; oio.unobserve(e.target);
    document.querySelectorAll('#path .bar i').forEach(function(b,i){
      setTimeout(function(){ b.style.width='100%'; }, RM?0:i*220);
    });
  });
},{threshold:.3});
oio.observe(document.getElementById('path'));

})();
