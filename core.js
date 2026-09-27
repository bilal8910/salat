/* ══════════════════════════════════════════════════════════
EUR assurance Pro 2.0 — core.js
التخزين (محلي + Firebase لكل سجل على حدة)، الترقيم الموحد، الدخول، التنقل
══════════════════════════════════════════════════════════ */
'use strict';
var PFX='eurpro2_';
var LANG='ar';
var CUR=null; // {id,name,av,admin}

/* ───────── utils ───────── */
function $(id){return document.getElementById(id);}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function T(ar,fr){return LANG==='fr'?fr:ar;}
function num(v){var n=parseFloat(String(v==null?'':v).replace(',','.'));return isFinite(n)?n:0;}
function r2(n){return Math.round((n||0)*100)/100;}
function fmt(n){return Number(n||0).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2});}
function fmtK(n){n=Number(n||0);var a=Math.abs(n);return a>=100000?(n/1000).toFixed(0)+'K':a>=10000?(n/1000).toFixed(1)+'K':fmt(n);}
function pad(n,l){return String(n).padStart(l,'0');}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8);}
/* تاريخ محلي (وليس UTC) — يصلح خطأ تغيّر اليوم بين 00:00 و 01:00 */
function isoOf(d){return d.getFullYear()+'-'+pad(d.getMonth()+1,2)+'-'+pad(d.getDate(),2);}
function isoToday(){return isoOf(new Date());}
function nowTime(){var d=new Date();return pad(d.getHours(),2)+':'+pad(d.getMinutes(),2);}
function fmtD(iso){if(!iso)return'—';var p=String(iso).split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:iso;}
function parseISO(iso){var p=String(iso).split('-');return new Date(+p[0],+p[1]-1,+p[2]);}
function addDays(iso,n){var d=parseISO(iso);d.setDate(d.getDate()+n);return isoOf(d);}
function addMonths(iso,n){var d=parseISO(iso);d.setMonth(d.getMonth()+n);return isoOf(d);}
function toast(msg,err){var t=$('toast');t.textContent=msg;t.className='on'+(err?' err':'');clearTimeout(toast._t);toast._t=setTimeout(function(){t.className='';},2600);}
function download(name,content,type){var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type:type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},500);}

/* SHA-256 (UTF-8) — كلمة سر المسؤول لا تُحفظ نصاً صريحاً */
function sha256(str){
var s=unescape(encodeURIComponent(str));
function rr(v,a){return(v>>>a)|(v<<(32-a));}
var H=[],K=[],pr=0,cand=2,isC={};
while(pr<64){if(!isC[cand]){for(var i=0;i<313;i+=cand)isC[i]=cand;H[pr]=(Math.pow(cand,.5)*4294967296)|0;K[pr++]=(Math.pow(cand,1/3)*4294967296)|0;}cand++;}
H=H.slice(0,8);
var words=[],bl=s.length*8;s+='\x80';
while(s.length%64-56)s+='\x00';
for(i=0;i<s.length;i++){var j=s.charCodeAt(i);words[i>>2]|=j<<((3-i)%4)*8;}
words[words.length]=((bl/4294967296)|0);words[words.length]=bl;
for(j=0;j<words.length;){var w=words.slice(j,j+=16),oh=H;H=H.slice(0,8);
for(i=0;i<64;i++){var w15=w[i-15],w2=w[i-2],a=H[0],e=H[4];
var t1=H[7]+(rr(e,6)^rr(e,11)^rr(e,25))+((e&H[5])^((~e)&H[6]))+K[i]+(w[i]=(i<16)?w[i]:(w[i-16]+(rr(w15,7)^rr(w15,18)^(w15>>>3))+w[i-7]+(rr(w2,17)^rr(w2,19)^(w2>>>10)))|0);
var t2=(rr(a,2)^rr(a,13)^rr(a,22))+((a&H[1])^(a&H[2])^(H[1]&H[2]));
H=[(t1+t2)|0].concat(H);H[4]=(H[4]+t1)|0;}
for(i=0;i<8;i++)H[i]=(H[i]+oh[i])|0;}
var out='';for(i=0;i<8;i++)for(j=3;j+1;j--){var b=(H[i]>>(j*8))&255;out+=(b<16?'0':'')+b.toString(16);}
return out;}

