// UI shown by the SDK itself, outside the app's own markup:
//  - the "connecting" dialog while the user approves the magic link by email;
//  - the error dialog: when the app breaks, explain it and hand the user a
//    ready-made prompt for the AI that wrote the app. We never fix the app
//    ourselves; the user's AI does;
//  - the phone tip: once per app, when it runs from a file on disk, tell the
//    user how to get it online (whatever their AI told them).

export type UiLocale = 'en' | 'es';

const Z = 2147483000;
const STYLE_ID = 'iavica-sdk-style';

const TEXT = {
  en: {
    connectingTitle: 'Connecting to iavica…',
    checkEmail: 'Check your email to accept the connection.',
    sentTo: 'Link sent to',
    close: 'Close',
    phoneTip: 'Want it on your phone? Go to {link} and drag this file there.',
    errorTitle: 'This app has an error',
    errorIntro:
      'Something in the app code is not working. Your data is safe. Copy this message and paste it to the AI that created the app (ChatGPT, Claude, Gemini…) so it can fix it.',
    copy: 'Copy message',
    copied: 'Copied ✓',
    promptIntro:
      'My HTML app uses iavica (SDK_URL, version SDK_VERSION) to store its data, and it has errors that stop it from working. Fix them and give me back the complete HTML file.',
    detected: 'Errors detected:',
    at: 'at',
    line: 'line',
    column: 'column',
    rules: 'When fixing it:',
    keep: 'Keep the same appId and the iavica integration (Iavica.connect, db.ready, collections).',
    whole: 'Review the whole file, not only the line of the error, in case there are more problems of the same kind.',
    follow: 'Follow the iavica instructions for AI assistants: https://iavica.com/ai/',
    hintNull:
      'A "null" error when using addEventListener, value, textContent, classList, etc. means the JavaScript looks up an element by id that does not exist in the HTML. Add the HTML for every element the code uses (for example every $(\'id\') or getElementById(\'id\')).',
    hintReference: 'A "not defined" error means a function or variable is used but never declared, or is declared later or with another name.',
    hintSdk: 'An iavica SDK call is used with the wrong arguments. Check the correct signatures in https://iavica.com/ai/ (for example collection.update(id, data, { version: record.version })).',
    hintApi: 'The iavica API rejected the data the app sent (VALIDATION_ERROR). Check collection names, record data and parameters against https://iavica.com/docs/api/.',
    hintUnhandled: 'Every call to the iavica SDK (db.ready, add, list, update, remove) must be awaited inside try/catch, and the app must show a clear message to the user when it fails.',
  },
  es: {
    connectingTitle: 'Conectando con iavica…',
    checkEmail: 'Revisa tu email para aceptar la conexión.',
    sentTo: 'Enlace enviado a',
    close: 'Cerrar',
    phoneTip: '¿La quieres en el móvil? Entra en {link} y arrastra este archivo.',
    errorTitle: 'Esta app tiene un error',
    errorIntro:
      'Algo en el código de la app no funciona. Tus datos están a salvo. Copia este mensaje y pégaselo a la IA que creó la app (ChatGPT, Claude, Gemini…) para que lo corrija.',
    copy: 'Copiar mensaje',
    copied: 'Copiado ✓',
    promptIntro:
      'Mi app HTML usa iavica (SDK_URL, versión SDK_VERSION) para guardar los datos y tiene errores que impiden que funcione. Corrígelos y devuélveme el archivo HTML completo.',
    detected: 'Errores detectados:',
    at: 'en',
    line: 'línea',
    column: 'columna',
    rules: 'Al corregirlo:',
    keep: 'Mantén el mismo appId y la integración con iavica (Iavica.connect, db.ready, colecciones).',
    whole: 'Revisa todo el archivo, no solo la línea del error, por si hay más fallos del mismo tipo.',
    follow: 'Sigue las instrucciones de iavica para asistentes de IA: https://iavica.com/ai/',
    hintNull:
      'Un error de "null" al usar addEventListener, value, textContent, classList, etc. significa que el JavaScript busca por id un elemento que no existe en el HTML. Añade el HTML de todos los elementos que usa el código (por ejemplo cada $(\'id\') o getElementById(\'id\')).',
    hintReference: 'Un error "is not defined" significa que se usa una función o variable que no está declarada, o que se declara más tarde o con otro nombre.',
    hintSdk: 'Se llama al SDK de iavica con argumentos incorrectos. Revisa las firmas correctas en https://iavica.com/ai/ (por ejemplo collection.update(id, data, { version: record.version })).',
    hintApi: 'La API de iavica rechazó los datos que envió la app (VALIDATION_ERROR). Revisa los nombres de colección, los datos de los registros y los parámetros con https://iavica.com/docs/api/.',
    hintUnhandled: 'Cada llamada al SDK de iavica (db.ready, add, list, update, remove) debe ir con await dentro de try/catch, y la app debe mostrar un mensaje claro al usuario cuando falle.',
  },
};

