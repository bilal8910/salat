/* ══════════════════════════════════════════════════════════
EUR assurance Pro 2.0 — pages.js
لوحة القيادة، السجل، الصندوق، الإعدادات
══════════════════════════════════════════════════════════ */
'use strict';

/* ───────── helpers ───────── */
function myOps(){var a=Store.all('ops');return CUR&&CUR.admin?a:a.filter(function(o){return o.userId===CUR.id;});}
function opsOn(list,iso){return list.filter(function(o){return o.date===iso;});}
/* المبلغ الذي دخل الصندوق فعلاً = المدفوع − ما أُرجع للزبون (إصلاح: الدين لا يُحسب كنقد) */
function cashIn(o){return o.payMode==='cash'?r2(o.paid-Math.max(0,o.diff)):0;}
function netIn(o){return r2(o.paid-Math.max(0,o.diff));}
function sum(list,fn){return r2(list.reduce(function(s,o){return s+(fn(o)||0);},0));}
function monthKey(iso){return String(iso).slice(0,7);}
function tarifLbl(k){return k==='direct'?T('دفع مباشر','Direct'):({wafa:'Wafa',tpv:'TPV',autre:'Autre'}[k]||k);}
function diffCell(d){return d>0?'<span class="pos">↩ '+fmt(d)+'</span>':d<0?'<span class="neg">⚠ '+fmt(-d)+'</span>':'<span class="muted">0,00</span>';}

/* ═════════ DASHBOARD ═════════ */
RENDER.dash=function(){
var all=myOps(),today=isoToday(),tOps=opsOn(all,today),mk=monthKey(today);
var mOps=all.filter(function(o){return monthKey(o.date)===mk;});
var sess=Store.get('cash',today);
var k=[
{c:'gd',l:T('رقم المعاملات اليوم','CA du jour'),v:fmtK(sum(tOps,function(o){return o.due;})),s:tOps.length+' '+T('عملية','opérations')},
{c:'g',l:T('نقداً اليوم','Espèces du jour'),v:fmtK(sum(tOps,cashIn)),s:T('صافي بعد الإرجاع','net après rendu')},
{c:'b',l:T('شيك / TPE اليوم','Chèque / TPE'),v:fmtK(sum(tOps.filter(function(o){return o.payMode!=='cash';}),netIn)),s:tOps.filter(function(o){return o.payMode!=='cash';}).length+' '+T('عملية','op.')},
{c:'a',l:T('مُرجَع للزبائن','Rendu aux clients'),v:fmtK(sum(tOps,function(o){return Math.max(0,o.diff);})),s:T('اليوم','aujourd\'hui')},
{c:'r',l:T('باقي على الزبائن','Reste dû clients'),v:fmtK(sum(tOps,function(o){return Math.max(0,-o.diff);})),s:T('اليوم','aujourd\'hui')},
{c:'',l:T('رقم المعاملات الشهر','CA du mois'),v:fmtK(sum(mOps,function(o){return o.due;})),s:mOps.length+' '+T('عملية','opérations')}
];
$('d-kpis').innerHTML=k.map(function(x){return'<div class="kpi '+x.c+'"><small>'+x.l+'</small><b>'+x.v+'</b><span>'+x.s+'</span></div>';}).join('');
/* chart 14 days */
var days=[],max=0,tot=0;
for(var i=13;i>=0;i--){var iso=addDays(today,-i),v=sum(opsOn(all,iso),function(o){return o.due;});days.push({iso:iso,v:v});if(v>max)max=v;tot+=v;}
$('d-chart').innerHTML=days.map(function(d){var h=max?Math.round(d.v/max*100):0;return'<div class="bar'+(d.iso===today?' today':'')+'" title="'+fmtD(d.iso)+' — '+fmt(d.v)+' DH"><em>'+(d.v?fmtK(d.v):'')+'</em><i style="height:'+h+'%"></i><small>'+d.iso.slice(8)+'/'+d.iso.slice(5,7)+'</small></div>';}).join('');
$('d-chart-tot').textContent=fmt(tot)+' DH';
/* recent */
var rec=all.slice().sort(function(a,b){return(b.ts||0)-(a.ts||0);}).slice(0,8);
$('d-recent').innerHTML=rec.length?rec.map(function(o){return'<div class="lrow"><span><span class="muted mono" style="font-size:10.5px">'+esc(o.time||'')+' · '+fmtD(o.date).slice(0,5)+'</span> <b style="font-family:inherit">'+esc(o.client)+'</b> <span class="muted">· '+esc(o.desc)+'</span></span><span><b>'+fmt(o.due)+'</b> '+(o.diff<0?'<span class="badge r">'+T('دين','dû')+'</span>':'')+'</span></div>';}).join(''):'<div class="empty">'+T('لا توجد عمليات بعد','Aucune opération')+'</div>';
/* cash */
var ops=opsOn(Store.all('ops'),today);
if(sess&&sess.openBal!=null){
var exp=cashExpected(today);
$('d-cash').innerHTML='<div class="lrow"><span>'+T('رصيد الافتتاح','Ouverture')+'</span><b>'+fmt(sess.openBal)+'</b></div><div class="lrow"><span>'+T('نقداً (عمليات)','Espèces (opérations)')+'</span><b>'+fmt(sum(ops,cashIn))+'</b></div><div class="lrow"><span>'+T('حركات الصندوق','Mouvements')+'</span><b>'+fmt(movesNet(today))+'</b></div><div class="lrow"><span><b style="font-family:inherit">'+T('الرصيد المتوقع','Solde attendu')+'</b></span><b style="color:var(--navy);font-size:14px">'+fmt(exp)+' DH</b></div>'+(sess.closed?'<div class="status ok">🔒 '+T('اليوم مغلق','Journée clôturée')+'</div>':'');
}else $('d-cash').innerHTML='<div class="empty">'+T('الصندوق غير مفتوح اليوم','Caisse non ouverte')+'<br><button class="btn sm pri" style="margin-top:6px" data-go="caisse">'+T('فتح الصندوق','Ouvrir la caisse')+'</button></div>';
/* tarif month */
var bt={},bmax=0;mOps.forEach(function(o){bt[o.tarif]=(bt[o.tarif]||0)+(o.due||0);});
Object.keys(bt).forEach(function(x){if(bt[x]>bmax)bmax=bt[x];});
$('d-tarif').innerHTML=Object.keys(bt).length?Object.keys(bt).sort(function(a,b){return bt[b]-bt[a];}).map(function(x){return'<div class="hbar"><div class="hbar-top"><span>'+esc(tarifLbl(x))+'</span><b>'+fmt(bt[x])+'</b></div><div class="hbar-t"><i style="width:'+Math.round(bt[x]/bmax*100)+'%"></i></div></div>';}).join(''):'<div class="empty">—</div>';
/* agents month */
var ba={};mOps.forEach(function(o){var u=o.user||'?';if(!ba[u])ba[u]={v:0,n:0,av:o.av||'👤'};ba[u].v+=o.due||0;ba[u].n++;});
var ak=Object.keys(ba).sort(function(a,b){return ba[b].v-ba[a].v;});
$('d-agents').innerHTML=ak.length?ak.map(function(u,i){return'<div class="lrow"><span>'+(i===0?'🏆 ':'')+esc(ba[u].av)+' '+esc(u)+' <span class="muted">('+ba[u].n+')</span></span><b>'+fmt(ba[u].v)+'</b></div>';}).join(''):'<div class="empty">—</div>';
};