/* ───────── STORE ─────────
كل مجموعة = كائن {id: record}. كل تعديل يُرسل لـ Firebase كسجل مستقل
(لا يُعاد إرسال المجموعة كاملة → لا يمسح موظف عمل موظف آخر).
التعديلات غير المؤكدة تبقى في "pending" وتُعاد عند عودة الاتصال. */
var Store={
cols:['ops','users','moves','cash','autre'],
data:{},docs:{},pend:{},
load:function(){
var self=this;
this.cols.forEach(function(c){try{self.data[c]=JSON.parse(localStorage.getItem(PFX+c)||'{}')||{};}catch(e){self.data[c]={};}});
try{this.docs=JSON.parse(localStorage.getItem(PFX+'docs')||'{}')||{};}catch(e){this.docs={};}
try{this.pend=JSON.parse(localStorage.getItem(PFX+'pend')||'{}')||{};}catch(e){this.pend={};}
},
save:function(c){try{localStorage.setItem(PFX+c,JSON.stringify(this.data[c]));}catch(e){toast(T('الذاكرة ممتلئة!','Stockage plein !'),1);}},
saveDocs:function(){localStorage.setItem(PFX+'docs',JSON.stringify(this.docs));},
savePend:function(){localStorage.setItem(PFX+'pend',JSON.stringify(this.pend));},
all:function(c){return Object.values(this.data[c]||{});},
get:function(c,id){return(this.data[c]||{})[id]||null;},
put:function(c,obj){this.data[c][obj.id]=obj;this.save(c);this._push('put',c,obj.id,obj);changed(c);},
del:function(c,id){delete this.data[c][id];this.save(c);this._push('del',c,id,null);changed(c);},
doc:function(k){return this.docs[k]||{};},
setDoc:function(k,obj){this.docs[k]=obj;this.saveDocs();this._push('doc','docs',k,obj);changed('docs');},
_push:function(op,c,id,val){var key=c+'/'+id;this.pend[key]={op:op,col:c,id:id,val:val,ts:Date.now()};this.savePend();this.flush1(key);},
flush1:function(key){
var self=this,p=this.pend[key];
if(!p||!window.FB||!FB.connected)return;
var pr=p.op==='put'?FB.put(p.col,p.id,p.val):p.op==='del'?FB.del(p.col,p.id):FB.setDoc(p.id,p.val);
pr.then(function(){if(self.pend[key]===p){delete self.pend[key];self.savePend();}}).catch(function(e){console.warn('sync',e);});
},
flushPending:function(){var self=this;Object.keys(this.pend).forEach(function(k){self.flush1(k);});},
onRemote:function(c,map){
var m=Object.assign({},map||{});
Object.values(this.pend).forEach(function(p){if(p.col!==c)return;if(p.op==='put')m[p.id]=p.val;else if(p.op==='del')delete m[p.id];});
this.data[c]=m;this.save(c);changed(c);
},
onRemoteDocs:function(map){
var m=Object.assign({},map||{});
Object.values(this.pend).forEach(function(p){if(p.op==='doc')m[p.id]=p.val;});
this.docs=m;this.saveDocs();changed('docs');
},
/* ترقيم موحد: عبر Firebase (معاملة ذرية) عند الاتصال، وإلا رقم محلي مؤقت مُعلَّم */
next:function(name,start){
var lk=PFX+'ctr_'+name;
function local(){var cur=parseInt(localStorage.getItem(lk)||'0',10);if(cur<start)cur=start;cur++;localStorage.setItem(lk,cur);return{n:cur,offline:true};}
if(!window.FB||!FB.connected)return Promise.resolve(local());
var to=new Promise(function(_,rej){setTimeout(function(){rej('timeout');},5000);});
return Promise.race([FB.next(name,start),to]).then(function(n){
var cur=parseInt(localStorage.getItem(lk)||'0',10);if(n>cur)localStorage.setItem(lk,n);return{n:n,offline:false};
}).catch(function(){return local();});
}
};

/* ───────── PRICES / SETTINGS ───────── */
var DEF={
e1:2227.18,e2:2710.74,e3:2940.13,e4:4224.38,d1:2710.74,d2:2940,d3:4224.38,
m_le50:1473,m_mid:2000,m_ge126:2683,comm:5024,t35:3950,t12:7000,t14:8000,
timbre:17,mult1:0.09,mult3:0.27,mult6:0.54,mult12:1,instfee:17,
tpv_camion_5j:400,tpv_camion_10j:700,tpv_remorque_5j:500,tpv_remorque_10j:850,
tpv_tourisme_5j:150,tpv_tourisme_10j:250,tpv_tourisme_1m:450,tpv_tourisme_3m:1100,
cnpac:17,taxi2_tax:15,taxi2_para:1.5
};
function P(k){var p=Store.doc('prices');var v=p[k];return(v===undefined||v===null||v==='')?DEF[k]:num(v);}
function agency(){return Store.doc('agency');}

