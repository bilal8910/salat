/* ══════════════════════════════════════════════════════════
EUR assurance Pro 2.0 — calc.js
الحاسبة (Wafa / TPV / Taxi / Autre)، التقسيط، الحفظ، الوصولات
══════════════════════════════════════════════════════════ */
'use strict';
var S={tarif:'wafa',vtype:'voiture',fuel:'d',cv:6,moto:'le50',ccv:6,ton:'t35',dur:6,bm:'none',
tpvType:'camion',tpvDur:'5j',taxiDur:'3m',taxiMethod:1,autreCat:'',autreDur:'',
usage:'Personnel',pay:'cash',instSel:-1};
var LAST_OP=null;
var NUM_KEYS={cv:1,ccv:1,dur:1,taxiMethod:1};
var TPV_DURS={camion:['5j','10j'],remorque:['5j','10j'],tourisme:['5j','10j','1m','3m']};
var TPV_DUR_LBL={'5j':['5 أيام','5 jours'],'10j':['10 أيام','10 jours'],'1m':['شهر','1 mois'],'3m':['3 أشهر','3 mois']};
var INST_COUNT={3:2,6:3,12:4};

function autreList(){return Store.all('autre').sort(function(a,b){return(a.order||0)-(b.order||0)||String(a.name).localeCompare(String(b.name));});}
function chk(id){return $(id).checked;}

/* ───────── PRICE ENGINE ───────── */
function wafaBase(){
if(S.vtype==='voiture'){var cv=S.cv;return S.fuel==='e'?(cv<=6?P('e1'):cv<=8?P('e2'):cv<=10?P('e3'):P('e4')):(cv<=5?P('d1'):cv<=7?P('d2'):P('d3'));}
if(S.vtype==='moto')return P(S.moto==='le50'?'m_le50':S.moto==='mid'?'m_mid':'m_ge126');
if(S.vtype==='commercial')return P('comm');
return P(S.ton);
}
function taxiCalc(){
var mult=S.taxiDur==='3m'?3:S.taxiDur==='6m'?6:10; // السنة: قاعدة خاصة ×10
var units=S.taxiDur==='3m'?2:S.taxiDur==='6m'?3:4;
var cnpac=r2(P('cnpac')*units),ht,tax,para=0;
if(S.taxiMethod===2){ht=r2(num($('taxi-ht2').value)*mult);tax=r2(ht*P('taxi2_tax')/100);para=r2(ht*P('taxi2_para')/100);}
else{ht=r2(num($('taxi-ht').value)*mult);tax=r2(num($('taxi-tax').value)*mult);}
return{mult:mult,units:units,cnpac:cnpac,ht:ht,tax:tax,para:para,total:ht>0?r2(ht+tax+para+cnpac):0};
}
function equalPcts(n){var b=Math.floor(100/n),a=[];for(var i=0;i<n-1;i++)a.push(b);a.push(100-b*(n-1));return a;}

