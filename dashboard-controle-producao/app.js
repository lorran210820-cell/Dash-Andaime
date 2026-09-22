const state={all:[],filtered:[],page:1,pageSize:15,charts:{}};
const $=s=>document.querySelector(s);
const nf=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1});
const df=new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC'});
const sum=(a,k)=>a.reduce((t,x)=>t+(Number(x[k])||0),0);
const group=(rows,key)=>rows.reduce((m,r)=>{(m[r[key]]??=[]).push(r);return m},{});
const weekNumber=s=>Number(String(s).replace(/\D/g,''))||0;
const pct=(a,b)=>b?`${nf.format(a/b*100)}%`:'0%';

Chart.defaults.font.family='Inter, sans-serif';Chart.defaults.color='#6e7f91';Chart.defaults.borderColor='#e7edf2';

fetch('data/production.json').then(r=>r.json()).then(data=>{
  state.all=data.records.filter(r=>r.nome&&r.semana);
  initFilters(); applyFilters();
}).catch(()=>document.body.insertAdjacentHTML('beforeend','<div class="load-error">Não foi possível carregar os dados. Publique a pasta em um servidor ou no GitHub Pages.</div>'));

function initFilters(){
  const weeks=[...new Set(state.all.map(r=>r.semana))].sort((a,b)=>weekNumber(a)-weekNumber(b));
  const leaders=[...new Set(state.all.map(r=>r.nome))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  $('#weekFilter').insertAdjacentHTML('beforeend',weeks.map(v=>`<option>${v}</option>`).join(''));
  $('#leaderFilter').insertAdjacentHTML('beforeend',leaders.map(v=>`<option>${v}</option>`).join(''));
  const dates=state.all.map(r=>r.data).filter(Boolean).sort();
  if(dates.length){$('#dateStart').min=dates[0];$('#dateStart').max=dates.at(-1);$('#dateEnd').min=dates[0];$('#dateEnd').max=dates.at(-1);$('#lastDate').textContent=df.format(new Date(dates.at(-1)+'T00:00:00Z'));}
  ['weekFilter','leaderFilter','dateStart','dateEnd'].forEach(id=>$('#'+id).addEventListener('change',()=>{state.page=1;applyFilters()}));
  $('#clearFilters').addEventListener('click',()=>{$('#weekFilter').value='all';$('#leaderFilter').value='all';$('#dateStart').value='';$('#dateEnd').value='';$('#searchInput').value='';state.page=1;applyFilters()});
  $('#searchInput').addEventListener('input',()=>{state.page=1;renderTable()});
  $('#prevPage').addEventListener('click',()=>{if(state.page>1){state.page--;renderTable()}});
  $('#nextPage').addEventListener('click',()=>{const p=Math.ceil(searchedRows().length/state.pageSize);if(state.page<p){state.page++;renderTable()}});
  $('#downloadCsv').addEventListener('click',downloadCsv);
}

function applyFilters(){
  const w=$('#weekFilter').value,l=$('#leaderFilter').value,start=$('#dateStart').value,end=$('#dateEnd').value;
  state.filtered=state.all.filter(r=>(w==='all'||r.semana===w)&&(l==='all'||r.nome===l)&&(!start||r.data>=start)&&(!end||r.data<=end));
  renderKpis();renderCharts();renderRanking();renderTable();
}

function renderKpis(){
  const r=state.filtered,total=sum(r,'total'),assembly=sum(r,'montagem'),disassembly=sum(r,'desmontagem'),hours=sum(r,'hhTotal'),people=sum(r,'presente');
  $('#kpiTotal').textContent=nf.format(total);$('#kpiAssembly').textContent=nf.format(assembly);$('#kpiDisassembly').textContent=nf.format(disassembly);$('#kpiHours').textContent=nf.format(hours);$('#kpiProductivity').textContent=nf.format(hours?total/hours:0);$('#kpiPeople').textContent=nf.format(people);$('#assemblyShare').textContent=`${pct(assembly,total)} do total`;$('#disassemblyShare').textContent=`${pct(disassembly,total)} do total`;$('#mixTotal').textContent=nf.format(total);
}

function chart(id,config){if(state.charts[id])state.charts[id].destroy();state.charts[id]=new Chart($(id),config)}
function renderCharts(){
  const weekly=group(state.filtered,'semana'),labels=Object.keys(weekly).sort((a,b)=>weekNumber(a)-weekNumber(b));
  const base={responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:'#071a2f',padding:10,cornerRadius:8}},scales:{x:{grid:{display:false},ticks:{font:{size:10}}},y:{beginAtZero:true,ticks:{font:{size:10},callback:v=>nf.format(v)}}}};
  chart('#weeklyChart',{type:'bar',data:{labels,datasets:[{label:'Montagem',data:labels.map(k=>sum(weekly[k],'montagem')),backgroundColor:'#15a9e1',borderRadius:5,maxBarThickness:34},{label:'Desmontagem',data:labels.map(k=>sum(weekly[k],'desmontagem')),backgroundColor:'#ff9f43',borderRadius:5,maxBarThickness:34}]},options:base});
  const assembly=sum(state.filtered,'montagem'),disassembly=sum(state.filtered,'desmontagem');
  chart('#mixChart',{type:'doughnut',data:{labels:['Montagem','Desmontagem'],datasets:[{data:[assembly,disassembly],backgroundColor:['#15a9e1','#ff9f43'],borderWidth:0,hoverOffset:4}]},options:{responsive:true,maintainAspectRatio:false,cutout:'72%',plugins:{legend:{position:'bottom',labels:{boxWidth:8,usePointStyle:true,padding:18,font:{size:10}}}}}});
  const std=labels.map(k=>{const h=sum(weekly[k],'hhTotal'),t=sum(weekly[k],'total');return t?h/t:0});
  chart('#stdChart',{type:'line',data:{labels,datasets:[{label:'STD',data:std,borderColor:'#2ed0a5',backgroundColor:'rgba(46,208,165,.12)',fill:true,tension:.35,pointBackgroundColor:'#2ed0a5',pointRadius:3}]},options:{...base,scales:{...base.scales,y:{beginAtZero:true,ticks:{font:{size:10},callback:v=>nf.format(v)}}}}});
  const byLeader=Object.entries(group(state.filtered,'nome')).map(([name,rows])=>({name,total:sum(rows,'total'),hh:sum(rows,'hhTotal')})).sort((a,b)=>b.total-a.total).slice(0,10);
  chart('#hoursChart',{type:'bar',data:{labels:byLeader.map(x=>shortName(x.name)),datasets:[{type:'bar',label:'Produção (ML)',data:byLeader.map(x=>x.total),backgroundColor:'#15a9e1',borderRadius:5,yAxisID:'y'},{type:'line',label:'HH',data:byLeader.map(x=>x.hh),borderColor:'#ff9f43',backgroundColor:'#ff9f43',tension:.3,yAxisID:'y1'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{boxWidth:8,usePointStyle:true,font:{size:10}}}},scales:{x:{grid:{display:false},ticks:{font:{size:9}}},y:{beginAtZero:true,ticks:{font:{size:9},callback:v=>nf.format(v)}},y1:{beginAtZero:true,position:'right',grid:{drawOnChartArea:false},ticks:{font:{size:9},callback:v=>nf.format(v)}}}}});
}

