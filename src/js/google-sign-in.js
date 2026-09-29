let sdk;
function loadGoogle() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  return sdk ||= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client'; script.async = true;
    const timer = setTimeout(() => reject(new Error('Google sign-in is taking too long. Use email login or reload to try again.')), 20000);
    script.onload = () => { clearTimeout(timer); resolve(window.google.accounts.id); };
    script.onerror = () => { clearTimeout(timer); reject(new Error('Google sign-in could not load. Use email login or reload to try again.')); };
    document.head.append(script);
  }).catch(error => { sdk = null; throw error; });
}

export async function initGoogleSignIn(root, request, onSuccess) {
  const host = root.querySelector('[data-google-button]');
  if (!host) return;
  const status = root.querySelector('[data-google-status]');
  const form = root.querySelector('[data-google-complete]');
  const phone = form.querySelector('[name="phone"]');
  const password = form.querySelector('[name="password"]');
  const retry = root.querySelector('[data-google-retry]');
  let observer, popupTimer;
  let credential, nonce, busy = false;
  async function timedRequest(action, data) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 65000);
    try { return await request(action, data, { signal: controller.signal }); }
    catch (error) {
      if (controller.signal.aborted) throw new Error('The server took too long to respond. Restart Google sign-in to try again.');
      throw error;
    } finally { clearTimeout(timer); }
  }
  async function submit(extra = {}) {
    if (busy) return;
    clearTimeout(popupTimer);
    busy = true; form.querySelector('button').disabled = true;
    status.textContent = 'Verifying your Google account…';
    try {
      const result = await timedRequest('google', { credential, nonce, ...extra });
      if (result.requiresPhone || result.requiresPassword) {
        form.hidden = false;
        phone.closest('label').hidden = !result.requiresPhone; phone.required = Boolean(result.requiresPhone);
        password.closest('label').hidden = !result.requiresPassword; password.required = Boolean(result.requiresPassword);
        status.textContent = result.requiresPhone ? 'One last step: add your phone number so the studio can contact you about your designs.' : 'An account already uses this email. Enter its password once to link Google securely.';
        form.querySelector('button').textContent = result.requiresPassword ? 'Link Google and sign in' : 'Complete Google sign-in';
        (result.requiresPhone ? phone : password).focus();
        form.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
      } else if (result.user) {
        credential = null; form.reset(); form.hidden = true; status.textContent = '';
        await onSuccess(result.user);
      } else throw new Error('Google sign-in could not be completed. Please try again.');
    } catch (error) { status.textContent = error.message; retry.hidden = false; }
    finally { busy = false; form.querySelector('button').disabled = false; }
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (form.reportValidity()) submit({ phone: phone.required ? phone.value : undefined, password: password.required ? password.value : undefined });
  });
  async function start() {
    if (busy) return;
    clearTimeout(popupTimer);
    observer?.disconnect();
    credential = null; form.reset(); form.hidden = true; retry.hidden = true;
    host.replaceChildren();
    busy = true;
    try {
      status.textContent = 'Loading Google sign-in…';
      const [config, google] = await Promise.all([timedRequest('google/config'), loadGoogle()]);
      nonce = config.nonce;
      google.initialize({ client_id: config.clientId, nonce, auto_select: false, ux_mode: 'popup',
        callback: response => {
          if (busy) return;
          clearTimeout(popupTimer);
          if (!response.credential) {
            status.textContent = 'Google did not complete sign-in. Restart to try again.';
            retry.hidden = false; return;
          }
          credential = response.credential; form.reset(); form.hidden = true; return submit();
        } });
      let renderedWidth = 0;
      const renderButton = () => {
        // Google's standard button supports up to 400px. Match the form column
        // without stretching its iframe or overriding Google's branded contents.
        const width = Math.min(400, Math.floor(host.clientWidth));
        if (width < 200 || width === renderedWidth) return;
        renderedWidth = width;
        host.replaceChildren();
        google.renderButton(host, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', width,
          click_listener: () => {
            status.textContent = 'Complete sign-in in the Google window.';
            clearTimeout(popupTimer);
            popupTimer = setTimeout(() => {
              status.textContent = 'Still here? Finish choosing your Google account, or restart sign-in if the window closed.';
              retry.hidden = false;
            }, 20000);
          }
        });
      };
      renderButton();
      observer = new ResizeObserver(renderButton); observer.observe(host);
      status.textContent = '';
    } catch (error) { status.textContent = 'Google sign-in is unavailable right now. Restart to try again, or use email and password.'; retry.hidden = false; }
    finally { busy = false; }
  }
  retry.addEventListener('click', start);
  await start();
}