function compute(){
var R={direct:chk('direct-on'),manual:chk('man-on')};
var paidRaw=$('c-paid').value;R.paidSet=paidRaw!=='';R.paid=r2(num(paidRaw));
var full=0,desc='';
if(R.direct){
full=R.paid;desc='⚡ '+($('direct-desc').value.trim()||T('دفع مباشر','Paiement direct'));
}else{
if(S.tarif==='wafa'){
var pb=wafaBase()*P('mult'+S.dur);
var bm=S.bm==='bonus'?-pb*.1:S.bm==='m20'?pb*.2:S.bm==='m30'?pb*.3:0;
full=r2(pb+bm+P('timbre'));
var dl={1:'1M',3:'3M',6:'6M',12:'1an'}[S.dur],bl={none:'',bonus:' [B-10%]',m20:' [M+20%]',m30:' [M+30%]'}[S.bm];
desc=S.vtype==='voiture'?S.cv+'CV '+(S.fuel==='e'?'Ess':'Die'):S.vtype==='moto'?'Moto '+{le50:'≤50cc',mid:'51-125cc',ge126:'≥126cc'}[S.moto]:S.vtype==='commercial'?'Comm '+S.ccv+'CV':'Camion '+{t35:'-3.5T',t12:'12T',t14:'14T'}[S.ton];
desc+=' '+dl+bl;
}else if(S.tarif==='tpv'){
if(S.tpvType==='taxi'){var tx=taxiCalc();R.taxi=tx;full=tx.total;desc='Taxi TPV '+{'3m':'3mois','6m':'6mois','1a':'1an'}[S.taxiDur];}
else{full=P('tpv_'+S.tpvType+'_'+S.tpvDur);desc={camion:'Camion',remorque:'Camion+remorque',tourisme:'Tourisme'}[S.tpvType]+' TPV '+S.tpvDur;}
}else{
var cat=Store.get('autre',S.autreCat),d=cat&&(cat.durations||[]).filter(function(x){return x.id===S.autreDur;})[0];
full=d?num(d.price):0;desc=(cat?cat.name:'Autre')+(d?' '+d.label:'');
}
if(R.manual){full=r2(num($('man-price').value));}
}
R.full=r2(full);R.desc=desc;
/* التقسيط: Wafa فقط، مدد 3/6/12 */
R.inst=null;
if(!R.direct&&S.tarif==='wafa'&&INST_COUNT[S.dur]&&chk('inst-on')&&R.full>0){
var n=INST_COUNT[S.dur],fee=r2(P('instfee')*(n-1)),tot=r2(R.full+fee),pc=equalPcts(n),am=[],s=0;
for(var i=0;i<n;i++){if(i<n-1){am[i]=r2(tot*pc[i]/100);s+=am[i];}else am[i]=r2(tot-s);} // آخر قسط = الباقي بالضبط (بدون فروقات تقريب)
R.inst={n:n,fee:fee,total:tot,pcts:pc,amounts:am};
if(S.instSel>=n)S.instSel=-1;
}else S.instSel=-1;
R.target=R.inst&&S.instSel>=0?R.inst.amounts[S.instSel]:R.full;
if(R.inst&&S.instSel>=0)R.desc+=' ['+(S.instSel+1)+'/'+R.inst.n+']';
R.prevBal=0;
if(!R.direct&&chk('prev-on')){var po=num($('prev-off').value),pp=num($('prev-paid').value);if(po&&pp)R.prevBal=r2(pp-po);}
R.due=R.direct?R.paid:r2(R.target-R.prevBal);
R.diff=R.direct?0:r2(R.paid-R.due);
return R;
}

function endDate(){
var ds=$('c-ds').value;if(!ds||chk('direct-on'))return'';
if(S.tarif==='wafa')return addDays(addMonths(ds,S.dur),-1);
if(S.tarif==='tpv'){
if(S.tpvType==='taxi')return addDays(addMonths(ds,S.taxiDur==='3m'?3:S.taxiDur==='6m'?6:12),-1);
if(S.tpvDur==='5j')return addDays(ds,4);if(S.tpvDur==='10j')return addDays(ds,9);
return addDays(addMonths(ds,S.tpvDur==='1m'?1:3),-1);
}
var cat=Store.get('autre',S.autreCat),d=cat&&(cat.durations||[]).filter(function(x){return x.id===S.autreDur;})[0];
return d&&num(d.days)>0?addDays(ds,num(d.days)-1):'';
}

