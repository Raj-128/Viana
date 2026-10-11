const notice = document.getElementById('plan-renew-notice');
if (notice && new URLSearchParams(window.location.search).get('notice') === 'renew-plan') {
  notice.hidden = false;
  setTimeout(() => {
    notice.hidden = true;
  }, 20_000);
}
