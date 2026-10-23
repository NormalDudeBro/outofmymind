const form = document.getElementById('unlock-form');
const pin = document.getElementById('pin');
const button = document.getElementById('unlock-button');
const status = document.getElementById('status');
const gate = document.getElementById('gate');
const viewer = document.getElementById('viewer');
const guide = document.getElementById('guide');
const decode = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));

function lock() {
  guide.removeAttribute('srcdoc');
  guide.src = 'about:blank';
  viewer.hidden = true;
  gate.hidden = false;
  pin.value = '';
  status.textContent = '';
  document.title = 'Private Poster Workshop | Joltlined';
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!/^\d{4}$/.test(pin.value)) return;
  if (!crypto.subtle) {
    status.textContent = 'Please open this page using HTTPS in a modern browser.';
    return;
  }
  button.disabled = true;
  status.textContent = 'Unlocking...';
  const password = new TextEncoder().encode(pin.value);
  pin.value = '';
  try {
    const response = await fetch('./guide.enc.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Encrypted guide unavailable');
    const payload = await response.json();
    if (payload.version !== 1 || payload.iterations !== 600000) throw new Error('Unsupported format');
    const material = await crypto.subtle.importKey('raw', password, 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: decode(payload.salt), iterations: payload.iterations, hash: 'SHA-256' },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt'],
    );
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode(payload.iv) }, key, decode(payload.ciphertext));
    guide.srcdoc = new TextDecoder('utf-8', { fatal: true }).decode(plaintext);
    gate.hidden = true;
    viewer.hidden = false;
    status.textContent = '';
    document.title = 'Poster Guide | Joltlined';
    document.getElementById('lock-button').focus();
  } catch {
    status.textContent = 'Unable to unlock. Check your PIN and try again.';
    pin.focus();
  } finally {
    password.fill(0);
    button.disabled = false;
  }
});

document.getElementById('lock-button').addEventListener('click', () => { lock(); pin.focus(); });
window.addEventListener('pagehide', lock);
