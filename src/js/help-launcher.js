function initHelp() {
  if (document.querySelector('.studio-help-launcher')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'studio-help-launcher';
  button.textContent = 'Need help?';
  button.setAttribute('aria-haspopup', 'dialog');
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      const { openHelp } = await import('./help-assistant.js');
      openHelp();
    } catch {
      window.location.href = 'contact.html';
    } finally { button.disabled = false; }
  });
  document.body.append(button);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initHelp, { once: true });
else initHelp();