/* ───────── RENDER ───────── */
function segRender(){
document.querySelectorAll('#pg-calc [data-seg]').forEach(function(sg){
var k=sg.dataset.seg;sg.querySelectorAll('button').forEach(function(b){b.classList.toggle('on',String(S[k])===b.dataset.v);});
});
}
function buildDynamicSegs(){
var td=TPV_DURS[S.tpvType]||[];
if(td.length&&td.indexOf(S.tpvDur)<0)S.tpvDur=td[0];
$('tpvdur-seg').innerHTML=td.map(function(d){return'<button data-v="'+d+'">'+T(TPV_DUR_LBL[d][0],TPV_DUR_LBL[d][1])+'</button>';}).join('');
var cats=autreList();
if(cats.length&&!cats.some(function(c){return c.id===S.autreCat;}))S.autreCat=cats[0].id;
if(!cats.length)S.autreCat='';
$('autrecat-seg').innerHTML=cats.map(function(c){return'<button data-v="'+esc(c.id)+'">'+esc(c.name)+'</button>';}).join('');
var cat=Store.get('autre',S.autreCat),ds=cat?(cat.durations||[]):[];
if(ds.length&&!ds.some(function(d){return d.id===S.autreDur;}))S.autreDur=ds[0].id;
if(!ds.length)S.autreDur='';
$('autredur-seg').innerHTML=ds.map(function(d){return'<button data-v="'+esc(d.id)+'">'+esc(d.label)+' <small class="muted">'+fmt(d.price)+'</small></button>';}).join('');
$('autre-empty').classList.toggle('hide',cats.length>0);
}
function show(id,on){$(id).classList.toggle('hide',!on);}
function renderCalc(){
var direct=chk('direct-on');
buildDynamicSegs();
show('bx-wafa',S.tarif==='wafa');show('bx-tpv',S.tarif==='tpv');show('bx-autre',S.tarif==='autre');
['voiture','moto','commercial','camion'].forEach(function(v){show('bx-'+v,S.vtype===v);});
show('bx-tpvdur',S.tpvType!=='taxi');show('bx-taxi',S.tpvType==='taxi');
show('bx-taxi1',S.taxiMethod===1);show('bx-taxi2',S.taxiMethod===2);
show('bx-man',chk('man-on'));show('bx-direct',direct);show('bx-prev',chk('prev-on'));
show('bx-payref',S.pay!=='cash');
show('bx-inst-tog',!direct&&S.tarif==='wafa'&&!!INST_COUNT[S.dur]);
segRender();
var R=compute();
$('c-price').textContent=R.full>0?fmt(R.full)+' DH':'—';
if(R.taxi){var x=R.taxi;$('taxi-info').innerHTML='HT '+fmt(x.ht)+' + Tax '+fmt(x.tax)+(x.para?' + Parafiscale '+fmt(x.para):'')+' + CNPAC '+fmt(x.cnpac)+' ('+x.units+'×'+fmt(P('cnpac'))+') — ×'+x.mult;}
/* جدول التقسيط */
var ib=$('bx-inst');
if(R.inst){
ib.classList.remove('hide');
ib.innerHTML=R.inst.amounts.map(function(a,i){return'<button type="button" class="inst-row'+(S.instSel===i?' on':'')+'" data-inst="'+i+'"><span>'+(S.instSel===i?'✅ ':'')+T('القسط ','Versement ')+(i+1)+' ('+R.inst.pcts[i]+'%)</span><b>'+fmt(a)+' DH</b></button>';}).join('')+
'<div class="inst-foot">'+T('رسم التقسيط','Frais')+': '+fmt(R.inst.fee)+' ('+(R.inst.n-1)+'×'+fmt(P('instfee'))+') — '+T('المجموع','Total')+': <b>'+fmt(R.inst.total)+' DH</b> · '+T('اضغط على قسط لمقارنة الدفع به','Cliquez un versement pour comparer')+'</div>';
}else ib.classList.add('hide');
/* باقي سابق */
if(chk('prev-on'))$('prev-info').innerHTML=R.prevBal?(R.prevBal>0?T('رصيد لصالح الزبون: ','Crédit client : ')+'<b class="pos">'+fmt(R.prevBal)+'</b>':T('دين سابق: ','Dette précédente : ')+'<b class="neg">'+fmt(-R.prevBal)+'</b>'):'—';
/* النتيجة */
$('m-due').textContent=R.due>0?fmt(R.due):'—';
$('m-paid').textContent=R.paidSet?fmt(R.paid):'—';
$('m-diff').textContent=R.paidSet&&R.due>0?fmt(R.diff):'—';
var box=$('c-result'),l=$('c-res-l'),v=$('c-res-v');
if(!R.paidSet||!(R.due>0)){box.className='result';l.textContent=T('أدخل المبلغ المدفوع','Saisissez le montant payé');v.textContent='—';}
else if(R.diff>0){box.className='result pos';l.textContent='↩️ '+T('يُرجَع للزبون','À rendre au client');v.textContent=fmt(R.diff)+' DH';}
else if(R.diff<0){box.className='result neg';l.textContent='⚠️ '+T('الباقي على الزبون','Reste dû par le client');v.textContent=fmt(-R.diff)+' DH';}
else{box.className='result zero';l.textContent='✅ '+T('الحساب مطابق','Compte soldé');v.textContent='0,00 DH';}
$('c-de').value=endDate();
$('c-next').textContent=CUR?esc(CUR.name):'—';
return R;
}
function calcOnData(cols){
if(cols.ops)fillClientList();
if(cols.autre||cols.docs)renderCalc();
}
RENDER.calc=function(){fillClientList();renderCalc();};

