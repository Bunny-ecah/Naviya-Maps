/* Header account link. On a self-hosted public site (no ChatGPT sign-in), accounts are hidden. */
(() => {
  const actions = document.querySelector('.headeractions');
  if (!actions) return;
  const link = document.createElement('a');
  link.className = 'account-entry';
  link.href = '/signin';
  link.innerHTML = NI('login') + '<span>Sign in</span>';
  actions.prepend(link);
  try { if (localStorage.getItem('naviya-accent') === 'dusk') document.body.classList.add('violet-dusk'); } catch {}
  fetch('/api/config').then((r) => r.ok ? r.json() : null).catch(() => null).then((config) => {
    if (config && config.accounts === false) {
      document.body.classList.add('no-accounts');
      link.remove();
      return;
    }
    return fetch('/api/account', { credentials: 'same-origin' }).then((r) => r.ok ? r.json() : null).then((data) => {
      if (!data?.user) return;
      link.href = '/account';
      link.innerHTML = NI('sparkles') + '<span>' + data.balance + ' pts · My Naviya</span>';
      const avatar = document.querySelector('.avatar');
      if (avatar) {
        avatar.textContent = data.user.name.slice(0, 2).toUpperCase();
        avatar.style.cursor = 'pointer';
        avatar.onclick = () => location.href = '/account';
        avatar.setAttribute('role', 'link');
        avatar.tabIndex = 0;
        avatar.onkeydown = (e) => { if (e.key === 'Enter') location.href = '/account'; };
      }
    });
  }).catch(() => {});
})();
