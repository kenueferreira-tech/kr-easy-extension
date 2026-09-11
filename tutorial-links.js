(()=>{
  const target=document.querySelector('#actions')||document.querySelector('#successView');
  if(!target)return;
  const link=document.createElement('a');
  link.href='/tutorial-instalacao.html';
  link.className='button secondary device-desktop';
  link.textContent='Ver tutorial de instalação';
  const download=target.querySelector('a[href*="KR-Easy-Extension"]');
  if(download)download.insertAdjacentElement('afterend',link);else target.appendChild(link);
})();