/* قائمة الزبائن للإكمال التلقائي (من العمليات السابقة) */
function clientIndex(){
var m={};Store.all('ops').sort(function(a,b){return(a.ts||0)-(b.ts||0);}).forEach(function(o){if(o.client&&o.client!=='—')m[o.client.toUpperCase()]=o;});return m;
}
function fillClientList(){
var idx=clientIndex();
$('dl-clients').innerHTML=Object.keys(idx).slice(-400).map(function(k){var o=idx[k];return'<option value="'+esc(o.client)+'">'+esc([o.plate,o.police].filter(Boolean).join(' · '))+'</option>';}).join('');
}
function autofillClient(){
var o=clientIndex()[$('c-client').value.trim().toUpperCase()];if(!o)return;
[['c-phone','phone'],['c-plate','plate'],['c-police','police']].forEach(function(p){if(!$(p[0]).value&&o[p[1]])$(p[0]).value=o[p[1]];});
}

/* ───────── SAVE ───────── */
function resetCalcForm(){
['c-client','c-phone','c-plate','c-police','c-attest','c-loc','c-payref','c-paid','c-piece','direct-desc','prev-off','prev-paid','man-price','taxi-ht','taxi-tax','taxi-ht2'].forEach(function(id){$(id).value='';});
['direct-on','prev-on','inst-on','man-on'].forEach(function(id){$(id).checked=false;});
S.instSel=-1;S.pay='cash';S.usage='Personnel';
$('c-ds').value=isoToday();
renderCalc();
}
function valider(){
var R=renderCalc(),client=$('c-client').value.trim();
if(!client){toast(T('أدخل اسم الزبون','Nom du client requis'),1);$('c-client').focus();return;}
if(!R.paidSet){toast(T('أدخل المبلغ المدفوع','Saisissez le montant payé'),1);$('c-paid').focus();return;}
if(!(R.due>0)){toast(T('السعر غير محدد','Prix non défini'),1);return;}
if(S.pay!=='cash'&&!$('c-payref').value.trim()&&!confirm(T('بدون مرجع الدفع؟ متابعة؟','Sans référence de paiement ? Continuer ?')))return;
var btn=$('c-valider');btn.disabled=true;
Store.next('op',0).then(function(r){
var d=new Date();
var op={
id:uid(),num:'EUR-'+d.getFullYear()+'-'+pad(r.n,5)+(r.offline?'-H':''),
ts:Date.now(),date:isoToday(),time:nowTime(),userId:CUR.id,user:CUR.name,av:CUR.av,
client:client,phone:$('c-phone').value.trim(),plate:$('c-plate').value.trim().toUpperCase(),
police:$('c-police').value.trim(),attest:$('c-attest').value.trim(),loc:$('c-loc').value.trim(),
usage:S.usage,tarif:R.direct?'direct':S.tarif,desc:R.desc,
ds:R.direct?'':$('c-ds').value,de:R.direct?'':$('c-de').value,
full:R.full,off:R.target,prevBal:R.prevBal,due:R.due,paid:R.paid,diff:R.diff,
payMode:S.pay,payRef:S.pay==='cash'?'':$('c-payref').value.trim(),
inst:R.inst&&S.instSel>=0?{i:S.instSel+1,n:R.inst.n,total:R.inst.total}:null,
pieceNum:$('c-piece').value.trim()||''
};
Store.put('ops',op);LAST_OP=op;
if(r.offline)toast(T('تم الحفظ برقم محلي مؤقت (غير متصل)','Enregistré avec un N° local provisoire (hors ligne)'),1);
else toast('✅ '+op.num);
$('c-done').innerHTML='<b>✅ '+esc(op.num)+'</b> — '+esc(op.client)+' · '+fmt(op.due)+' DH'+
'<div class="acts"><button class="btn sm" data-doc="recu" data-op="'+op.id+'">🖨️ '+T('وصل','Reçu')+'</button><button class="btn sm gold" data-doc="piece" data-op="'+op.id+'">🧾 '+T('وصل القبض','Pièce de recette')+'</button></div>';
$('c-done').classList.remove('hide');
resetCalcForm();
}).finally(function(){btn.disabled=false;});
}

