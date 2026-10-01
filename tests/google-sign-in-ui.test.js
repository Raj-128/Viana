import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

test('Google callback completes sign-in and errors allow a fresh challenge', async () => {
  const source = readFileSync(new URL('../src/js/google-sign-in.js', import.meta.url), 'utf8').replace('export async function', 'async function');
  const elements = {};
  for (const key of ['host', 'status', 'form', 'password', 'retry', 'button']) {
    elements[key] = { hidden: true, clientWidth: 400, value: '', required: false,
      addEventListener(type, fn) { this[type] = fn; }, replaceChildren() {}, reset() {},
      closest() { return this; }, focus() {}, scrollIntoView() {}, reportValidity() { return true; } };
  }
  const {host, status, form, password, retry, button} = elements;
  form.querySelector = selector => selector.includes('phone') ? null : selector.includes('password') ? password : button;
  const root = {querySelector: selector => ({'[data-google-button]':host,'[data-google-status]':status,'[data-google-complete]':form,'[data-google-retry]':retry})[selector]};
  let callback, challenges = 0, result = {user:{id:'new-customer', phone:null}}, signedIn;
  const google = {initialize(config) {callback = config.callback;}, renderButton() {}};
  const context = vm.createContext({window:{google:{accounts:{id:google}}}, AbortController, setTimeout, clearTimeout,
    ResizeObserver: class {observe() {} disconnect() {}}});
  vm.runInContext(source, context);
  await context.initGoogleSignIn(root, async action => {
    if (action === 'google/config') return {clientId:'client', nonce:String(++challenges)};
    if (result instanceof Error) throw result;
    return result;
  }, user => {signedIn = user;});
  await callback({credential:'token'});
  assert.equal(form.hidden, true);
  assert.equal(signedIn.id, 'new-customer');
  result = {requiresPassword:true};
  await callback({credential:'token'});
  assert.equal(form.hidden, false);
  assert.equal(password.required, true);
  assert.match(status.textContent, /Enter its password once/);
  result = {user:{id:'customer'}};
  await callback({credential:'token'});
  assert.equal(signedIn.id, 'customer');
  result = new Error('Expired challenge');
  await callback({credential:'token'});
  assert.equal(retry.hidden, false);
  assert.equal(status.textContent, 'Expired challenge');
  await retry.click();
  assert.equal(challenges, 2);
  assert.equal(retry.hidden, true);
});

test('heading reveal preserves authored markup and cannot leave hidden letters', () => {
  const source = readFileSync(new URL('../src/js/creative-animations.js', import.meta.url), 'utf8');
  const start = source.indexOf('export function initTextReveal()');
  const end = source.indexOf('\nexport function', start + 1);
  const heading = {innerHTML:'The person<br>behind the studio.', animate(frames, options) {assert.equal(options.fill, 'none');}};
  let callback;
  const context = vm.createContext({window:{matchMedia:()=>({matches:false})}, document:{querySelectorAll:()=>[heading]},
    IntersectionObserver:class {constructor(fn) {callback=fn;} observe() {} unobserve() {}}});
  vm.runInContext(source.slice(start, end < 0 ? undefined : end).replace('export function', 'function') + '\ninitTextReveal();', context);
  callback([{isIntersecting:true,target:heading}]);
  assert.equal(heading.innerHTML, 'The person<br>behind the studio.');
});
