(()=>{
  const success=document.querySelector('#successView');
  const form=document.querySelector('#formView');
  const input=document.querySelector('#licenseKey');
  if(!success||!form||!input)return;
  let handled=false;
  new MutationObserver(async()=>{
    if(!success.classList.contains('open')||handled)return;
    handled=true;
    const key=input.value.trim().toUpperCase().replace(/\s+/g,'');
    try{
      await KRDevices.register(key,/android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent)?'mobile':'computer');
      const panel=document.createElement('div');panel.id='deviceList';panel.style.cssText='margin-top:24px;text-align:left';success.appendChild(panel);KRDevices.render(panel,key);
    }catch(error){success.classList.remove('open');form.classList.remove('hidden');const message=document.querySelector('#error');message.textContent=error.message;handled=false}
  }).observe(success,{attributes:true,attributeFilter:['class']});
})();
