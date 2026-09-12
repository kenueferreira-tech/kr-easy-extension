(()=>{
  const target=document.querySelector('#actions')||document.querySelector('#successView');
  if(!target)return;
  const link=document.createElement('a');
  link.href='/tutorial-instalacao.html';
  link.className='button secondary device-desktop';
  link.textContent='Tutorial da extensão no computador';
  const download=target.querySelector('a[href*="KR-Easy-Extension"]');
  if(download)download.insertAdjacentElement('afterend',link);else target.appendChild(link);
  const appGuide=document.createElement('a');
  appGuide.href='/tutorial-aplicativo.html';
  appGuide.className='button secondary device-mobile';
  appGuide.textContent='Tutorial do aplicativo no celular';
  target.appendChild(appGuide);
  document.addEventListener('click',event=>{
    const mobile=event.target.closest('#mobile,#mobileButton');
    if(!mobile||!/android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent))return;
    event.preventDefault();event.stopImmediatePropagation();location.href='/instalar-aplicativo.html';
  },true);
})();