function shortName(n){const p=n.trim().split(/\s+/);return p.length>2?`${p[0]} ${p.at(-1)}`:n}
function renderRanking(){const list=Object.entries(group(state.filtered,'nome')).map(([name,rows])=>({name,total:sum(rows,'total')})).sort((a,b)=>b.total-a.total).slice(0,10),max=list[0]?.total||1;$('#rankingList').innerHTML=list.length?list.map((x,i)=>`<div class="rank-row"><span class="rank-pos">${String(i+1).padStart(2,'0')}</span><span class="rank-name" title="${x.name}">${shortName(x.name)}</span><span class="rank-bar"><i style="width:${x.total/max*100}%"></i></span><span class="rank-value">${nf.format(x.total)} ML</span></div>`).join(''):'<p>Sem dados para os filtros selecionados.</p>'}
function searchedRows(){const q=$('#searchInput').value.trim().toLocaleLowerCase('pt-BR');return !q?state.filtered:state.filtered.filter(r=>r.nome.toLocaleLowerCase('pt-BR').includes(q)||r.idEnesa.includes(q))}
function renderTable(){const rows=searchedRows().sort((a,b)=>b.data.localeCompare(a.data)||weekNumber(b.semana)-weekNumber(a.semana));const pages=Math.max(1,Math.ceil(rows.length/state.pageSize));state.page=Math.min(state.page,pages);const start=(state.page-1)*state.pageSize;$('#dataBody').innerHTML=rows.slice(start,start+state.pageSize).map(r=>`<tr><td>${r.semana}</td><td>${r.data?df.format(new Date(r.data+'T00:00:00Z')):'—'}</td><td>${r.idEnesa}</td><td>${r.nome}</td><td>${nf.format(r.presente)}</td><td>${nf.format(r.hhTotal)}</td><td>${nf.format(r.montagem)}</td><td>${nf.format(r.desmontagem)}</td><td><b>${nf.format(r.total)}</b></td><td>${nf.format(r.std)}</td></tr>`).join('');$('#recordCount').textContent=`${nf.format(rows.length)} registros`;$('#pageInfo').textContent=`Página ${state.page} de ${pages}`;$('#prevPage').disabled=state.page<=1;$('#nextPage').disabled=state.page>=pages}
function downloadCsv(){const keys=['semana','data','idEnesa','nome','presente','hhTotal','montagem','desmontagem','total','std'];const head=['Semana','Data','ID ENESA','Encarregado','Presentes','HH Total','Montagem','Desmontagem','Total','STD'];const esc=v=>`"${String(v??'').replaceAll('"','""')}"`;const csv='\ufeff'+[head,...searchedRows().map(r=>keys.map(k=>r[k]))].map(row=>row.map(esc).join(';')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='controle-producao-filtrado.csv';a.click();URL.revokeObjectURL(a.href)}