/* ───────── i18n ───────── */
function setLang(l){
LANG=l==='fr'?'fr':'ar';
document.body.classList.toggle('fr',LANG==='fr');
document.documentElement.lang=LANG;document.documentElement.dir=LANG==='fr'?'ltr':'rtl';
document.querySelectorAll('[data-lang]').forEach(function(b){b.classList.toggle('on',b.dataset.lang===LANG);});
localStorage.setItem(PFX+'lang',LANG);
var q=$('h-q');if(q)q.placeholder=T('🔍 بحث: الاسم، اللوحة، الرقم، البوليصة...','🔍 Nom, immat., N°, police...');
if(CUR)refreshPage();else renderLogin();
}

/* ───────── CHANGE → RE-RENDER ───────── */
var _chgT=null,_chgCols={};
function changed(c){_chgCols[c]=1;clearTimeout(_chgT);_chgT=setTimeout(function(){var cols=_chgCols;_chgCols={};onDataChanged(cols);},90);}
function onDataChanged(cols){
if(!CUR){renderLogin();return;}
if(CUR&&!CUR.admin&&!Store.get('users',CUR.id)&&Store.all('users').length&&cols.users){logout();return;}
if(PAGE==='calc'){if(typeof calcOnData==='function')calcOnData(cols);}
else refreshPage();
}

/* ───────── MODAL ───────── */
function openModal(html){$('modal-box').innerHTML=html;$('modal').classList.add('on');}
function closeModal(){$('modal').classList.remove('on');}

/* ───────── AUTH ───────── */
var AVATARS=['👨','👩','🧑','👨‍💼','👩‍💼','🧔','👱','⭐'];
function renderLogin(){
var g=$('ugrid');if(!g)return;
var users=Store.all('users').sort(function(a,b){return(a.name||'').localeCompare(b.name||'');});
if(!users.length){g.innerHTML='<div class="lg-empty">'+T('لا يوجد مستخدمون بعد — ادخل كمسؤول لإضافتهم','Aucun utilisateur — entrez comme admin pour en ajouter')+'</div>';}
else g.innerHTML=users.map(function(u){return'<button class="ubtn" data-uid="'+esc(u.id)+'"><span class="av">'+esc(u.av||'👤')+'</span><b>'+esc(u.name)+'</b></button>';}).join('');
var hasPwd=!!Store.doc('security').hash;
$('adm-hint').textContent=hasPwd?T('أدخل كلمة سر المسؤول','Mot de passe administrateur'):T('أول استخدام: عيّن كلمة سر المسؤول (4 أحرف على الأقل)','Premier usage : définissez le mot de passe admin (4 caractères min.)');
$('adm-pwd2-wrap').classList.toggle('hide',hasPwd);
$('adm-pwd').placeholder=T('كلمة السر','Mot de passe');$('adm-pwd2').placeholder=T('تأكيد كلمة السر','Confirmer');
}
function startSession(u,admin){
CUR={id:u.id,name:u.name,av:u.av||'👤',admin:!!admin};
localStorage.setItem(PFX+'session',JSON.stringify({u:CUR,ts:Date.now()}));
$('login').style.display='none';$('app').classList.add('on');
$('u-av').textContent=CUR.av;$('u-name').textContent=CUR.name;$('u-adm').classList.toggle('hide',!CUR.admin);
document.querySelectorAll('.admin-only').forEach(function(el){el.classList.toggle('hide',!CUR.admin);});
touch();
navTo(localStorage.getItem(PFX+'page')||'dash');
}
function logout(){
CUR=null;localStorage.removeItem(PFX+'session');
$('app').classList.remove('on');$('login').style.display='flex';
$('adm-a').classList.remove('hide');$('adm-b').classList.add('hide');$('adm-pwd').value='';$('adm-pwd2').value='';
renderLogin();
}
function adminGo(){
var sec=Store.doc('security'),p1=$('adm-pwd').value,err=$('adm-err');
err.classList.add('hide');
if(!sec.hash){
if(p1.length<4){err.textContent=T('4 أحرف على الأقل','4 caractères minimum');err.classList.remove('hide');return;}
if(p1!==$('adm-pwd2').value){err.textContent=T('كلمتا السر غير متطابقتين','Les mots de passe ne correspondent pas');err.classList.remove('hide');return;}
var salt=uid();Store.setDoc('security',Object.assign({},sec,{hash:sha256(salt+p1),salt:salt}));
toast(T('تم تعيين كلمة سر المسؤول','Mot de passe admin défini'));
startSession({id:'admin',name:'Admin',av:'🔑'},true);return;
}
if(sha256((sec.salt||'')+p1)===sec.hash)startSession({id:'admin',name:'Admin',av:'🔑'},true);
else{err.textContent=T('كلمة السر غير صحيحة','Mot de passe incorrect');err.classList.remove('hide');$('adm-pwd').value='';$('adm-pwd').focus();}
}
/* قفل تلقائي بعد عدم النشاط → رجوع لشاشة الدخول (يشمل الموظفين أيضاً) */
var _lastAct=Date.now();
function touch(){_lastAct=Date.now();if(CUR){var s=JSON.parse(localStorage.getItem(PFX+'session')||'null');if(s){s.ts=_lastAct;localStorage.setItem(PFX+'session',JSON.stringify(s));}}}
function lockMin(){var m=num(Store.doc('security').lockMin);return m>0?m:30;}
setInterval(function(){if(CUR&&Date.now()-_lastAct>lockMin()*60000){logout();toast(T('تم القفل التلقائي','Verrouillage automatique'));}},15000);
['click','keydown','touchstart'].forEach(function(ev){document.addEventListener(ev,function(){if(CUR&&Date.now()-_lastAct>20000)touch();else _lastAct=Date.now();},true);});