/* ═════════ HISTORY ═════════ */
var HF='today';
function histList(){
var list=myOps(),q=$('h-q').value.trim().toLowerCase(),ag=$('h-agent').value,dp=$('h-date').value,today=isoToday();
return list.filter(function(o){
if(dp){if(o.date!==dp)return false;}
else if(HF==='today'){if(o.date!==today)return false;}
else if(HF==='week'){if(o.date<addDays(today,-6))return false;}
else if(HF==='month'){if(monthKey(o.date)!==monthKey(today))return false;}
if(ag&&o.userId!==ag)return false;
if(q&&[o.num,o.client,o.plate,o.police,o.attest,o.desc,o.user,o.phone,o.pieceNum].join(' ').toLowerCase().indexOf(q)<0)return false;
return true;
}).sort(function(a,b){return(b.ts||0)-(a.ts||0);});
}
RENDER.hist=function(){
document.querySelectorAll('[data-hf] button').forEach(function(b){b.classList.toggle('on',!$('h-date').value&&b.dataset.v===HF);});
var agSel=$('h-agent'),cur=agSel.value,ags={};
Store.all('ops').forEach(function(o){if(o.userId)ags[o.userId]=o.user;});
agSel.innerHTML='<option value="">👤 '+T('كل الموظفين','Tous les agents')+'</option>'+Object.keys(ags).map(function(id){return'<option value="'+esc(id)+'">'+esc(ags[id])+'</option>';}).join('');
agSel.value=cur;
var L=histList();
$('h-sum').innerHTML='<span>'+T('العمليات','Opérations')+': <b>'+L.length+'</b></span><span>'+T('المستحق','Dû')+': <b>'+fmt(sum(L,function(o){return o.due;}))+'</b></span><span>'+T('المحصّل','Encaissé')+': <b>'+fmt(sum(L,netIn))+'</b></span><span class="pos">'+T('مُرجَع','Rendu')+': <b>'+fmt(sum(L,function(o){return Math.max(0,o.diff);}))+'</b></span><span class="neg">'+T('باقي','Reste dû')+': <b>'+fmt(sum(L,function(o){return Math.max(0,-o.diff);}))+'</b></span>';
var adm=CUR.admin;
$('h-body').innerHTML=L.length?L.map(function(o){
return'<tr><td class="mono" style="font-size:11px">'+esc(o.num)+'</td><td>'+fmtD(o.date)+' <span class="muted">'+esc(o.time||'')+'</span></td>'+(adm?'<td>'+esc(o.av||'')+' '+esc(o.user)+'</td>':'')+
'<td><b>'+esc(o.client)+'</b>'+(o.phone?' <span class="muted">'+esc(o.phone)+'</span>':'')+'</td><td class="mono">'+esc(o.plate||'—')+'</td>'+
'<td>'+esc(o.desc)+' '+(o.payMode!=='cash'?'<span class="badge b">'+(o.payMode==='cheque'?'CHQ':'TPE')+'</span>':'')+'</td>'+
'<td class="n">'+fmt(o.due)+'</td><td class="n">'+fmt(o.paid)+'</td><td class="n">'+diffCell(o.diff)+'</td>'+
'<td>'+(o.pieceNum?'<span class="badge g mono">'+esc(o.pieceNum)+'</span>':'')+'</td>'+
'<td><div class="acts-c"><button class="btn sm" data-doc="recu" data-op="'+o.id+'" title="Reçu">🖨️</button><button class="btn sm" data-doc="piece" data-op="'+o.id+'" title="Pièce">🧾</button><button class="btn sm" data-edit="'+o.id+'" title="Modifier">✏️</button>'+(adm?'<button class="btn sm dng" data-del="'+o.id+'" title="Supprimer">🗑️</button>':'')+'</div></td></tr>';
}).join(''):'<tr><td colspan="11"><div class="empty">'+T('لا توجد عمليات','Aucune opération')+'</div></td></tr>';
};
function editOp(id){
var o=Store.get('ops',id);if(!o)return;
function f(k,l,cls){return'<div class="f"><label>'+l+'</label><input id="e-'+k+'" class="'+(cls||'')+'" value="'+esc(o[k]||'')+'"></div>';}
openModal('<h3>✏️ '+esc(o.num)+'</h3><div class="hint">'+T('المبالغ لا تُعدَّل — لتصحيح مبلغ احذف العملية وأعد إدخالها','Les montants ne sont pas modifiables')+'</div>'+
f('client',T('الزبون','Client'))+'<div class="row">'+f('phone',T('الهاتف','Téléphone'))+f('plate','Immat.','mono')+'</div><div class="row">'+f('police','Police','mono')+f('attest','Attestation','mono')+'</div>'+
'<div class="modal-acts"><button class="btn" onclick="closeModal()">'+T('إلغاء','Annuler')+'</button><button class="btn pri" id="e-save">'+T('حفظ','Enregistrer')+'</button></div>');
$('e-save').onclick=function(){
var n=Object.assign({},o);['client','phone','plate','police','attest'].forEach(function(k){n[k]=$('e-'+k).value.trim();});
n.plate=n.plate.toUpperCase();
if(!n.client){toast(T('الاسم مطلوب','Nom requis'),1);return;}
n.editedBy=CUR.name;n.editedAt=Date.now();Store.put('ops',n);closeModal();toast(T('تم الحفظ','Enregistré'));
};
}
function exportCSV(){
var L=histList();if(!L.length){toast(T('لا توجد بيانات','Aucune donnée'),1);return;}
var rows=[['N°','Date','Heure','Agent','Client','Tel','Immat','Police','Attestation','Assurance','Du','Paye','Ecart','Mode','Ref','Piece'].join(';')];
L.forEach(function(o){rows.push([o.num,fmtD(o.date),o.time,o.user,o.client,o.phone,o.plate,o.police,o.attest,o.desc,String(o.due).replace('.',','),String(o.paid).replace('.',','),String(o.diff).replace('.',','),o.payMode,o.payRef,o.pieceNum].map(function(v){return'"'+String(v==null?'':v).replace(/"/g,'""')+'"';}).join(';'));});
download('operations-'+isoToday()+'.csv','\uFEFF'+rows.join('\n'),'text/csv;charset=utf-8');
}

/* ═════════ CAISSE ═════════ */
var CS_DATE=null;
function movesOn(iso){return Store.all('moves').filter(function(m){return m.date===iso;}).sort(function(a,b){return(a.ts||0)-(b.ts||0);});}
function movesNet(iso){return sum(movesOn(iso),function(m){return m.type==='in'?m.amount:-m.amount;});}
function cashExpected(iso){var s=Store.get('cash',iso);return r2((s&&s.openBal!=null?num(s.openBal):0)+sum(opsOn(Store.all('ops'),iso),cashIn)+movesNet(iso));}
RENDER.caisse=function(){
var d=CS_DATE||isoToday();CS_DATE=d;$('cs-date').value=d;$('cs-date').max=isoToday();
var s=Store.get('cash',d),today=d===isoToday(),adm=CUR.admin;
var closed=!!(s&&s.closed),editable=!closed&&(today||adm);
$('cs-state').className='badge '+(closed?'g':s&&s.openBal!=null?'b':'a');
$('cs-state').textContent=closed?'🔒 '+T('مغلق','Clôturée'):s&&s.openBal!=null?T('مفتوح','Ouverte'):T('غير مفتوح','Non ouverte');
var b=$('cs-body');
if(!s||s.openBal==null){
b.innerHTML=editable?'<div class="card" style="max-width:380px;margin:20px auto"><div class="card-h">🗄️ '+T('فتح الصندوق','Ouverture de caisse')+' — '+fmtD(d)+'</div><div class="card-b"><div class="f"><label>'+T('رصيد البداية (DH)','Solde de départ (DH)')+'</label><input type="number" id="cs-open-amt" step="0.01" class="num" style="font-size:16px"></div><button class="btn pri w" id="cs-open">✅ '+T('فتح','Ouvrir')+'</button></div></div>'
:'<div class="empty">'+T('لم يُفتح الصندوق في هذا اليوم','Caisse non ouverte ce jour')+(adm?'':' — '+T('التعديل للمسؤول فقط','modification réservée à l\'admin'))+'</div>';
return;
}
var ops=opsOn(Store.all('ops'),d),cashOps=ops.filter(function(o){return o.payMode==='cash';}),mv=movesOn(d),exp=cashExpected(d);
var html='<div class="cs-grid">'+
'<div class="kpi"><small>'+T('رصيد الافتتاح','Ouverture')+'</small><b>'+fmt(s.openBal)+'</b><span>'+esc(s.openedBy||'')+' '+esc(s.openedAt||'')+'</span></div>'+
'<div class="kpi g"><small>'+T('نقداً (عمليات)','Espèces opérations')+'</small><b>'+fmt(sum(cashOps,cashIn))+'</b><span>'+cashOps.length+' '+T('عملية','op.')+'</span></div>'+
'<div class="kpi '+(movesNet(d)<0?'r':'b')+'"><small>'+T('حركات الصندوق','Mouvements')+'</small><b>'+fmt(movesNet(d))+'</b><span>'+mv.length+' '+T('حركة','mvt')+'</span></div>'+
'<div class="kpi gd"><small>'+T('الرصيد المتوقع','Solde attendu')+'</small><b>'+fmt(exp)+'</b><span>'+T('غير نقدي','Hors espèces')+': '+fmt(sum(ops.filter(function(o){return o.payMode!=='cash';}),netIn))+'</span></div></div>';
html+='<div class="dash-grid"><div>';
/* ops of day */
html+='<div class="card"><div class="card-h">📋 '+T('عمليات اليوم','Opérations du jour')+' <small>'+ops.length+'</small></div><div class="card-b" style="padding-top:2px;padding-bottom:2px">'+(ops.length?ops.sort(function(a,b){return(a.ts||0)-(b.ts||0);}).map(function(o){return'<div class="lrow"><span><span class="muted mono" style="font-size:10.5px">'+esc(o.time)+'</span> '+esc(o.client)+' <span class="muted">· '+esc(o.user)+'</span> '+(o.payMode!=='cash'?'<span class="badge b">'+(o.payMode==='cheque'?'CHQ':'TPE')+'</span>':'')+'</span><b>'+fmt(o.payMode==='cash'?cashIn(o):netIn(o))+'</b></div>';}).join(''):'<div class="empty">—</div>')+'</div></div>';
html+='</div><div>';
/* moves */
html+='<div class="card"><div class="card-h">💸 '+T('حركات الصندوق (سلف / مصاريف)','Mouvements (avances / dépenses)')+'</div><div class="card-b">';
if(editable)html+='<div class="row"><div class="f"><select id="mv-type"><option value="out">➖ '+T('خروج','Sortie')+'</option><option value="in">➕ '+T('دخول','Entrée')+'</option></select></div><div class="f"><input type="number" id="mv-amt" step="0.01" class="num" placeholder="DH"></div></div><div class="row"><div class="f"><input id="mv-person" placeholder="'+T('الاسم','Nom')+'"></div><div class="f"><input id="mv-reason" placeholder="'+T('السبب','Motif')+'"></div></div><button class="btn w" id="mv-add">➕ '+T('إضافة','Ajouter')+'</button>';
html+=(mv.length?mv.map(function(m){return'<div class="lrow"><span>'+(m.type==='in'?'➕':'➖')+' '+esc([m.person,m.reason].filter(Boolean).join(' — ')||'—')+' <span class="muted">('+esc(m.time)+' · '+esc(m.user)+')</span></span><span><b class="'+(m.type==='in'?'pos':'neg')+'">'+(m.type==='in'?'+':'−')+fmt(m.amount)+'</b>'+(editable&&adm?' <button class="btn sm dng" data-mvdel="'+m.id+'">🗑️</button>':'')+'</span></div>';}).join(''):'<div class="empty">'+T('لا توجد حركات','Aucun mouvement')+'</div>');
html+='</div></div>';
/* inventory */
html+='<div class="card"><div class="card-h">📦 '+T('جرد الصندوق','Inventaire')+'</div><div class="card-b"><div class="lrow"><span>'+T('المتوقع','Attendu')+'</span><b>'+fmt(exp)+'</b></div>';
if(editable)html+='<div class="row" style="margin-top:6px"><div class="f"><input type="number" id="cs-count" step="0.01" class="num" placeholder="'+T('المبلغ الموجود','Montant compté')+'" value="'+(s.counted!=null?s.counted:'')+'"></div><button class="btn pri" id="cs-count-go" style="height:31px">🧮 '+T('جرد','Compter')+'</button></div>';
else html+='<div class="lrow"><span>'+T('الموجود','Compté')+'</span><b>'+(s.counted!=null?fmt(s.counted):'—')+'</b></div>';
if(s.counted!=null){var df=r2(s.counted-exp);html+='<div class="status '+(Math.abs(df)<.01?'ok':df>0?'over':'short')+'">'+(Math.abs(df)<.01?'✅ '+T('مطابق','Conforme'):df>0?'🔵 '+T('فائض','Excédent')+' +'+fmt(df):'🔴 '+T('عجز','Déficit')+' −'+fmt(-df))+'</div>';}
if(adm&&!closed)html+='<button class="btn dng w" id="cs-close" style="margin-top:8px">🔒 '+T('إغلاق اليوم','Clôturer la journée')+'</button>';
if(adm&&closed)html+='<button class="btn w" id="cs-reopen" style="margin-top:8px">🔓 '+T('إعادة فتح اليوم','Rouvrir la journée')+'</button>';
html+='</div></div></div></div>';
b.innerHTML=html;
};
function csAction(e){
var d=CS_DATE,s=Store.get('cash',d);
var t=e.target.closest('button');if(!t)return;
if(t.id==='cs-open'){var v=num($('cs-open-amt').value);if($('cs-open-amt').value===''||v<0){toast(T('مبلغ غير صحيح','Montant invalide'),1);return;}Store.put('cash',{id:d,openBal:v,openedBy:CUR.name,openedAt:nowTime(),counted:null,closed:false});}
else if(t.id==='mv-add'){var a=num($('mv-amt').value),p=$('mv-person').value.trim(),r=$('mv-reason').value.trim();if(!(a>0)){toast(T('مبلغ غير صحيح','Montant invalide'),1);return;}if(!p&&!r){toast(T('أدخل الاسم أو السبب','Nom ou motif requis'),1);return;}Store.put('moves',{id:uid(),date:d,time:nowTime(),ts:Date.now(),type:$('mv-type').value,amount:a,person:p,reason:r,user:CUR.name});}
else if(t.dataset.mvdel){if(confirm(T('حذف الحركة؟','Supprimer ?')))Store.del('moves',t.dataset.mvdel);}
else if(t.id==='cs-count-go'){var c=$('cs-count').value;if(c===''){toast(T('أدخل المبلغ','Saisissez le montant'),1);return;}Store.put('cash',Object.assign({},s,{counted:num(c),countedBy:CUR.name,countedAt:nowTime()}));}
else if(t.id==='cs-close'){if(!confirm(T('إغلاق اليوم نهائياً؟','Clôturer la journée ?')))return;Store.put('cash',Object.assign({},s,{closed:true,closedBy:CUR.name,closedAt:nowTime(),counted:s.counted!=null?s.counted:cashExpected(d)}));}
else if(t.id==='cs-reopen'){if(confirm(T('إعادة فتح اليوم؟','Rouvrir ?')))Store.put('cash',Object.assign({},s,{closed:false}));}
}

/* ═════════ SETTINGS ═════════ */
var ST='prices';
var PRICE_GROUPS=[
{t:['⛽ بنزين — سنة','⛽ Essence — 1 an'],k:[['e1','≤6 CV'],['e2','7-8 CV'],['e3','9-10 CV'],['e4','11+ CV']]},
{t:['🛢️ ديزل — سنة','🛢️ Diesel — 1 an'],k:[['d1','≤5 CV'],['d2','6-7 CV'],['d3','8+ CV']]},
{t:['🏍️ دراجة — سنة','🏍️ Moto — 1 an'],k:[['m_le50','≤50cc'],['m_mid','51-125cc'],['m_ge126','≥126cc']]},
{t:['🚐 تجاري / 🚛 شاحنة — سنة','🚐 Comm. / 🚛 Camion — 1 an'],k:[['comm','Comm.'],['t35','−3.5T'],['t12','12T'],['t14','14T']]},
{t:['📐 معاملات المدة (من السعر السنوي)','📐 Coefficients de durée'],k:[['mult1','1 mois'],['mult3','3 mois'],['mult6','6 mois'],['mult12','1 an']]},
{t:['🧾 رسوم','🧾 Frais'],k:[['timbre','Timbre'],['instfee','Échelonnement / تقسيط']]}
];
var TPV_GROUPS=[
{t:['🚛 Camion'],k:[['tpv_camion_5j','5j'],['tpv_camion_10j','10j']]},
{t:['🚚 Camion + remorque'],k:[['tpv_remorque_5j','5j'],['tpv_remorque_10j','10j']]},
{t:['🚗 Tourisme'],k:[['tpv_tourisme_5j','5j'],['tpv_tourisme_10j','10j'],['tpv_tourisme_1m','1 mois'],['tpv_tourisme_3m','3 mois']]},
{t:['🚕 Taxi'],k:[['cnpac','CNPAC / tranche'],['taxi2_tax','Tax % (simplifié)'],['taxi2_para','Parafiscale %']]}
];
function priceForm(groups){
return groups.map(function(g){return'<div class="sec-t">'+(g.t.length>1?T(g.t[0],g.t[1]):g.t[0])+'</div><div class="pgrid">'+g.k.map(function(k){return'<div class="f"><label>'+esc(k[1])+'</label><input type="number" step="0.01" class="num" data-pk="'+k[0]+'" value="'+P(k[0])+'"></div>';}).join('')+'</div>';}).join('')+
'<div style="display:flex;gap:6px"><button class="btn pri" data-act="save-prices">💾 '+T('حفظ الأسعار','Enregistrer')+'</button><button class="btn ghost" data-act="reset-prices">↺ '+T('القيم الافتراضية لهذه الصفحة','Valeurs par défaut')+'</button></div>'+
'<div class="hint" style="margin-top:8px">'+T('⚠️ القيم الافتراضية تقديرية — تحقق منها مع الأسعار الرسمية. الأسعار تتزامن مع كل الأجهزة.','⚠️ Valeurs par défaut indicatives — vérifiez-les. Les prix sont synchronisés.')+'</div>';
}
RENDER.settings=function(){
document.querySelectorAll('[data-st] button').forEach(function(b){b.classList.toggle('on',b.dataset.v===ST);});
var b=$('st-body'),h='';
if(ST==='prices')h=priceForm(PRICE_GROUPS);
else if(ST==='tpv')h=priceForm(TPV_GROUPS);
else if(ST==='autre'){
var cats=autreList();
h='<div class="hint">'+T('أضف فئات ومدد بحرية. "الأيام" اختيارية لحساب تاريخ الانتهاء تلقائياً. التعديلات تُحفظ عند مغادرة الحقل.','Catégories et durées libres. « Jours » optionnel pour la date de fin. Enregistrement automatique.')+'</div>'+
cats.map(function(c){return'<div class="cat"><div style="display:flex;gap:6px;margin-bottom:6px"><input class="in" style="font-weight:800" data-cat="'+esc(c.id)+'" data-cf="name" value="'+esc(c.name)+'"><button class="btn sm dng" data-act="delcat" data-cat="'+esc(c.id)+'">🗑️</button></div>'+
'<div class="cat-row lbl" style="margin-bottom:2px"><span>'+T('المدة','Durée')+'</span><span>DH</span><span>'+T('أيام','Jours')+'</span><span></span></div>'+
(c.durations||[]).map(function(d,i){return'<div class="cat-row"><input class="in" data-cat="'+esc(c.id)+'" data-di="'+i+'" data-df="label" value="'+esc(d.label)+'"><input class="in num" type="number" step="0.01" data-cat="'+esc(c.id)+'" data-di="'+i+'" data-df="price" value="'+esc(d.price)+'"><input class="in" type="number" data-cat="'+esc(c.id)+'" data-di="'+i+'" data-df="days" value="'+esc(d.days||'')+'"><button class="btn sm dng" data-act="deldur" data-cat="'+esc(c.id)+'" data-di="'+i+'">✕</button></div>';}).join('')+
'<button class="btn sm" data-act="adddur" data-cat="'+esc(c.id)+'">➕ '+T('مدة','Durée')+'</button></div>';}).join('')+
'<button class="btn pri" data-act="addcat">➕ '+T('فئة جديدة','Nouvelle catégorie')+'</button>';
}
else if(ST==='agency'){
var a=agency();
function af(k,l,ph){return'<div class="f"><label>'+l+'</label><input data-ak="'+k+'" value="'+esc(a[k]||'')+'" placeholder="'+esc(ph||'')+'"></div>';}
h='<div style="max-width:560px">'+af('name',T('اسم الوكالة','Nom agence'),'EUR-ASSURANCES SARL')+'<div class="row">'+af('phone',T('الهاتف','Téléphone'),'0539 39 00 42')+af('city',T('المدينة (Fait à)','Ville (Fait à)'),'KSAR SGHIR')+'</div>'+
af('addr2',T('العنوان الكامل (وصل القبض)','Adresse complète (pièce)'))+af('addr',T('عنوان مختصر (الوصل)','Adresse courte (reçu)'))+'<div class="row">'+af('ice','ICE')+af('pieceStart',T('بداية ترقيم وصل القبض','Début numérotation pièce'),'59766')+'</div>'+
'<button class="btn pri" data-act="save-agency">💾 '+T('حفظ','Enregistrer')+'</button></div>';
}
else if(ST==='users'){
var us=Store.all('users').sort(function(x,y){return String(x.name).localeCompare(String(y.name));});
h='<div style="max-width:560px">'+(us.length?us.map(function(u){return'<div class="lrow"><span>'+esc(u.av||'👤')+' <b style="font-family:inherit">'+esc(u.name)+'</b></span><button class="btn sm dng" data-act="deluser" data-uid="'+esc(u.id)+'">🗑️</button></div>';}).join(''):'<div class="empty">'+T('لا يوجد مستخدمون','Aucun utilisateur')+'</div>')+
'<div class="sec-t">➕ '+T('مستخدم جديد','Nouvel utilisateur')+'</div><div style="display:flex;gap:6px"><select class="in" id="nu-av" style="width:64px">'+AVATARS.map(function(v){return'<option>'+v+'</option>';}).join('')+'</select><input class="in" id="nu-name" placeholder="'+T('الاسم','Nom')+'"><button class="btn pri" data-act="adduser">'+T('إضافة','Ajouter')+'</button></div></div>';
}
else if(ST==='security'){
var sec=Store.doc('security');
h='<div style="max-width:420px"><div class="sec-t">🔑 '+T('تغيير كلمة سر المسؤول','Changer le mot de passe admin')+'</div>'+
'<div class="f"><input type="password" class="in" id="sp-old" placeholder="'+T('كلمة السر الحالية','Mot de passe actuel')+'"></div><div class="f"><input type="password" class="in" id="sp-new" placeholder="'+T('الجديدة (4 أحرف+)','Nouveau (4 car.+)')+'"></div><div class="f"><input type="password" class="in" id="sp-new2" placeholder="'+T('تأكيد','Confirmer')+'"></div>'+
'<button class="btn pri" data-act="save-pwd">💾 '+T('تغيير','Changer')+'</button>'+
'<div class="sec-t">⏱️ '+T('القفل التلقائي','Verrouillage auto')+'</div><div style="display:flex;gap:6px"><select class="in" id="sp-lock">'+[5,10,15,30,60,120].map(function(m){return'<option value="'+m+'"'+(lockMin()===m?' selected':'')+'>'+m+' min</option>';}).join('')+'</select><button class="btn" data-act="save-lock">💾</button></div>'+
'<div class="hint" style="margin-top:10px">'+T('كلمة السر محفوظة كبصمة مشفّرة (SHA-256) وليست نصاً صريحاً. للحماية الكاملة يجب أيضاً ضبط قواعد الأمان في Firebase.','Mot de passe stocké en empreinte SHA-256. Pour une protection complète, configurez aussi les règles Firebase.')+'</div></div>';
}
b.innerHTML=h;
};
function stAction(e){
var t=e.target.closest('[data-act]');if(!t)return;var a=t.dataset.act;
if(a==='save-prices'){var p=Object.assign({},Store.doc('prices'));document.querySelectorAll('#st-body [data-pk]').forEach(function(i){p[i.dataset.pk]=i.value===''?'':num(i.value);});Store.setDoc('prices',p);toast(T('تم حفظ الأسعار','Prix enregistrés'));}
else if(a==='reset-prices'){if(!confirm(T('إرجاع القيم الافتراضية لهذه الصفحة؟','Rétablir les valeurs par défaut ?')))return;var p2=Object.assign({},Store.doc('prices'));document.querySelectorAll('#st-body [data-pk]').forEach(function(i){delete p2[i.dataset.pk];});Store.setDoc('prices',p2);}
else if(a==='save-agency'){var ag=Object.assign({},agency());document.querySelectorAll('#st-body [data-ak]').forEach(function(i){ag[i.dataset.ak]=i.value.trim();});Store.setDoc('agency',ag);toast(T('تم الحفظ','Enregistré'));}
else if(a==='adduser'){var n=$('nu-name').value.trim();if(!n)return;if(Store.all('users').some(function(u){return u.name.toLowerCase()===n.toLowerCase();})){toast(T('الاسم موجود','Nom déjà utilisé'),1);return;}Store.put('users',{id:uid(),name:n,av:$('nu-av').value});}
else if(a==='deluser'){var u=Store.get('users',t.dataset.uid);if(u&&confirm(T('حذف ','Supprimer ')+u.name+' ?'))Store.del('users',u.id);}
else if(a==='addcat'){var list=autreList();Store.put('autre',{id:uid(),name:T('فئة جديدة','Nouvelle catégorie'),order:list.length,durations:[]});}
else if(a==='delcat'){if(confirm(T('حذف الفئة؟','Supprimer la catégorie ?')))Store.del('autre',t.dataset.cat);}
else if(a==='adddur'){var c=Store.get('autre',t.dataset.cat);if(!c)return;var c2=Object.assign({},c,{durations:(c.durations||[]).concat([{id:uid(),label:T('مدة','Durée'),price:0,days:''}])});Store.put('autre',c2);}
else if(a==='deldur'){var c3=Store.get('autre',t.dataset.cat);if(!c3)return;var ds=(c3.durations||[]).slice();ds.splice(parseInt(t.dataset.di,10),1);Store.put('autre',Object.assign({},c3,{durations:ds}));}
else if(a==='save-pwd'){var sec=Store.doc('security'),o=$('sp-old').value,n1=$('sp-new').value,n2=$('sp-new2').value;
if(sha256((sec.salt||'')+o)!==sec.hash){toast(T('كلمة السر الحالية غير صحيحة','Mot de passe actuel incorrect'),1);return;}
if(n1.length<4||n1!==n2){toast(T('الجديدة غير صالحة أو غير متطابقة','Nouveau mot de passe invalide'),1);return;}
var salt=uid();Store.setDoc('security',Object.assign({},sec,{hash:sha256(salt+n1),salt:salt}));toast(T('تم تغيير كلمة السر','Mot de passe changé'));}
else if(a==='save-lock'){Store.setDoc('security',Object.assign({},Store.doc('security'),{lockMin:parseInt($('sp-lock').value,10)}));toast(T('تم الحفظ','Enregistré'));}
}
function stChange(e){
var i=e.target;
if(i.dataset.cat&&i.dataset.cf){var c=Store.get('autre',i.dataset.cat);if(c)Store.put('autre',Object.assign({},c,{name:i.value.trim()||c.name}));}
else if(i.dataset.cat&&i.dataset.df){var c2=Store.get('autre',i.dataset.cat);if(!c2)return;var ds=(c2.durations||[]).map(function(d){return Object.assign({},d);}),d=ds[parseInt(i.dataset.di,10)];if(!d)return;
d[i.dataset.df]=i.dataset.df==='label'?i.value.trim():i.value===''?'':num(i.value);Store.put('autre',Object.assign({},c2,{durations:ds}));}
}

/* ═════════ INIT ═════════ */
function initPages(){
document.querySelector('[data-hf]').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;HF=b.dataset.v;$('h-date').value='';RENDER.hist();});
$('h-date').addEventListener('change',RENDER.hist);
$('h-q').addEventListener('input',RENDER.hist);
$('h-agent').addEventListener('change',RENDER.hist);
$('h-csv').onclick=exportCSV;
$('h-body').addEventListener('click',function(e){
var ed=e.target.closest('[data-edit]');if(ed){editOp(ed.dataset.edit);return;}
var dl=e.target.closest('[data-del]');if(dl&&CUR.admin){var o=Store.get('ops',dl.dataset.del);if(o&&confirm(T('حذف العملية ','Supprimer ')+o.num+' ?'))Store.del('ops',o.id);}
});
$('cs-today').onclick=function(){CS_DATE=isoToday();RENDER.caisse();};
$('cs-prev').onclick=function(){CS_DATE=addDays(CS_DATE||isoToday(),-1);RENDER.caisse();};
$('cs-next').onclick=function(){var n=addDays(CS_DATE||isoToday(),1);if(n<=isoToday()){CS_DATE=n;RENDER.caisse();}};
$('cs-date').addEventListener('change',function(){if(this.value){CS_DATE=this.value>isoToday()?isoToday():this.value;RENDER.caisse();}});
$('cs-body').addEventListener('click',csAction);
document.querySelector('[data-st]').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;ST=b.dataset.v;RENDER.settings();});
$('st-body').addEventListener('click',stAction);
$('st-body').addEventListener('change',stChange);
}