/* ───────── DOCUMENTS ───────── */
function docOpen(barHtml,bodyHtml){$('doc-bar').innerHTML=barHtml;$('doc-body').innerHTML=bodyHtml;$('doc').classList.add('on');window.scrollTo(0,0);}
function docBar(extra){return'<button class="btn sm" data-print="a5">📄 A5</button><button class="btn sm" data-print="80mm">🧾 80mm</button><button class="btn sm" data-print="a4">📃 A4</button>'+(extra||'')+'<button class="btn sm dng" data-close-doc>✕ '+T('إغلاق','Fermer')+'</button>';}
function doPrint(size){
var st=$('print-size');if(!st){st=document.createElement('style');st.id='print-size';document.head.appendChild(st);}
st.textContent=size==='80mm'?'@page{size:80mm auto;margin:3mm}':size==='a4'?'@page{size:A4 portrait;margin:10mm}':'@page{size:A5 portrait;margin:8mm}';
setTimeout(function(){window.print();},100);
}
function payLbl(m){return m==='cheque'?'📄 Chèque':m==='tpe'?'💳 TPE':'💵 '+T('نقداً','Espèces');}
function showRecu(op){
var ci=agency(),d=op.diff;
var body='<div class="rc"><h2>'+esc(ci.name||'EUR assurance')+'</h2><div class="c">'+esc(ci.phone||'')+'</div><div class="c mono">N° '+esc(op.num)+'</div>'+
'<div class="c"><b>'+T('وصل','Reçu')+' — '+(d>0?T('إرجاع','Remboursement'):d<0?T('دفعة جزئية','Paiement partiel'):T('أداء','Paiement'))+'</b></div><hr>'+
'<div class="l"><span>'+T('التاريخ','Date')+'</span><b>'+fmtD(op.date)+' '+esc(op.time||'')+'</b></div>'+
'<div class="l"><span>Agent</span><b>'+esc(op.user)+'</b></div>'+
'<div class="l"><span>'+T('الزبون','Client')+'</span><b>'+esc(op.client)+'</b></div>'+
(op.plate?'<div class="l"><span>Immat.</span><b class="mono">'+esc(op.plate)+'</b></div>':'')+
(op.police?'<div class="l"><span>Police</span><b class="mono">'+esc(op.police)+'</b></div>':'')+
'<div class="l"><span>'+T('التأمين','Assurance')+'</span><b>'+esc(op.desc)+'</b></div>'+
(op.ds?'<div class="l"><span>'+T('الفترة','Période')+'</span><b>'+fmtD(op.ds)+' → '+fmtD(op.de)+'</b></div>':'')+'<hr>'+
'<div class="l"><span>'+T('المستحق','Dû')+'</span><b>'+fmt(op.due)+' DH</b></div>'+
'<div class="l"><span>'+T('المدفوع','Payé')+'</span><b>'+fmt(op.paid)+' DH</b></div>'+
'<div class="l"><span>'+T('طريقة الدفع','Mode')+'</span><b>'+payLbl(op.payMode)+(op.payRef?' · '+esc(op.payRef):'')+'</b></div>'+
'<div class="tot"><span>'+(d>0?'↩️ '+T('المبلغ المُرجَع','Montant rendu'):d<0?'⚠️ '+T('الباقي المستحق','Reste dû'):'✅ '+T('الحساب مطابق','Compte soldé'))+'</span><b>'+fmt(Math.abs(d))+' DH</b></div>'+
'<div class="sign"><div>'+T('توقيع الوسيط','Signature agent')+'</div><div>'+T('توقيع الزبون','Signature client')+'</div></div>'+
'<div class="c" style="margin-top:10px">'+esc([ci.name,ci.phone,ci.addr].filter(Boolean).join(' · '))+'</div></div>';
docOpen(docBar('<button class="btn sm ok" data-wa="'+op.id+'">📱 WhatsApp</button>'),body);
}
function shareWA(op){
var ci=agency(),d=op.diff;
var t=[(ci.name||'EUR assurance'),'N° '+op.num,'Date: '+fmtD(op.date),'Client: '+op.client,'Assurance: '+op.desc,
op.ds?'Période: '+fmtD(op.ds)+' → '+fmtD(op.de):'','Dû: '+fmt(op.due)+' DH','Payé: '+fmt(op.paid)+' DH',
(d>0?'Rendu: ':d<0?'Reste dû: ':'Soldé: ')+fmt(Math.abs(d))+' DH',ci.phone?'Tél: '+ci.phone:''].filter(Boolean).join('\n');
window.open('https://wa.me/'+(op.phone?op.phone.replace(/\D/g,'').replace(/^0/,'212'):'')+'?text='+encodeURIComponent(t),'_blank');
}
function pieceCopy(op,ci){
var esp=r2(Math.min(op.paid,op.due)),rel=r2(Math.max(0,op.due-op.paid)),city=ci.city||'';
function f(l,v){return'<span class="pc-l">'+l+' :</span> '+v;}
return'<div class="pc"><div class="pc-head"><div>'+
'<div class="pc-co">'+esc(ci.name||'EUR-ASSURANCES SARL')+'</div>'+
(ci.addr2?'<div class="pc-sm">'+esc(ci.addr2)+(ci.ice?' - ICE':'')+'</div>':'')+(ci.ice?'<div class="pc-sm">'+esc(ci.ice)+'</div>':'')+
(ci.phone?'<div class="pc-sm">Tél : '+esc(ci.phone)+'</div>':'')+(city?'<div class="pc-sm" style="padding-left:16px">'+esc(city)+'</div>':'')+
'</div><div><div class="pc-tt">PIECE DE RECETTE</div><div class="pc-num">'+esc(op.pieceNum)+'</div></div></div>'+
'<div class="pc-r"><div class="pc-c w">'+f('Police N°',esc(op.police||'-'))+'</div><div class="pc-c">'+f('Usage',esc(op.usage||''))+'</div><div class="pc-c">'+(op.attest?f('Attestation',esc(op.attest)):'')+'</div></div>'+
(op.ds?'<div class="pc-r"><div class="pc-c w">'+f('Période de garantie du',fmtD(op.ds))+'</div><div class="pc-c"></div><div class="pc-c">'+f('Au',fmtD(op.de))+'</div></div>':'')+
'<div class="pc-r"><div class="pc-c w">'+f('Assuré',esc(op.client))+'</div></div>'+
'<div class="pc-r"><div class="pc-c w">'+f('Prime Totale',fmt(op.due))+'</div></div>'+
'<div class="pc-r"><div class="pc-c w">'+f(op.payMode==='cheque'?'Chèque':op.payMode==='tpe'?'TPE':'Espèces',fmt(esp))+'</div><div class="pc-c"></div><div class="pc-c">'+f('Reliquat',fmt(rel))+'</div></div>'+
'<div class="pc-foot">Fait à '+(city?esc(city)+', ':'')+'le '+fmtD(op.date)+' à '+esc(op.time||'')+'</div></div>';
}
function showPiece(op){
function render(o){var ci=agency(),c=pieceCopy(o,ci);docOpen(docBar(),'<div class="pc-wrap">'+c+'<div class="pc-sep"></div>'+c+'</div>');}
if(op.pieceNum){render(op);return;}
var start=parseInt(agency().pieceStart,10)||0;
Store.next('piece',start).then(function(r){
var o=Object.assign({},op,{pieceNum:pad(r.n,7)+(r.offline?'-H':'')});
Store.put('ops',o);render(o);
});
}