declare const __IAVICA_SDK_VERSION__: string;
const SDK_VERSION: string = __IAVICA_SDK_VERSION__;
// The URL this SDK was loaded from (kept in the fix prompt so the user's AI
// keeps the same version); when unknown, the stable v1 URL.
const SDK_URL: string = (() => {
  try {
    const src = (document.currentScript as HTMLScriptElement | null)?.src;
    if (src && /^https?:/i.test(src)) return src;
  } catch {
    // ignore
  }
  return 'https://iavica.com/sdk/v1/iavica.js';
})();

let configuredLocale: UiLocale | null = null;

/** Called by Iavica.connect() with the app's locale. */
export function setUiLocale(locale: UiLocale | undefined): void {
  if (locale === 'en' || locale === 'es') configuredLocale = locale;
}

function locale(): UiLocale {
  if (configuredLocale) return configuredLocale;
  try {
    const lang = (document.documentElement.lang || navigator.language || '').toLowerCase();
    return lang.startsWith('es') ? 'es' : 'en';
  } catch {
    return 'en';
  }
}

function t() {
  return TEXT[locale()];
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) =>
    ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '"' ? '&quot;' : '&#39;'
  );
}

/** Escape text and paint the brand: always lowercase "iavica" in brand orange. */
export function brandHtml(text: string): string {
  return escapeHtml(text).replace(/\biavica\b(?![.\w])/gi, '<span style="color:#e8421a;text-transform:none">iavica</span>');
}

