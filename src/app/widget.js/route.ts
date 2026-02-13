import { NextResponse } from "next/server";
import { getSettings } from "@/lib/storage";

export async function GET() {
  const settings = await getSettings();
  const defaultBrand = JSON.stringify(settings.brandColor);

  const script = `(() => {
    if (window.__aiFaqWidgetLoaded) return;
    window.__aiFaqWidgetLoaded = true;
    const scriptEl = document.currentScript;
    if (!scriptEl) return;
    const appOrigin = new URL(scriptEl.src, window.location.href).origin;
    const apiUrlAttr = scriptEl.dataset.apiUrl;
    const brandAttr = scriptEl.dataset.brandColor;
    const buttonTextAttr = scriptEl.dataset.buttonText;
    const titleAttr = scriptEl.dataset.title;
    const placeholderAttr = scriptEl.dataset.placeholder;

    function resolveUrl(input, fallback) {
      if (!input) return fallback;
      try {
        return new URL(input, appOrigin).toString();
      } catch (error) {
        console.warn('ai-faq-widget: invalid data-api-url provided, using fallback');
        return fallback;
      }
    }

    function sanitizeColor(input, fallback) {
      if (!input) return fallback;
      const probe = document.createElement('span');
      probe.style.color = '';
      probe.style.color = input;
      return probe.style.color ? input : fallback;
    }

    const API_URL = resolveUrl(apiUrlAttr, appOrigin + '/api/query');
    const BRAND = sanitizeColor(brandAttr, ${defaultBrand});
    const BUTTON_TEXT = buttonTextAttr || 'Ask our AI';
    const TITLE_TEXT = titleAttr || 'Need help?';
    const PLACEHOLDER_TEXT = placeholderAttr || 'Ask a question...';

    const style = document.createElement('style');
    style.textContent = [
      '.ai-faq-button {',
      '  position: fixed;',
      '  bottom: 24px;',
      '  right: 24px;',
      '  background: ' + BRAND + ';',
      '  color: white;',
      '  border: none;',
      '  border-radius: 9999px;',
      '  padding: 12px 18px;',
      '  font-size: 15px;',
      '  cursor: pointer;',
      '  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);',
      '  z-index: 9999;',
      '  transition: transform 0.15s ease, opacity 0.2s ease;',
      '}',
      '.ai-faq-button:hover {',
      '  transform: translateY(-1px);',
      '}',
      '.ai-faq-modal-backdrop {',
      '  position: fixed;',
      '  inset: 0;',
      '  background: rgba(0, 0, 0, 0.48);',
      '  display: none;',
      '  align-items: center;',
      '  justify-content: center;',
      '  overflow: auto;',
      '  z-index: 9998;',
      '}',
      '.ai-faq-modal {',
      '  background: white;',
      '  width: min(420px, 90vw);',
      '  border-radius: 16px;',
      '  padding: 16px;',
      '  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.25);',
      '  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;',
      '  box-sizing: border-box;',
      '  display: flex;',
      '  flex-direction: column;',
      '  gap: 12px;',
      '  max-height: 85vh;',
      '  overflow: auto;',
      '}',
      '.ai-faq-modal-header {',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: space-between;',
      '  gap: 8px;',
      '}',
      '.ai-faq-modal h2 {',
      '  margin: 0;',
      '  font-size: 18px;',
      '  line-height: 1.35;',
      '}',
      '.ai-faq-close {',
      '  border: none;',
      '  background: transparent;',
      '  color: #334155;',
      '  width: 30px;',
      '  height: 30px;',
      '  border-radius: 8px;',
      '  cursor: pointer;',
      '  font-size: 20px;',
      '  line-height: 1;',
      '}',
      '.ai-faq-close:hover {',
      '  background: #f1f5f9;',
      '}',
      '.ai-faq-modal form {',
      '  display: flex;',
      '  flex-direction: column;',
      '  gap: 10px;',
      '}',
      '.ai-faq-modal textarea {',
      '  width: 100%;',
      '  min-height: 110px;',
      '  resize: vertical;',
      '  padding: 12px;',
      '  border-radius: 12px;',
      '  border: 1px solid #d1d5db;',
      '  font-size: 15px;',
      '  box-sizing: border-box;',
      '}',
      '.ai-faq-modal button[type=submit] {',
      '  align-self: flex-end;',
      '  background: ' + BRAND + ';',
      '  border: none;',
      '  color: white;',
      '  padding: 10px 16px;',
      '  border-radius: 12px;',
      '  cursor: pointer;',
      '  font-size: 15px;',
      '}',
      '.ai-faq-modal button[type=submit]:disabled {',
      '  opacity: 0.7;',
      '  cursor: wait;',
      '}',
      '.ai-faq-response {',
      '  margin-top: 4px;',
      '  white-space: pre-wrap;',
      '  font-size: 14px;',
      '  line-height: 1.6;',
      '  overflow-wrap: anywhere;',
      '  max-height: 40vh;',
      '  overflow-y: auto;',
      '}',
      '.ai-faq-hint {',
      '  margin: 0;',
      '  font-size: 12px;',
      '  color: #64748b;',
      '}',
      '.ai-faq-sources {',
      '  margin-top: 8px;',
      '  font-size: 13px;',
      '  max-height: 20vh;',
      '  overflow-y: auto;',
      '}',
      '.ai-faq-sources ul {',
      '  padding-left: 18px;',
      '}',
      '.ai-faq-sources a {',
      '  color: #2563EB;',
      '  text-decoration: underline;',
      '}',
    ].join(String.fromCharCode(10));

    const button = document.createElement('button');
    button.className = 'ai-faq-button';
    button.textContent = BUTTON_TEXT;
    button.type = 'button';
    button.setAttribute('aria-label', BUTTON_TEXT);

    const backdrop = document.createElement('div');
    backdrop.className = 'ai-faq-modal-backdrop';

    const modal = document.createElement('div');
    modal.className = 'ai-faq-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'ai-faq-modal-title');
    modal.innerHTML = [
      '<div class="ai-faq-modal-header">',
      '<h2 id="ai-faq-modal-title"></h2>',
      '<button type="button" class="ai-faq-close" aria-label="Close widget">&times;</button>',
      '</div>',
      '<form>',
      '<textarea required></textarea>',
      '<button type="submit">Send</button>',
      '</form>',
      '<p class="ai-faq-hint">Press Esc to close.</p>',
      '<div class="ai-faq-response" aria-live="polite"></div>',
      '<div class="ai-faq-sources"></div>',
    ].join('');
    backdrop.appendChild(modal);

    const titleEl = modal.querySelector('h2');
    const closeButton = modal.querySelector('.ai-faq-close');
    function openModal() {
      backdrop.style.display = 'flex';
      button.style.display = 'none';
      try { document.body.style.overflow = 'hidden'; } catch (e) {}
      if (textarea) textarea.focus();
    }

    function closeModal() {
      backdrop.style.display = 'none';
      button.style.display = 'block';
      try { document.body.style.overflow = ''; } catch (e) {}
      button.focus();
    }

    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) {
        closeModal();
      }
    });

    const form = modal.querySelector('form');
    const textarea = modal.querySelector('textarea');
    const submitButton = modal.querySelector('button[type="submit"]');
    const responseEl = modal.querySelector('.ai-faq-response');
    const sourcesEl = modal.querySelector('.ai-faq-sources');
    if (titleEl) titleEl.textContent = TITLE_TEXT;
    if (textarea) textarea.placeholder = PLACEHOLDER_TEXT;

    async function submitQuestion(event) {
      event.preventDefault();
      if (!textarea || !responseEl || !sourcesEl || !submitButton) return;
      const question = textarea.value.trim();
      if (!question) return;
      responseEl.textContent = 'Thinking...';
      sourcesEl.textContent = '';
      textarea.disabled = true;
      submitButton.disabled = true;
      submitButton.textContent = 'Sending...';

      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(typeof data.error === 'string' ? data.error : 'Request failed');
        }
        responseEl.textContent = typeof data.answer === 'string' ? data.answer : 'No answer was returned.';
        if (Array.isArray(data.sources) && data.sources.length) {
          const list = document.createElement('ul');
          data.sources.forEach((source) => {
            const item = document.createElement('li');
            const link = document.createElement('a');
            link.href = source.url || '#';
            link.textContent = source.title || source.url || 'Source';
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            item.appendChild(link);
            list.appendChild(item);
          });
          sourcesEl.innerHTML = '<strong>Sources</strong>';
          sourcesEl.appendChild(list);
        } else {
          sourcesEl.textContent = '';
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'An error occurred. Please try again later.';
        responseEl.textContent = message;
      } finally {
        textarea.disabled = false;
        submitButton.disabled = false;
        submitButton.textContent = 'Send';
      }
    }

    if (form) {
      form.addEventListener('submit', submitQuestion);
    }
    if (closeButton) {
      closeButton.addEventListener('click', closeModal);
    }

    function onKeyDown(event) {
      if (event.key === 'Escape' && backdrop.style.display === 'flex') {
        closeModal();
      }
    }

    function mount() {
      if (!document.head.contains(style)) {
        document.head.appendChild(style);
      }
      if (!document.body.contains(button)) {
        document.body.appendChild(button);
      }
      if (!document.body.contains(backdrop)) {
        document.body.appendChild(backdrop);
      }
      button.addEventListener('click', openModal);
      document.addEventListener('keydown', onKeyDown);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mount, { once: true });
    } else {
      mount();
    }
  })();`;

  return new NextResponse(script, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}
