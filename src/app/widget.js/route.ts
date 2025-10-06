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
    const appOrigin = new URL(scriptEl.src).origin;
    const apiUrlAttr = scriptEl.dataset.apiUrl;
    const brandAttr = scriptEl.dataset.brandColor;
    const buttonTextAttr = scriptEl.dataset.buttonText;
    let API_URL = appOrigin + '/api/query';
    if (apiUrlAttr) {
      try {
        API_URL = new URL(apiUrlAttr, appOrigin).toString();
      } catch (error) {
        console.warn('ai-faq-widget: invalid data-api-url provided, using raw value');
        API_URL = apiUrlAttr;
      }
    }
    const BRAND = brandAttr || ${defaultBrand};
    const BUTTON_TEXT = buttonTextAttr || 'Ask our AI';

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
      '  padding: 20px;',
      '  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.25);',
      '  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;',
      '  box-sizing: border-box;',
      '  display: flex;',
      '  flex-direction: column;',
      '  gap: 12px;',
      '  max-height: 85vh;',
      '  overflow: auto;',
      '}',
      '.ai-faq-modal h2 {',
      '  margin: 0 0 12px;',
      '  font-size: 20px;',
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
      '.ai-faq-response {',
      '  margin-top: 8px;',
      '  white-space: pre-wrap;',
      '  font-size: 14px;',
      '  line-height: 1.6;',
      '  overflow-wrap: anywhere;',
      '  max-height: 40vh;',
      '  overflow-y: auto;',
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
    document.head.appendChild(style);

    const button = document.createElement('button');
    button.className = 'ai-faq-button';
    button.textContent = BUTTON_TEXT;

    const backdrop = document.createElement('div');
    backdrop.className = 'ai-faq-modal-backdrop';

    const modal = document.createElement('div');
    modal.className = 'ai-faq-modal';
    modal.innerHTML = [
      '<h2>Need help?</h2>',
      '<form>',
      '<textarea placeholder="Ask a question..." required></textarea>',
      '<button type="submit">Send</button>',
      '</form>',
      '<div class="ai-faq-response"></div>',
      '<div class="ai-faq-sources"></div>',
    ].join('');
    backdrop.appendChild(modal);

    function openModal() {
      backdrop.style.display = 'flex';
      button.style.display = 'none';
      try { document.body.style.overflow = 'hidden'; } catch (e) {}
    }

    function closeModal() {
      backdrop.style.display = 'none';
      button.style.display = 'block';
      try { document.body.style.overflow = ''; } catch (e) {}
    }

    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) {
        closeModal();
      }
    });

    const form = modal.querySelector('form');
    const textarea = modal.querySelector('textarea');
    const responseEl = modal.querySelector('.ai-faq-response');
    const sourcesEl = modal.querySelector('.ai-faq-sources');

    async function submitQuestion(event) {
      event.preventDefault();
      if (!textarea || !responseEl || !sourcesEl) return;
      const question = textarea.value.trim();
      if (!question) return;
      responseEl.textContent = 'Thinking...';
      sourcesEl.textContent = '';

      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Request failed');
        }
        responseEl.textContent = data.answer;
        if (Array.isArray(data.sources) && data.sources.length) {
          const list = document.createElement('ul');
          data.sources.forEach((source) => {
            const item = document.createElement('li');
            const link = document.createElement('a');
            link.href = source.url;
            link.textContent = source.title || source.url;
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
        responseEl.textContent = 'An error occurred. Please try again later.';
      }
    }

    if (form) {
      form.addEventListener('submit', submitQuestion);
    }

    document.body.appendChild(button);
    document.body.appendChild(backdrop);
    button.addEventListener('click', openModal);
  })();`;

  return new NextResponse(script, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}
