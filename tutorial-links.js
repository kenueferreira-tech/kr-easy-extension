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
  if(!document.querySelector('[href="/contato.html"]')){
    const support=document.createElement('a');
    support.href='/contato.html';
    support.className='button secondary';
    support.textContent='Fale com o desenvolvedor';
    target.appendChild(support);
  }
  document.addEventListener('click',event=>{
    const mobile=event.target.closest('#mobile,#mobileButton');
    if(!mobile||!/android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent))return;
    event.preventDefault();event.stopImmediatePropagation();location.href='/instalar-aplicativo.html';
  },true);
})();

(()=>{
  if(document.querySelector('[data-screen="profile"]')&&!document.querySelector('#developerSupportCard')){
    const card=document.createElement('article');
    card.id='developerSupportCard';card.className='card';card.style.marginTop='14px';
    card.innerHTML='<h3>✉️ Fale com o desenvolvedor</h3><p class="subtle">Ajuda com instalação, licença, pagamento ou problemas técnicos.</p><a class="secondary" style="display:flex;align-items:center;justify-content:center;text-decoration:none" href="/contato.html">Abrir suporte</a>';
    document.querySelector('[data-screen="profile"]').appendChild(card);
  }
  const grid=document.querySelector('.grid');
  if(grid&&!document.querySelector('#developerSupportCard')){
    const card=document.createElement('article');card.id='developerSupportCard';card.className='card';
    card.innerHTML='<span>✉️</span><h2>Fale com o desenvolvedor</h2><p>Suporte para instalação, licença, pagamento ou problema técnico.</p><a class="button" href="/contato.html">Abrir suporte</a>';
    grid.appendChild(card);
  }
  const footer=document.querySelector('.site-footer .footer-row');
  if(footer&&!footer.querySelector('[href="/contato.html"]')){
    const support=document.createElement('a');support.className='btn btn-secondary';support.href='/contato.html';support.textContent='Suporte';footer.appendChild(support);
  }
})();