/* ───────── NAV ───────── */
var PAGE='dash';
var TITLES={dash:['لوحة القيادة','Tableau de bord'],calc:['حساب جديد','Nouveau calcul'],hist:['السجل','Historique'],caisse:['الصندوق','Caisse'],settings:['الإعدادات','Paramètres']};
var RENDER={};
function navTo(pg){
if(!$('pg-'+pg))pg='dash';
if(pg==='settings'&&!CUR.admin)pg='dash';
PAGE=pg;localStorage.setItem(PFX+'page',pg);
document.querySelectorAll('.page').forEach(function(p){p.classList.toggle('on',p.id==='pg-'+pg);});
document.querySelectorAll('#nav button').forEach(function(b){b.classList.toggle('on',b.dataset.pg===pg);});
refreshPage();window.scrollTo(0,0);
}
function refreshPage(){
if(!CUR)return;
$('h-title').textContent=T(TITLES[PAGE][0],TITLES[PAGE][1]);
$('h-next').textContent=fmtD(isoToday());
if(RENDER[PAGE])RENDER[PAGE]();
}

/* ───────── SYNC STATUS ───────── */
window.addEventListener('fb-status',function(e){
var el=$('sync');if(!el)return;
el.className='sync '+(e.detail?'on':'off');
$('sync-tx').textContent=e.detail?T('متزامن','Synchro'):T('غير متصل','Hors ligne');
if(e.detail)Store.flushPending();
});

/* ───────── INIT ───────── */
document.addEventListener('DOMContentLoaded',function(){
Store.load();
$('ft-y').textContent=new Date().getFullYear();
setInterval(function(){$('ft-clock').textContent=new Date().toLocaleTimeString('fr-FR');},1000);
document.querySelectorAll('[data-lang]').forEach(function(b){b.onclick=function(){setLang(b.dataset.lang);};});
$('ugrid').addEventListener('click',function(e){var b=e.target.closest('[data-uid]');if(!b)return;var u=Store.get('users',b.dataset.uid);if(u)startSession(u,false);});
$('adm-open').onclick=function(){$('adm-a').classList.add('hide');$('adm-b').classList.remove('hide');renderLogin();$('adm-pwd').focus();};
$('adm-back').onclick=function(){$('adm-b').classList.add('hide');$('adm-a').classList.remove('hide');$('adm-err').classList.add('hide');};
$('adm-go').onclick=adminGo;
['adm-pwd','adm-pwd2'].forEach(function(id){$(id).addEventListener('keydown',function(e){if(e.key==='Enter')adminGo();});});
$('uchip').onclick=function(){if(confirm(T('تسجيل الخروج؟','Se déconnecter ?')))logout();};
$('nav').addEventListener('click',function(e){var b=e.target.closest('[data-pg]');if(b)navTo(b.dataset.pg);});
document.addEventListener('click',function(e){var g=e.target.closest('[data-go]');if(g)navTo(g.dataset.go);});
$('modal').addEventListener('click',function(e){if(e.target.id==='modal')closeModal();});
document.addEventListener('keydown',function(e){if(e.key==='Escape'){closeModal();$('doc').classList.remove('on');}});

if(typeof initCalc==='function')initCalc();
if(typeof initPages==='function')initPages();

setLang(localStorage.getItem(PFX+'lang')||'ar');
var s=null;try{s=JSON.parse(localStorage.getItem(PFX+'session')||'null');}catch(e){}
if(s&&s.u&&Date.now()-(s.ts||0)<lockMin()*60000){startSession(s.u,s.u.admin);}
else{localStorage.removeItem(PFX+'session');renderLogin();}

/* إذا لم تُحمَّل Firebase إطلاقاً (بدون إنترنت) → اعرض "غير متصل" بدل الانتظار */
setTimeout(function(){if(!window.FB)window.dispatchEvent(new CustomEvent('fb-status',{detail:false}));},6000);

if('serviceWorker' in navigator&&location.protocol.indexOf('http')===0){navigator.serviceWorker.register('./sw.js').catch(function(){});}
});
