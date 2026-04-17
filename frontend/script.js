/* ────────────────────────────────────────────────────────────────
   MailPolish — script.js
   Handles UI interactions and API calls to the FastAPI backend
──────────────────────────────────────────────────────────────── */

const API_BASE = window.location.origin; // same-origin (FastAPI serves frontend)

// ── Element References ────────────────────────────────────────
const inputText        = document.getElementById('input-text');
const charCount        = document.getElementById('char-count');
const clearBtn         = document.getElementById('clear-btn');
const copyBtn          = document.getElementById('copy-btn');
const paraphraseBtn    = document.getElementById('paraphrase-btn');
const numVariants      = document.getElementById('num-variants');
const styleBtns        = document.querySelectorAll('.style-btn');

const outputPlaceholder  = document.getElementById('output-placeholder');
const loadingState       = document.getElementById('loading-state');
const variantsContainer  = document.getElementById('variants-container');
const variantsTabs       = document.getElementById('variants-tabs');
const variantOutput      = document.getElementById('variant-output');
const errorBanner        = document.getElementById('error-banner');
const errorMsg           = document.getElementById('error-msg');

// ── State ─────────────────────────────────────────────────────
let selectedStyle    = 'professional';
let currentVariants  = [];
let activeVariantIdx = 0;

// ── Sample Emails ─────────────────────────────────────────────
const SAMPLES = {
  'sample-1': `Hey, just wanted to check in real quick and see if you got the stuff I sent over last week. Been kinda busy but wanted to make sure everything was good on your end. Let me know asap, thanks!`,

  'sample-2': `Hi, I was thinking maybe we could get together sometime next week to talk about the project. I'm pretty open most days but Tuesday afternoon would probably work best for me if that's cool with you. Just let me know!`,

  'sample-3': `I'm writing because I am really not happy with the service I got. It was super slow and the person I spoke to wasn't very helpful at all. I think you guys need to do better and I expect some kind of compensation for the trouble.`,
};

// ── Style Selection ───────────────────────────────────────────
styleBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    styleBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedStyle = btn.dataset.style;
  });
});

// ── Sample Chips ──────────────────────────────────────────────
Object.keys(SAMPLES).forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('click', () => {
      inputText.value = SAMPLES[id];
      updateCharCount();
      updateParaphraseBtn();
      resetOutput();
    });
  }
});

// ── Char Count + Button Enable ────────────────────────────────
function updateCharCount() {
  const len = inputText.value.length;
  charCount.textContent = `${len} / 2000`;
  charCount.style.color = len > 1800 ? '#f87171' : '';
}

function updateParaphraseBtn() {
  paraphraseBtn.disabled = inputText.value.trim().length === 0;
}

inputText.addEventListener('input', () => {
  updateCharCount();
  updateParaphraseBtn();
});

// ── Clear ─────────────────────────────────────────────────────
clearBtn.addEventListener('click', () => {
  inputText.value = '';
  updateCharCount();
  updateParaphraseBtn();
  resetOutput();
});

// ── Reset Output Panel ────────────────────────────────────────
function resetOutput() {
  outputPlaceholder.classList.remove('hidden');
  loadingState.classList.add('hidden');
  variantsContainer.classList.add('hidden');
  errorBanner.classList.add('hidden');
  copyBtn.disabled = true;
  currentVariants = [];
}

// ── Show Error ────────────────────────────────────────────────
function showError(msg) {
  outputPlaceholder.classList.add('hidden');
  loadingState.classList.add('hidden');
  variantsContainer.classList.add('hidden');
  errorBanner.classList.remove('hidden');
  errorMsg.textContent = msg;
}

// ── Render Variants ───────────────────────────────────────────
function renderVariants(variants) {
  variantsTabs.innerHTML = '';
  currentVariants = variants;
  activeVariantIdx = 0;

  variants.forEach((_, i) => {
    const tab = document.createElement('button');
    tab.className = `variant-tab ${i === 0 ? 'active' : ''}`;
    tab.textContent = `Version ${i + 1}`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    tab.addEventListener('click', () => selectVariant(i));
    variantsTabs.appendChild(tab);
  });

  variantOutput.textContent = variants[0] || '';

  outputPlaceholder.classList.add('hidden');
  loadingState.classList.add('hidden');
  variantsContainer.classList.remove('hidden');
  errorBanner.classList.add('hidden');
  copyBtn.disabled = false;
}

function selectVariant(idx) {
  activeVariantIdx = idx;
  document.querySelectorAll('.variant-tab').forEach((tab, i) => {
    tab.classList.toggle('active', i === idx);
    tab.setAttribute('aria-selected', i === idx ? 'true' : 'false');
  });
  variantOutput.textContent = currentVariants[idx] || '';
}

// ── Copy ──────────────────────────────────────────────────────
copyBtn.addEventListener('click', async () => {
  const text = currentVariants[activeVariantIdx];
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    const original = copyBtn.textContent;
    copyBtn.textContent = '✓ Copied!';
    setTimeout(() => (copyBtn.textContent = '⎘ Copy'), 1800);
  } catch {
    // fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
});

// ── Main: Paraphrase ──────────────────────────────────────────
paraphraseBtn.addEventListener('click', async () => {
  const text = inputText.value.trim();
  if (!text) return;

  // Show loading
  outputPlaceholder.classList.add('hidden');
  variantsContainer.classList.add('hidden');
  errorBanner.classList.add('hidden');
  loadingState.classList.remove('hidden');
  paraphraseBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/paraphrase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        style: selectedStyle,
        num_variants: parseInt(numVariants.value, 10),
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Server error ${res.status}`);
    }

    const data = await res.json();
    renderVariants(data.variants);
  } catch (err) {
    showError(err.message || 'Could not reach the backend. Is it running on port 8000?');
  } finally {
    paraphraseBtn.disabled = inputText.value.trim().length === 0;
    loadingState.classList.add('hidden');
  }
});

// ── Init ──────────────────────────────────────────────────────
updateCharCount();
updateParaphraseBtn();