function whenBody(fn: () => void): void {
  if (document.body) fn();
  else document.addEventListener('DOMContentLoaded', fn, { once: true });
}

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.iavica-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:${Z};font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:16px;box-sizing:border-box}
.iavica-dialog{background:#fff;color:#1a1a1a;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.3);width:100%;position:relative;box-sizing:border-box;text-align:left}
.iavica-dialog *{box-sizing:border-box}
.iavica-close{position:absolute;top:8px;right:8px;background:none;border:none;font-size:24px;line-height:1;cursor:pointer;color:#777;padding:6px 10px;border-radius:6px}
.iavica-close:hover{background:#f2f2f2;color:#222}
.iavica-spinner{width:44px;height:44px;margin:0 auto 18px;border-radius:50%;border:4px solid #f3d3c8;border-top-color:#e8421a;animation:iavica-spin .9s linear infinite}
@keyframes iavica-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.iavica-spinner{animation-duration:2.4s}}
.iavica-btn{border:none;border-radius:8px;padding:10px 16px;font-size:14px;font-weight:600;cursor:pointer}
.iavica-btn-primary{background:#e8421a;color:#fff}
.iavica-btn-primary:hover{background:#cf3912}
.iavica-btn-ghost{background:#f2f2f2;color:#222}
.iavica-tip{position:fixed;left:50%;bottom:calc(14px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:${Z};display:flex;align-items:center;gap:10px;width:max-content;max-width:min(560px,calc(100vw - 24px));padding:10px 8px 10px 14px;background:#fff;color:#1a1a1a;border:1px solid #f1c7b8;border-left:4px solid #e8421a;border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.18);font:14px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;box-sizing:border-box;text-align:left}
.iavica-tip a{color:#e8421a;font-weight:600;text-decoration:underline}
.iavica-tip button{flex:none;background:none;border:none;font-size:20px;line-height:1;cursor:pointer;color:#777;padding:4px 8px;border-radius:6px}
.iavica-tip button:hover{background:#f2f2f2;color:#222}
.iavica-prompt{width:100%;min-height:200px;max-height:45vh;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;padding:10px;border:1px solid #ddd;border-radius:8px;background:#fafafa;color:#222;resize:vertical}
`;
  (document.head || document.documentElement).appendChild(style);
}

// ---------------------------------------------------------------------------
// Connecting dialog
// ---------------------------------------------------------------------------

export interface PendingDialog {
  close(): void;
}

/**
 * Shown while waiting for the user to approve the magic link. Closing it only
 * hides it: the SDK keeps waiting and connects as soon as the link is approved.
 */
export function showPendingDialog(email: string): PendingDialog {
  let overlay: HTMLDivElement | null = null;
  let closed = false;
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };
  function close() {
    closed = true;
    document.removeEventListener('keydown', onKey);
    overlay?.remove();
    overlay = null;
  }

  whenBody(() => {
    if (closed) return;
    ensureStyles();
    document.getElementById('iavica-pending-overlay')?.remove();
    const text = t();
    overlay = document.createElement('div');
    overlay.id = 'iavica-pending-overlay';
    overlay.className = 'iavica-overlay';
    overlay.innerHTML = `
      <div class="iavica-dialog" role="dialog" aria-modal="true" aria-labelledby="iavica-pending-title" aria-live="polite" style="max-width:360px;padding:32px 28px 26px;text-align:center">
        <button type="button" class="iavica-close" id="iavica-pending-close" aria-label="${escapeHtml(text.close)}">&times;</button>
        <div class="iavica-spinner" aria-hidden="true"></div>
        <h2 id="iavica-pending-title" style="margin:0 0 8px;font-size:18px;font-weight:600">${brandHtml(text.connectingTitle)}</h2>
        <p style="margin:0;font-size:14px;color:#444">${escapeHtml(text.checkEmail)}</p>
        <p style="margin:12px 0 0;font-size:12px;color:#888">${escapeHtml(text.sentTo)} <strong style="color:#555">${escapeHtml(email)}</strong></p>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#iavica-pending-close')?.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
  });

  return { close };
}

// ---------------------------------------------------------------------------
// Error dialog
// ---------------------------------------------------------------------------

type ErrorKind = 'runtime' | 'sdk' | 'api';

interface CollectedError {
  kind: ErrorKind;
  message: string;
  file?: string;
  line?: number;
  column?: number;
  stack?: string;
}

const MAX_ERRORS = 5;
const errors: CollectedError[] = [];
let dialogEnabled = true;
let dialogDismissed = false;
let renderTimer: ReturnType<typeof setTimeout> | null = null;

// Runtime conditions an app is expected to handle, or that are not a code bug:
// do not tell the user to ask their AI about them.
const IGNORED_MESSAGES = [
  /^Script error\.?$/i, // cross-origin script, no details available
  /ResizeObserver loop/i,
  /Failed to fetch|NetworkError|Load failed|network error/i, // offline
  /Access denied by user|Link request (expired|timed out)/i,
  /^Not authenticated$/i,
];
const IGNORED_CODES = new Set([
  'AUTH_REQUIRED',
  'SESSION_EXPIRED',
  'ACCESS_DENIED',
  'LINK_EXPIRED',
  'RATE_LIMITED',
  'QUOTA_EXCEEDED',
  'VERSION_CONFLICT',
  'NOT_FOUND',
  'SERVICE_UNAVAILABLE',
]);

function baseName(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const clean = url.split(/[?#]/)[0];
    return decodeURIComponent(clean.substring(clean.lastIndexOf('/') + 1)) || url;
  } catch {
    return url;
  }
}

function cleanStack(stack: string | undefined, message: string): string | undefined {
  if (!stack) return undefined;
  const lines = stack
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.includes(message))
    .map((l) => l.replace(/(?:file|https?):\/\/[^\s)]*\/([^/\s):]+)/g, '$1'))
    .slice(0, 5);
  return lines.length ? lines.join('\n') : undefined;
}

function shouldIgnore(message: string, code?: string): boolean {
  if (code && IGNORED_CODES.has(code)) return true;
  return IGNORED_MESSAGES.some((re) => re.test(message));
}

/** Record an error and show (or refresh) the dialog. */
export function reportError(input: CollectedError & { code?: string }): void {
  if (typeof document === 'undefined') return; // not a browser page (e.g. Node)
  if (!dialogEnabled || dialogDismissed) return;
  if (!input.message || shouldIgnore(input.message, input.code)) return;
  const key = `${input.message}|${input.line ?? ''}|${input.column ?? ''}`;
  if (errors.some((e) => `${e.message}|${e.line ?? ''}|${e.column ?? ''}` === key)) return;
  if (errors.length >= MAX_ERRORS) return;
  errors.push(input);
  // Small delay: errors usually come in bursts; show them in one dialog.
  if (renderTimer) clearTimeout(renderTimer);
  renderTimer = setTimeout(() => whenBody(renderErrorDialog), 250);
}

export function buildFixPrompt(): string {
  const text = t();
  const out: string[] = [text.promptIntro.replace('SDK_URL', SDK_URL).replace('SDK_VERSION', SDK_VERSION), '', text.detected];
  errors.forEach((e, i) => {
    out.push(`${i + 1}. ${e.message}`);
    const where = [
      e.file ? `${text.at} ${e.file}` : '',
      e.line ? `${text.line} ${e.line}` : '',
      e.column ? `${text.column} ${e.column}` : '',
    ].filter(Boolean);
    if (where.length) out.push(`   ${where.join(', ')}`);
    // Skip stack frames that only repeat the location printed above.
    const here = e.file && e.line ? `${e.file}:${e.line}:${e.column ?? ''}`.replace(/:$/, '') : null;
    const frames = (e.stack || '').split('\n').filter((l) => l && !(here && l.replace(/^at\s+/, '') === here));
    if (frames.length) out.push(frames.map((l) => `   ${l}`).join('\n'));
  });

  const hints = new Set<string>();
  for (const e of errors) {
    if (/null|undefined/i.test(e.message) && /(reading|access|properties|property)/i.test(e.message)) hints.add(text.hintNull);
    if (/is not defined|not defined/i.test(e.message)) hints.add(text.hintReference);
    if (e.kind === 'sdk') hints.add(text.hintSdk);
    if (e.kind === 'api') hints.add(text.hintApi);
  }
  hints.add(text.hintUnhandled);

  out.push('', text.rules, `- ${text.keep}`, `- ${text.whole}`);
  hints.forEach((h) => out.push(`- ${h}`));
  out.push(`- ${text.follow}`);
  return out.join('\n');
}

function copyText(value: string, textarea: HTMLTextAreaElement): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(value).catch(() => legacyCopy(textarea));
  }
  return legacyCopy(textarea);
}

function legacyCopy(textarea: HTMLTextAreaElement): Promise<void> {
  textarea.focus();
  textarea.select();
  const ok = document.execCommand && document.execCommand('copy');
  return ok ? Promise.resolve() : Promise.reject(new Error('copy failed'));
}

function renderErrorDialog(): void {
  if (dialogDismissed || !errors.length) return;
  ensureStyles();
  const text = t();
  const prompt = buildFixPrompt();

  const current = document.getElementById('iavica-error-overlay');
  if (current) {
    const area = current.querySelector('textarea');
    if (area) area.value = prompt;
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = 'iavica-error-overlay';
  overlay.className = 'iavica-overlay';
  overlay.innerHTML = `
    <div class="iavica-dialog" role="alertdialog" aria-modal="true" aria-labelledby="iavica-error-title" aria-describedby="iavica-error-intro" style="max-width:560px;padding:26px 24px 22px">
      <button type="button" class="iavica-close" id="iavica-error-close" aria-label="${escapeHtml(text.close)}">&times;</button>
      <h2 id="iavica-error-title" style="margin:0 0 8px;padding-right:28px;font-size:18px;font-weight:600">⚠️ ${escapeHtml(text.errorTitle)}</h2>
      <p id="iavica-error-intro" style="margin:0 0 14px;font-size:14px;line-height:1.5;color:#444">${brandHtml(text.errorIntro)}</p>
      <textarea class="iavica-prompt" id="iavica-error-prompt" readonly spellcheck="false"></textarea>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px;flex-wrap:wrap">
        <button type="button" class="iavica-btn iavica-btn-ghost" id="iavica-error-dismiss">${escapeHtml(text.close)}</button>
        <button type="button" class="iavica-btn iavica-btn-primary" id="iavica-error-copy">${escapeHtml(text.copy)}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const area = overlay.querySelector('#iavica-error-prompt') as HTMLTextAreaElement;
  area.value = prompt;
  const copyBtn = overlay.querySelector('#iavica-error-copy') as HTMLButtonElement;
  copyBtn.addEventListener('click', () => {
    copyText(area.value, area)
      .then(() => {
        copyBtn.textContent = text.copied;
        setTimeout(() => (copyBtn.textContent = text.copy), 2000);
      })
      .catch(() => {
        area.focus();
        area.select();
      });
  });

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };
  function close() {
    dialogDismissed = true;
    document.removeEventListener('keydown', onKey);
    overlay.remove();
  }
  overlay.querySelector('#iavica-error-close')?.addEventListener('click', close);
  overlay.querySelector('#iavica-error-dismiss')?.addEventListener('click', close);
  document.addEventListener('keydown', onKey);
}

/**
 * Listen for errors in the page from the moment the SDK script loads, so an
 * app that breaks before calling Iavica.connect() is still reported.
 * Opt out with <script src=".../iavica.js" data-error-dialog="off">.
 */
export function installErrorReporter(): void {
  if (typeof window === 'undefined' || (window as any).__iavicaErrorReporter) return;
  (window as any).__iavicaErrorReporter = true;
  try {
    const script = document.currentScript as HTMLScriptElement | null;
    if (script?.dataset.errorDialog === 'off') dialogEnabled = false;
  } catch {
    // ignore
  }

  window.addEventListener('error', (event: ErrorEvent) => {
    // Resource load errors (img, script…) do not bubble to this listener.
    const err = event.error as (Error & { code?: string }) | undefined;
    if ((err as any)?.iavicaReported) return;
    reportError({
      kind: 'runtime',
      message: err ? `${err.name || 'Error'}: ${err.message}` : event.message,
      code: err?.code,
      file: baseName(event.filename),
      line: event.lineno || undefined,
      column: event.colno || undefined,
      stack: cleanStack(err?.stack, err?.message || ''),
    });
  });

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reason = event.reason as (Error & { code?: string }) | string | undefined;
    if (!reason) return;
    if (typeof reason === 'string') {
      reportError({ kind: 'runtime', message: `Unhandled promise rejection: ${reason}` });
      return;
    }
    if ((reason as any).iavicaReported) return;
    const iavicaSdk = (reason as any).iavicaKind as ErrorKind | undefined;
    reportError({
      kind: iavicaSdk || 'runtime',
      message: `${reason.name || 'Error'}: ${reason.message} (unhandled promise rejection)`,
      code: reason.code,
      stack: cleanStack(reason.stack, reason.message || ''),
    });
  });
}

// ---------------------------------------------------------------------------
// Phone tip (approved wording, 2026-11-21)
// ---------------------------------------------------------------------------

const TIP_KEY = 'iavica_tip_phone:';

/**
 * Once per app and browser, after connecting, when the app runs from a file on
 * disk: how to get it on the phone. Never blocks the app; closes with ✕ or Esc.
 */
export function maybeShowPhoneTip(appId: string): void {
  try {
    if (location.protocol !== 'file:') return;
    if (localStorage.getItem(TIP_KEY + appId)) return;
    localStorage.setItem(TIP_KEY + appId, new Date().toISOString());
  } catch {
    return; // no storage: better never than on every load
  }
  whenBody(() => {
    if (document.querySelector('.iavica-tip')) return;
    ensureStyles();
    const tip = document.createElement('div');
    tip.className = 'iavica-tip';
    tip.setAttribute('role', 'status');
    const text = document.createElement('span');
    const [before, after] = t().phoneTip.split('{link}');
    const link = document.createElement('a');
    link.href = 'https://iavica.com/account/';
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'iavica.com/account';
    text.append(before, link, after);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-label', t().close);
    btn.textContent = '\u00d7';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    function close() {
      tip.remove();
      document.removeEventListener('keydown', onKey);
    }
    btn.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    tip.append(text, btn);
    document.body.appendChild(tip);
  });
}