/* ───────── INIT ───────── */
function initCalc(){
$('cv-seg').innerHTML=[4,5,6,7,8,9,10,11,12,13,14].map(function(v){return'<button data-v="'+v+'">'+v+'</button>';}).join('');
$('ccv-seg').innerHTML=[6,7,8,9,10,11,12,13,14].map(function(v){return'<button data-v="'+v+'">'+v+'</button>';}).join('');
$('c-ds').value=isoToday();
$('pg-calc').addEventListener('click',function(e){
var b=e.target.closest('[data-seg] button');
if(b){var k=b.closest('[data-seg]').dataset.seg,v=b.dataset.v;S[k]=NUM_KEYS[k]?parseInt(v,10):v;
if(k==='tarif'||k==='dur'||k==='vtype')S.instSel=-1;
renderCalc();return;}
var ir=e.target.closest('[data-inst]');
if(ir){var i=parseInt(ir.dataset.inst,10);S.instSel=S.instSel===i?-1:i;renderCalc();}
});
$('pg-calc').addEventListener('input',function(e){if(e.target.id==='c-client')autofillClient();renderCalc();});
$('pg-calc').addEventListener('change',function(){renderCalc();});
$('c-plate').addEventListener('blur',function(){this.value=this.value.toUpperCase();});
$('c-valider').onclick=valider;
$('c-reset').onclick=function(){resetCalcForm();$('c-done').classList.add('hide');};
document.addEventListener('click',function(e){
var d=e.target.closest('[data-doc]');
if(d){var op=Store.get('ops',d.dataset.op);if(!op)return;if(d.dataset.doc==='recu')showRecu(op);else showPiece(op);return;}
var p=e.target.closest('[data-print]');if(p){doPrint(p.dataset.print);return;}
if(e.target.closest('[data-close-doc]')){$('doc').classList.remove('on');return;}
var w=e.target.closest('[data-wa]');if(w){var o=Store.get('ops',w.dataset.wa);if(o)shareWA(o);}
});
}
