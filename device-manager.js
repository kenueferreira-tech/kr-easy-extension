(()=>{
  'use strict';
  const API='/api/devices';
  const DEVICE_KEY='krEasyDeviceId';
  function id(){let value=localStorage.getItem(DEVICE_KEY);if(!value){value=(crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^a-zA-Z0-9_-]/g,'');localStorage.setItem(DEVICE_KEY,value)}return value}
  function info(type='mobile'){return{deviceId:id(),type,name:type==='computer'?`Chrome — ${navigator.platform||'Computador'}`:`Celular — ${navigator.platform||'Android'}`}}
  async function call(action,key,extra={}){const response=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,key,...extra})});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'Não foi possível gerenciar os dispositivos.');return data}
  async function register(key,type){return call('register',key,info(type))}
  async function list(key){return call('list',key)}
  async function ensure(key){const data=await list(key);if(!data.devices.some(device=>device.id===id()))throw new Error('Este dispositivo foi desvinculado. Ative a licença novamente.');return data}
  async function remove(key,deviceId){return call('remove',key,{deviceId})}
  function render(container,key){
    if(!container||!key)return;
    container.innerHTML='<p>Carregando dispositivos…</p>';
    list(key).then(data=>{
      const rows=data.devices.map(device=>`<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 0;border-top:1px solid #203c2c"><span><b>${device.name}</b><br><small style="color:#9ab5a4">${device.id===id()?'Este dispositivo · ':''}Último acesso: ${new Date(device.lastSeenAt).toLocaleString('pt-BR')}</small></span><button data-remove="${device.id}" style="border:1px solid #703535;border-radius:10px;background:#2a1111;color:#ffb0b0;padding:9px">Desvincular</button></div>`).join('');
      container.innerHTML=`<h3>Meus dispositivos (${data.devices.length}/${data.maxDevices})</h3><p style="color:#9ab5a4">Desvincule um aparelho antigo para liberar uma nova ativação.</p>${rows||'<p>Nenhum dispositivo vinculado.</p>'}`;
      container.querySelectorAll('[data-remove]').forEach(button=>button.onclick=async()=>{if(!confirm('Desvincular este dispositivo?'))return;await remove(key,button.dataset.remove);if(button.dataset.remove===id()){localStorage.removeItem('krEasyLicense');location.reload()}else render(container,key)});
    }).catch(error=>container.innerHTML=`<p style="color:#ff9090">${error.message}</p>`);
  }
  window.KRDevices={id,register,list,ensure,remove,render};
})();
