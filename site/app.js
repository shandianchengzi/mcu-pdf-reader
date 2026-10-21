'use strict';
const $ = (id) => document.getElementById(id);
let manuals = [];
let selected = null;
let filter = 'active';
let toastTimer;

function shortSize(bytes) {return `${(bytes / 1048576).toFixed(1)} MB`;}
function pdfLink(manual, page) {
  const segments = manual.path.split('/').map(encodeURIComponent).join('/');
  return `./${segments}#page=${page || 1}&toolbar=1&navpanes=1`;
}
function showToast(message) {
  const node = $('toast'); node.textContent = message; node.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => node.classList.remove('show'), 2600);
}
function setMobileOpen(open) {
  $('sidebar').classList.toggle('mobile-open', open);
  $('mobile-backdrop').hidden = !open;
  $('menu-button').setAttribute('aria-expanded', String(open));
}
function labelOf(m) {
  const names = {EFM32G:'EFM32G',EFM32LG:'EFM32LG','NXP88MW320-322':'NXP 88MW320/322',RA4W1:'Renesas RA4W1',WL5:'STM32WL5','f469+f479':'STM32F469 / F479',l152:'STM32L152','l431-l432':'STM32L431 / L432',f100:'STM32F100',f103:'STM32F103',f3:'STM32F3',f429:'STM32F429',f446:'STM32F446',k64:'NXP K64',l475:'STM32L475',max78000:'MAX78000',nRF52832:'nRF52832',nRF52840:'nRF52840',sam3:'Atmel SAM3',sam4e:'Atmel SAM4E',wl5x:'STM32WL5x'};
  const parts = m.id.split('/'); const key = m.archived ? parts[1] : parts[0];
  let name = names[key] || key;
  if (m.filename.includes('flash-memory')) name += ' · Flash Guide';
  return name;
}
function updateUrl(m, page) {
  const url = new URL(location.href);
  if (m) {url.searchParams.set('manual', m.id);url.searchParams.set('page', String(page || 1));}
  else {url.searchParams.delete('manual');url.searchParams.delete('page');}
  history.replaceState({}, '', url);
}
function renderList() {
  const q = $('search').value.trim().toLowerCase();
  const candidates = manuals.filter(m => (filter === 'all' || m.archived === (filter === 'archived')) && `${labelOf(m)} ${m.id} ${m.filename}`.toLowerCase().includes(q));
  const root = $('manual-list'); root.replaceChildren();
  $('visible-count').textContent = `${candidates.length} 篇`;
  $('list-caption').textContent = q ? '搜索结果' : filter === 'archived' ? '归档参考手册' : filter === 'all' ? '全部手册' : '现用参考手册';
  if (!candidates.length) {const msg = document.createElement('div');msg.className='loading-note';msg.textContent=manuals.length?'未找到匹配的手册。':'暂无 PDF 文件，执行一次性导入后即可使用。';root.append(msg);return;}
  for (const m of candidates) {
    const button = document.createElement('button');button.type='button';button.className='manual-item'+(selected?.id===m.id?' selected':'')+(!m.available?' unavailable':'');
    button.setAttribute('aria-current', selected?.id===m.id?'page':'false');
    const icon = document.createElement('span');icon.className='manual-icon';icon.textContent='PDF';
    const body=document.createElement('span');body.className='manual-content';
    const title=document.createElement('div');title.className='manual-label';title.textContent=labelOf(m);
    const meta=document.createElement('div');meta.className='manual-subtitle';meta.textContent=m.available?`${shortSize(m.size)}  ·  ${m.archived?'归档':'参考手册'}`:'尚未导入 · '+shortSize(m.size);
    const arrow=document.createElement('span');arrow.className='manual-arrow';arrow.textContent='›';
    body.append(title,meta);button.append(icon,body,arrow);
    button.addEventListener('click',()=>selectManual(m.id,1));root.append(button);
  }
}
function selectManual(id, page=1) {
  const manual=manuals.find(m=>m.id===id);
  if (!manual){showToast('手册不存在，请检查链接');return;}
  if (!manual.available){showToast('这份手册尚未拷贝到仓库');return;}
  selected=manual;
  const safePage=Number.isSafeInteger(Number(page)) && Number(page)>0 ? Number(page) : 1;
  $('empty-state').hidden=true;$('reader').hidden=false;
  $('crumb-title').textContent=labelOf(manual);
  $('document-title').textContent=labelOf(manual);
  $('document-type').textContent=manual.archived?'ARCHIVED MANUAL':'REFERENCE MANUAL';
  $('document-meta').textContent=`${manual.filename} · ${shortSize(manual.size)} · ${manual.archived?'归档':'现用'} · PDF`;
  $('page-number').value=String(safePage);
  const url=pdfLink(manual,safePage);
  $('pdf-frame').src=url;
  const direct=pdfLink(manual,1).split('#')[0];
  $('download-file').href=direct;$('download-file').download=manual.filename;
  $('open-tab').href=url;$('open-tab').target='_blank';$('open-tab').rel='noopener noreferrer';$('open-tab').removeAttribute('aria-disabled');$('open-tab').removeAttribute('tabindex');
  $('copy-link').disabled=false;
  updateUrl(manual,safePage);renderList();setMobileOpen(false);
}
function changePage(){
  if(!selected)return;
  const page=Number($('page-number').value);
  if (!Number.isSafeInteger(page) || page<1){showToast('请输入有效的正整数页码');return;}
  selectManual(selected.id,page);
}
async function initialize(){
  try {
    const response=await fetch('./manuals.json',{cache:'no-cache'});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const result=await response.json();
    if(!Array.isArray(result.manuals))throw new Error('目录格式错误');
    manuals=result.manuals;
    $('active-count').textContent=manuals.filter(m=>!m.archived).length;
    $('archived-count').textContent=manuals.filter(m=>m.archived).length;
    const ready=manuals.filter(m=>m.available).length;
    $('sync-status').textContent=`${ready} / ${manuals.length} 份 · 一次性拷贝`;
    if (!ready) {$('empty-message').textContent='网页已建立，PDF 正等待一次性导入。请查看仓库 README 中的导入步骤。';}
    const p=new URLSearchParams(location.search);
    const id=p.get('manual');
    if(id)selectManual(id,Number(p.get('page'))||1);
    else if(ready){selectManual(manuals.find(m=>m.available&&!m.archived)?.id || manuals.find(m=>m.available).id,1);}
    renderList();
  } catch(error) {
    $('manual-list').replaceChildren();
    const note=document.createElement('div');note.className='loading-note';note.textContent=`读取目录失败：${error.message}`;$('manual-list').append(note);
    $('empty-message').textContent='无法读取手册目录，请刷新页面或检查 GitHub Pages 是否部署完成。';
  }
}
document.querySelectorAll('.filter').forEach(button=>button.addEventListener('click',()=>{
  filter=button.dataset.filter;
  document.querySelectorAll('.filter').forEach(b=>{const on=b===button;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});renderList();
}));
$('search').addEventListener('input',renderList);
$('go-page').addEventListener('click',changePage);
$('page-number').addEventListener('keydown',e=>{if(e.key==='Enter')changePage();});
$('copy-link').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);showToast('阅读链接已复制');}catch{showToast('复制失败，请从地址栏复制');}});
$('menu-button').addEventListener('click',()=>setMobileOpen(!$('sidebar').classList.contains('mobile-open')));
$('mobile-backdrop').addEventListener('click',()=>setMobileOpen(false));
document.addEventListener('keydown',e=>{if(e.key==='Escape')setMobileOpen(false);if(e.key==='/' && !['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)){e.preventDefault();$('search').focus();setMobileOpen(true);}});
initialize();
