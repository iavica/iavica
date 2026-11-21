/*! iavica SDK 1.0.0 · https://iavica.com/developers/#versions */
var Iavica = (function (exports) {
    'use strict';

    // UI shown by the SDK itself, outside the app's own markup:
    //  - the "connecting" dialog while the user approves the magic link by email;
    //  - the error dialog: when the app breaks, explain it and hand the user a
    //    ready-made prompt for the AI that wrote the app. We never fix the app
    //    ourselves; the user's AI does.
    const Z = 2147483000;
    const STYLE_ID = 'iavica-sdk-style';
    const TEXT = {
        en: {
            connectingTitle: 'Connecting to iavica…',
            checkEmail: 'Check your email to accept the connection.',
            sentTo: 'Link sent to',
            close: 'Close',
            errorTitle: 'This app has an error',
            errorIntro: 'Something in the app code is not working. Your data is safe. Copy this message and paste it to the AI that created the app (ChatGPT, Claude, Gemini…) so it can fix it.',
            copy: 'Copy message',
            copied: 'Copied ✓',
            promptIntro: 'My HTML app uses iavica (SDK_URL, version SDK_VERSION) to store its data, and it has errors that stop it from working. Fix them and give me back the complete HTML file.',
            detected: 'Errors detected:',
            at: 'at',
            line: 'line',
            column: 'column',
            rules: 'When fixing it:',
            keep: 'Keep the same appId and the iavica integration (Iavica.connect, db.ready, collections).',
            whole: 'Review the whole file, not only the line of the error, in case there are more problems of the same kind.',
            follow: 'Follow the iavica instructions for AI assistants: https://iavica.com/ai/',
            hintNull: 'A "null" error when using addEventListener, value, textContent, classList, etc. means the JavaScript looks up an element by id that does not exist in the HTML. Add the HTML for every element the code uses (for example every $(\'id\') or getElementById(\'id\')).',
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
            errorTitle: 'Esta app tiene un error',
            errorIntro: 'Algo en el código de la app no funciona. Tus datos están a salvo. Copia este mensaje y pégaselo a la IA que creó la app (ChatGPT, Claude, Gemini…) para que lo corrija.',
            copy: 'Copiar mensaje',
            copied: 'Copiado ✓',
            promptIntro: 'Mi app HTML usa iavica (SDK_URL, versión SDK_VERSION) para guardar los datos y tiene errores que impiden que funcione. Corrígelos y devuélveme el archivo HTML completo.',
            detected: 'Errores detectados:',
            at: 'en',
            line: 'línea',
            column: 'columna',
            rules: 'Al corregirlo:',
            keep: 'Mantén el mismo appId y la integración con iavica (Iavica.connect, db.ready, colecciones).',
            whole: 'Revisa todo el archivo, no solo la línea del error, por si hay más fallos del mismo tipo.',
            follow: 'Sigue las instrucciones de iavica para asistentes de IA: https://iavica.com/ai/',
            hintNull: 'Un error de "null" al usar addEventListener, value, textContent, classList, etc. significa que el JavaScript busca por id un elemento que no existe en el HTML. Añade el HTML de todos los elementos que usa el código (por ejemplo cada $(\'id\') o getElementById(\'id\')).',
            hintReference: 'Un error "is not defined" significa que se usa una función o variable que no está declarada, o que se declara más tarde o con otro nombre.',
            hintSdk: 'Se llama al SDK de iavica con argumentos incorrectos. Revisa las firmas correctas en https://iavica.com/ai/ (por ejemplo collection.update(id, data, { version: record.version })).',
            hintApi: 'La API de iavica rechazó los datos que envió la app (VALIDATION_ERROR). Revisa los nombres de colección, los datos de los registros y los parámetros con https://iavica.com/docs/api/.',
            hintUnhandled: 'Cada llamada al SDK de iavica (db.ready, add, list, update, remove) debe ir con await dentro de try/catch, y la app debe mostrar un mensaje claro al usuario cuando falle.',
        },
    };
    const SDK_VERSION = "1.0.0";
    // The URL this SDK was loaded from (kept in the fix prompt so the user's AI
    // keeps the same version); when unknown, the stable v1 URL.
    const SDK_URL = (() => {
        var _a;
        try {
            const src = (_a = document.currentScript) === null || _a === void 0 ? void 0 : _a.src;
            if (src && /^https?:/i.test(src))
                return src;
        }
        catch (_b) {
            // ignore
        }
        return 'https://iavica.com/sdk/v1/iavica.js';
    })();
    let configuredLocale = null;
    /** Called by Iavica.connect() with the app's locale. */
    function setUiLocale(locale) {
        if (locale === 'en' || locale === 'es')
            configuredLocale = locale;
    }
    function locale() {
        if (configuredLocale)
            return configuredLocale;
        try {
            const lang = (document.documentElement.lang || navigator.language || '').toLowerCase();
            return lang.startsWith('es') ? 'es' : 'en';
        }
        catch (_a) {
            return 'en';
        }
    }
    function t() {
        return TEXT[locale()];
    }
    function escapeHtml(value) {
        return value.replace(/[&<>"']/g, (ch) => ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '"' ? '&quot;' : '&#39;');
    }
    /** Escape text and paint the brand: always lowercase "iavica" in brand orange. */
    function brandHtml(text) {
        return escapeHtml(text).replace(/\biavica\b(?![.\w])/gi, '<span style="color:#e8421a;text-transform:none">iavica</span>');
    }
    function whenBody(fn) {
        if (document.body)
            fn();
        else
            document.addEventListener('DOMContentLoaded', fn, { once: true });
    }
    function ensureStyles() {
        if (document.getElementById(STYLE_ID))
            return;
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
.iavica-prompt{width:100%;min-height:200px;max-height:45vh;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;padding:10px;border:1px solid #ddd;border-radius:8px;background:#fafafa;color:#222;resize:vertical}
`;
        (document.head || document.documentElement).appendChild(style);
    }
    /**
     * Shown while waiting for the user to approve the magic link. Closing it only
     * hides it: the SDK keeps waiting and connects as soon as the link is approved.
     */
    function showPendingDialog(email) {
        let overlay = null;
        let closed = false;
        const onKey = (e) => {
            if (e.key === 'Escape')
                close();
        };
        function close() {
            closed = true;
            document.removeEventListener('keydown', onKey);
            overlay === null || overlay === void 0 ? void 0 : overlay.remove();
            overlay = null;
        }
        whenBody(() => {
            var _a, _b;
            if (closed)
                return;
            ensureStyles();
            (_a = document.getElementById('iavica-pending-overlay')) === null || _a === void 0 ? void 0 : _a.remove();
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
            (_b = overlay.querySelector('#iavica-pending-close')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', close);
            document.addEventListener('keydown', onKey);
        });
        return { close };
    }
    const MAX_ERRORS = 5;
    const errors = [];
    let dialogEnabled = true;
    let dialogDismissed = false;
    let renderTimer = null;
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
    function baseName(url) {
        if (!url)
            return undefined;
        try {
            const clean = url.split(/[?#]/)[0];
            return decodeURIComponent(clean.substring(clean.lastIndexOf('/') + 1)) || url;
        }
        catch (_a) {
            return url;
        }
    }
    function cleanStack(stack, message) {
        if (!stack)
            return undefined;
        const lines = stack
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l && !l.includes(message))
            .map((l) => l.replace(/(?:file|https?):\/\/[^\s)]*\/([^/\s):]+)/g, '$1'))
            .slice(0, 5);
        return lines.length ? lines.join('\n') : undefined;
    }
    function shouldIgnore(message, code) {
        if (code && IGNORED_CODES.has(code))
            return true;
        return IGNORED_MESSAGES.some((re) => re.test(message));
    }
    /** Record an error and show (or refresh) the dialog. */
    function reportError(input) {
        var _a, _b;
        if (!dialogEnabled || dialogDismissed)
            return;
        if (!input.message || shouldIgnore(input.message, input.code))
            return;
        const key = `${input.message}|${(_a = input.line) !== null && _a !== void 0 ? _a : ''}|${(_b = input.column) !== null && _b !== void 0 ? _b : ''}`;
        if (errors.some((e) => { var _a, _b; return `${e.message}|${(_a = e.line) !== null && _a !== void 0 ? _a : ''}|${(_b = e.column) !== null && _b !== void 0 ? _b : ''}` === key; }))
            return;
        if (errors.length >= MAX_ERRORS)
            return;
        errors.push(input);
        // Small delay: errors usually come in bursts; show them in one dialog.
        if (renderTimer)
            clearTimeout(renderTimer);
        renderTimer = setTimeout(() => whenBody(renderErrorDialog), 250);
    }
    function buildFixPrompt() {
        const text = t();
        const out = [text.promptIntro.replace('SDK_URL', SDK_URL).replace('SDK_VERSION', SDK_VERSION), '', text.detected];
        errors.forEach((e, i) => {
            var _a;
            out.push(`${i + 1}. ${e.message}`);
            const where = [
                e.file ? `${text.at} ${e.file}` : '',
                e.line ? `${text.line} ${e.line}` : '',
                e.column ? `${text.column} ${e.column}` : '',
            ].filter(Boolean);
            if (where.length)
                out.push(`   ${where.join(', ')}`);
            // Skip stack frames that only repeat the location printed above.
            const here = e.file && e.line ? `${e.file}:${e.line}:${(_a = e.column) !== null && _a !== void 0 ? _a : ''}`.replace(/:$/, '') : null;
            const frames = (e.stack || '').split('\n').filter((l) => l && !(here && l.replace(/^at\s+/, '') === here));
            if (frames.length)
                out.push(frames.map((l) => `   ${l}`).join('\n'));
        });
        const hints = new Set();
        for (const e of errors) {
            if (/null|undefined/i.test(e.message) && /(reading|access|properties|property)/i.test(e.message))
                hints.add(text.hintNull);
            if (/is not defined|not defined/i.test(e.message))
                hints.add(text.hintReference);
            if (e.kind === 'sdk')
                hints.add(text.hintSdk);
            if (e.kind === 'api')
                hints.add(text.hintApi);
        }
        hints.add(text.hintUnhandled);
        out.push('', text.rules, `- ${text.keep}`, `- ${text.whole}`);
        hints.forEach((h) => out.push(`- ${h}`));
        out.push(`- ${text.follow}`);
        return out.join('\n');
    }
    function copyText(value, textarea) {
        var _a;
        if ((_a = navigator.clipboard) === null || _a === void 0 ? void 0 : _a.writeText) {
            return navigator.clipboard.writeText(value).catch(() => legacyCopy(textarea));
        }
        return legacyCopy(textarea);
    }
    function legacyCopy(textarea) {
        textarea.focus();
        textarea.select();
        const ok = document.execCommand && document.execCommand('copy');
        return ok ? Promise.resolve() : Promise.reject(new Error('copy failed'));
    }
    function renderErrorDialog() {
        var _a, _b;
        if (dialogDismissed || !errors.length)
            return;
        ensureStyles();
        const text = t();
        const prompt = buildFixPrompt();
        const current = document.getElementById('iavica-error-overlay');
        if (current) {
            const area = current.querySelector('textarea');
            if (area)
                area.value = prompt;
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
        const area = overlay.querySelector('#iavica-error-prompt');
        area.value = prompt;
        const copyBtn = overlay.querySelector('#iavica-error-copy');
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
        const onKey = (e) => {
            if (e.key === 'Escape')
                close();
        };
        function close() {
            dialogDismissed = true;
            document.removeEventListener('keydown', onKey);
            overlay.remove();
        }
        (_a = overlay.querySelector('#iavica-error-close')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', close);
        (_b = overlay.querySelector('#iavica-error-dismiss')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', close);
        document.addEventListener('keydown', onKey);
    }
    /**
     * Listen for errors in the page from the moment the SDK script loads, so an
     * app that breaks before calling Iavica.connect() is still reported.
     * Opt out with <script src=".../iavica.js" data-error-dialog="off">.
     */
    function installErrorReporter() {
        if (typeof window === 'undefined' || window.__iavicaErrorReporter)
            return;
        window.__iavicaErrorReporter = true;
        try {
            const script = document.currentScript;
            if ((script === null || script === void 0 ? void 0 : script.dataset.errorDialog) === 'off')
                dialogEnabled = false;
        }
        catch (_a) {
            // ignore
        }
        window.addEventListener('error', (event) => {
            // Resource load errors (img, script…) do not bubble to this listener.
            const err = event.error;
            if (err === null || err === void 0 ? void 0 : err.iavicaReported)
                return;
            reportError({
                kind: 'runtime',
                message: err ? `${err.name || 'Error'}: ${err.message}` : event.message,
                code: err === null || err === void 0 ? void 0 : err.code,
                file: baseName(event.filename),
                line: event.lineno || undefined,
                column: event.colno || undefined,
                stack: cleanStack(err === null || err === void 0 ? void 0 : err.stack, (err === null || err === void 0 ? void 0 : err.message) || ''),
            });
        });
        window.addEventListener('unhandledrejection', (event) => {
            const reason = event.reason;
            if (!reason)
                return;
            if (typeof reason === 'string') {
                reportError({ kind: 'runtime', message: `Unhandled promise rejection: ${reason}` });
                return;
            }
            if (reason.iavicaReported)
                return;
            const iavicaSdk = reason.iavicaKind;
            reportError({
                kind: iavicaSdk || 'runtime',
                message: `${reason.name || 'Error'}: ${reason.message} (unhandled promise rejection)`,
                code: reason.code,
                stack: cleanStack(reason.stack, reason.message || ''),
            });
        });
    }

    // Default API base when `apiBaseUrl` is not given:
    // - loaded over http(s) (e.g. https://iavica.com/sdk/v1/iavica.js) → same origin + /v1,
    //   so a self-hosted or local Docker stack works without configuration;
    // - loaded from disk (file://) or as an ES module → the hosted service.
    const HOSTED_API_BASE = 'https://iavica.com/v1';
    // Start listening for page errors as soon as the SDK script loads.
    installErrorReporter();
    const DEFAULT_API_BASE = (() => {
        var _a;
        try {
            const src = typeof document !== 'undefined'
                ? (_a = document.currentScript) === null || _a === void 0 ? void 0 : _a.src
                : undefined;
            if (src && /^https?:/i.test(src))
                return `${new URL(src).origin}/v1`;
        }
        catch (_b) {
            // Fall through to the hosted default.
        }
        return HOSTED_API_BASE;
    })();
    const EN_LABELS = {
        connectTitle: 'Connect to iavica',
        connectHint: 'Enter your email to link this app to your account.',
        emailPlaceholder: 'you@example.com',
        sendMagicLink: 'Send magic link',
        invalidEmail: 'Enter a valid email',
        close: 'Close',
        chooseProjectTitle: 'Choose a project',
        chooseProjectHint: 'You have access to several projects for this app.',
        owner: 'Owner',
        sharedEditor: 'Shared (editor)',
        createOwnProject: 'Create my own project',
    };
    const ES_LABELS = {
        connectTitle: 'Conectar con iavica',
        connectHint: 'Introduce tu email para vincular esta app a tu cuenta.',
        emailPlaceholder: 'tu@ejemplo.com',
        sendMagicLink: 'Enviar enlace mágico',
        invalidEmail: 'Introduce un email válido',
        close: 'Cerrar',
        chooseProjectTitle: 'Elige un proyecto',
        chooseProjectHint: 'Tienes acceso a varios proyectos para esta app.',
        owner: 'Propietario',
        sharedEditor: 'Compartido (editor)',
        createOwnProject: 'Crear mi propio proyecto',
    };
    function isSelectionResult(json) {
        return json.status === 'selection_required';
    }
    const DEVICE_TOKEN_KEY_PREFIX = 'iavica_device_token:';
    const DEVICE_EMAIL_KEY_PREFIX = 'iavica_email:';
    const VISITOR_ID_KEY = 'iavica_visitor_id';
    class IavicaDatabase {
        constructor(config) {
            this.config = config;
            this.token = null;
            this.deviceToken = null;
            this.status = 'disconnected';
            this.role = null;
            this.projectName = null;
            this.currentProjectId = null;
            this.listeners = new Map();
            this.abortController = null;
            this.pendingDialog = null;
            setUiLocale(config.locale);
        }
        get appId() {
            return this.config.appId;
        }
        getRole() {
            return this.role;
        }
        getProjectName() {
            return this.projectName;
        }
        getProjectId() {
            return this.currentProjectId;
        }
        get labels() {
            const base = this.config.locale === 'es' ? ES_LABELS : EN_LABELS;
            return Object.assign(Object.assign({}, base), (this.config.labels || {}));
        }
        get baseUrl() {
            return (this.config.apiBaseUrl || DEFAULT_API_BASE).replace(/\/$/, '');
        }
        on(event, handler) {
            if (!this.listeners.has(event)) {
                this.listeners.set(event, new Set());
            }
            this.listeners.get(event).add(handler);
            return () => {
                var _a;
                (_a = this.listeners.get(event)) === null || _a === void 0 ? void 0 : _a.delete(handler);
            };
        }
        emit(event, payload) {
            var _a;
            (_a = this.listeners.get(event)) === null || _a === void 0 ? void 0 : _a.forEach((h) => {
                try {
                    h(payload);
                }
                catch (_a) {
                    // ignore
                }
            });
        }
        setStatus(status) {
            this.status = status;
            this.emit('status', status);
        }
        deviceTokenKey() {
            return `${DEVICE_TOKEN_KEY_PREFIX}${this.config.appId}`;
        }
        deviceEmailKey() {
            return `${DEVICE_EMAIL_KEY_PREFIX}${this.config.appId}`;
        }
        saveDeviceToken(deviceToken, email) {
            try {
                localStorage.setItem(this.deviceTokenKey(), deviceToken);
                localStorage.setItem(this.deviceEmailKey(), email);
            }
            catch (_a) {
                // localStorage may be unavailable or restricted; ignore.
            }
        }
        loadDeviceToken() {
            try {
                const token = localStorage.getItem(this.deviceTokenKey());
                const email = localStorage.getItem(this.deviceEmailKey());
                if (token && email)
                    return { token, email };
            }
            catch (_a) {
                // ignore
            }
            return null;
        }
        clearDeviceToken() {
            try {
                localStorage.removeItem(this.deviceTokenKey());
                localStorage.removeItem(this.deviceEmailKey());
            }
            catch (_a) {
                // ignore
            }
        }
        getVisitorId() {
            var _a;
            try {
                let id = localStorage.getItem(VISITOR_ID_KEY);
                if (!id) {
                    const random = typeof ((_a = globalThis.crypto) === null || _a === void 0 ? void 0 : _a.randomUUID) === 'function'
                        ? globalThis.crypto.randomUUID()
                        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
                    id = random;
                    localStorage.setItem(VISITOR_ID_KEY, id);
                }
                return id;
            }
            catch (_b) {
                return 'unknown';
            }
        }
        trackAppOpen(event) {
            if (typeof fetch !== 'function')
                return;
            const headers = { 'Content-Type': 'application/json' };
            if (this.token)
                headers.Authorization = `Bearer ${this.token}`;
            fetch(`${this.baseUrl}/telemetry/app-open`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    appId: this.config.appId,
                    visitorId: this.getVisitorId(),
                    event,
                }),
            }).catch(() => {
                // Telemetry is best-effort; never break the app.
            });
        }
        async ready() {
            if (this.token)
                return;
            this.setStatus('connecting');
            this.trackAppOpen('opened');
            // Try to refresh from a saved device token first.
            const saved = this.loadDeviceToken();
            if (saved) {
                const refreshed = await this.refreshFromDeviceToken(saved.token);
                if (refreshed) {
                    this.deviceToken = saved.token;
                    this.setStatus('connected');
                    this.trackAppOpen('connected');
                    return;
                }
                // Saved token invalid: clear and fall through to email flow.
                this.clearDeviceToken();
            }
            if (this.config.devModeToken) {
                await this.bootstrapDev();
                this.trackAppOpen('connected');
                return;
            }
            const email = await this.promptEmail();
            if (!email) {
                this.setStatus('disconnected');
                return;
            }
            await this.startEmailFlow(email);
            if (this.status === 'connected') {
                this.trackAppOpen('connected');
            }
        }
        stopPolling() {
            if (this.abortController) {
                this.abortController.abort();
                this.abortController = null;
            }
        }
        async bootstrapDev() {
            var _a, _b, _c;
            const res = await fetch(`${this.baseUrl}/dev/bootstrap`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Iavica-Dev-Token': this.config.devModeToken || '',
                },
                body: JSON.stringify({
                    appId: this.config.appId,
                    appName: this.config.appName,
                }),
            });
            if (!res.ok) {
                const body = await this.parseError(res);
                this.setStatus('error');
                throw apiError(body, res.status, `Bootstrap failed: ${res.status}`);
            }
            const json = (await res.json());
            this.token = json.token;
            this.currentProjectId = (_a = json.projectId) !== null && _a !== void 0 ? _a : null;
            this.role = (_b = json.role) !== null && _b !== void 0 ? _b : null;
            this.projectName = (_c = json.projectName) !== null && _c !== void 0 ? _c : null;
            if (json.deviceToken) {
                this.deviceToken = json.deviceToken;
                this.saveDeviceToken(json.deviceToken, 'dev@iavica.local');
            }
            this.setStatus('connected');
        }
        async startEmailFlow(email) {
            this.setStatus('connecting');
            const res = await fetch(`${this.baseUrl}/link-requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    appId: this.config.appId,
                    appName: this.config.appName,
                    email,
                }),
            });
            if (!res.ok) {
                const body = await this.parseError(res);
                this.setStatus('error');
                throw apiError(body, res.status, `Link request failed: ${res.status}`);
            }
            const data = (await res.json());
            this.setStatus('pending');
            // "Connecting… check your email" while the user approves the link. Closing
            // it only hides it; polling continues until approved, denied or expired.
            this.pendingDialog = showPendingDialog(email);
            try {
                await this.pollAndRedeem(data.requestId, data.pollSecret, data.pollIntervalSeconds * 1000, email);
            }
            finally {
                this.closePendingDialog();
            }
        }
        closePendingDialog() {
            var _a;
            (_a = this.pendingDialog) === null || _a === void 0 ? void 0 : _a.close();
            this.pendingDialog = null;
        }
        async refreshFromDeviceToken(deviceToken) {
            var _a, _b, _c;
            try {
                const res = await fetch(`${this.baseUrl}/sessions/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ deviceToken }),
                });
                if (!res.ok)
                    return false;
                const json = (await res.json());
                this.token = json.token;
                this.currentProjectId = (_a = json.projectId) !== null && _a !== void 0 ? _a : null;
                this.role = (_b = json.role) !== null && _b !== void 0 ? _b : null;
                this.projectName = (_c = json.projectName) !== null && _c !== void 0 ? _c : null;
                return true;
            }
            catch (_d) {
                return false;
            }
        }
        async logout() {
            this.stopPolling();
            if (this.deviceToken) {
                try {
                    await fetch(`${this.baseUrl}/sessions/disconnect`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ deviceToken: this.deviceToken }),
                    });
                }
                catch (_a) {
                    // ignore network errors during logout; clear local state anyway.
                }
            }
            this.deviceToken = null;
            this.clearDeviceToken();
            this.token = null;
            this.currentProjectId = null;
            this.role = null;
            this.projectName = null;
            this.setStatus('disconnected');
        }
        async pollAndRedeem(requestId, pollSecret, intervalMs, email) {
            this.stopPolling();
            const controller = new AbortController();
            this.abortController = controller;
            const startAt = Date.now();
            const maxDuration = 10 * 60 * 1000; // 10 minutes fallback
            while (!controller.signal.aborted) {
                try {
                    const url = `${this.baseUrl}/link-requests/${requestId}/status`;
                    const statusRes = await fetch(url, {
                        headers: { 'X-Iavica-Link-Secret': pollSecret },
                        signal: controller.signal,
                    });
                    if (!statusRes.ok) {
                        if (statusRes.status === 410) {
                            this.setStatus('expired');
                            throw new Error('Link request expired');
                        }
                        // 404 may be a transient race between commit and visibility; retry.
                        if (statusRes.status === 404 || statusRes.status >= 500) {
                            if (Date.now() - startAt > maxDuration) {
                                this.setStatus('expired');
                                throw new Error('Link request timed out');
                            }
                            await this.delay(intervalMs);
                            continue;
                        }
                        const body = await this.parseError(statusRes);
                        throw apiError(body, statusRes.status, `Status check failed: ${statusRes.status}`);
                    }
                    const statusData = (await statusRes.json());
                    if (statusData.status === 'approved') {
                        await this.redeemWithSelection(requestId, pollSecret, email);
                        this.setStatus('connected');
                        return;
                    }
                    if (statusData.status === 'denied') {
                        this.setStatus('denied');
                        throw new Error('Access denied by user');
                    }
                    if (statusData.status === 'expired') {
                        this.setStatus('expired');
                        throw new Error('Link request expired');
                    }
                    if (Date.now() - startAt > maxDuration) {
                        this.setStatus('expired');
                        throw new Error('Link request timed out');
                    }
                    await this.delay(intervalMs);
                }
                catch (err) {
                    if (err.name === 'AbortError') {
                        this.setStatus('disconnected');
                        return;
                    }
                    this.setStatus('error');
                    throw err;
                }
            }
        }
        async redeemWithSelection(requestId, pollSecret, email) {
            var _a, _b, _c;
            let body = { appName: this.config.appName };
            while (true) {
                const redeemRes = await fetch(`${this.baseUrl}/link-requests/${requestId}/redeem`, {
                    method: 'POST',
                    headers: {
                        'X-Iavica-Link-Secret': pollSecret,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(body),
                });
                if (!redeemRes.ok) {
                    const errorBody = await this.parseError(redeemRes);
                    throw apiError(errorBody, redeemRes.status, `Redeem failed: ${redeemRes.status}`);
                }
                const json = (await redeemRes.json());
                if (isSelectionResult(json)) {
                    const choice = await this.promptProjectSelection(json.projects, !json.hasOwnProject);
                    body = Object.assign({ appName: this.config.appName }, (choice === 'create' ? { createOwnProject: true } : { projectId: choice }));
                    continue;
                }
                this.token = json.token;
                this.currentProjectId = (_a = json.projectId) !== null && _a !== void 0 ? _a : null;
                this.role = (_b = json.role) !== null && _b !== void 0 ? _b : null;
                this.projectName = (_c = json.projectName) !== null && _c !== void 0 ? _c : null;
                if (json.deviceToken) {
                    this.deviceToken = json.deviceToken;
                    this.saveDeviceToken(json.deviceToken, email);
                }
                return;
            }
        }
        async invite(email, role = 'editor') {
            if (!this.token || !this.currentProjectId) {
                throw new Error('Not authenticated');
            }
            const res = await fetch(`${this.baseUrl}/apps/${this.config.appId}/projects/${this.currentProjectId}/invitations`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, role }),
            });
            if (!res.ok) {
                const body = await this.parseError(res);
                throw apiError(body, res.status, `Invite failed: ${res.status}`);
            }
        }
        promptProjectSelection(projects, allowCreate) {
            this.closePendingDialog();
            return new Promise((resolve) => {
                var _a;
                const existing = document.getElementById('iavica-project-overlay');
                if (existing)
                    existing.remove();
                const overlay = document.createElement('div');
                overlay.id = 'iavica-project-overlay';
                overlay.setAttribute('style', 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:9999;font-family:system-ui,sans-serif;');
                const options = projects
                    .map((p) => {
                    const label = p.role === 'owner' ? this.labels.owner : this.labels.sharedEditor;
                    return `<button data-project-id="${this.escapeHtml(p.projectId)}" style="display:block;width:100%;text-align:left;padding:0.75rem;margin:0.4rem 0;cursor:pointer;border:1px solid #ccc;border-radius:0.375rem;background:#fff;">
            <strong>${this.escapeHtml(p.name)}</strong><br><span style="font-size:0.8rem;color:#666;">${this.escapeHtml(label)}</span>
          </button>`;
                })
                    .join('');
                const createButton = allowCreate
                    ? `<button id="iavica-project-create" style="display:block;width:100%;padding:0.75rem;margin-top:0.75rem;cursor:pointer;border:1px dashed #999;border-radius:0.375rem;background:#f7f7f7;">${this.escapeHtml(this.labels.createOwnProject)}</button>`
                    : '';
                overlay.innerHTML = `
        <div style="background:#fff;padding:2rem;border-radius:0.5rem;max-width:420px;width:90%;">
          <h2 style="margin-top:0;font-size:1.25rem;">${this.escapeHtml(this.labels.chooseProjectTitle)}</h2>
          <p style="font-size:0.875rem;color:#555;">${this.escapeHtml(this.labels.chooseProjectHint)}</p>
          ${options}
          ${createButton}
        </div>
      `;
                document.body.appendChild(overlay);
                overlay.querySelectorAll('button[data-project-id]').forEach((btn) => {
                    btn.addEventListener('click', () => {
                        const id = btn.getAttribute('data-project-id');
                        overlay.remove();
                        resolve(id);
                    });
                });
                (_a = document.getElementById('iavica-project-create')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => {
                    overlay.remove();
                    resolve('create');
                });
            });
        }
        escapeHtml(value) {
            return value.replace(/[&<>"']/g, (ch) => {
                switch (ch) {
                    case '&':
                        return '&amp;';
                    case '<':
                        return '&lt;';
                    case '>':
                        return '&gt;';
                    case '"':
                        return '&quot;';
                    default:
                        return '&#39;';
                }
            });
        }
        delay(ms) {
            return new Promise((resolve) => setTimeout(resolve, ms));
        }
        promptEmail() {
            return new Promise((resolve) => {
                const existing = document.getElementById('iavica-email-overlay');
                if (existing)
                    existing.remove();
                const overlay = document.createElement('div');
                overlay.id = 'iavica-email-overlay';
                overlay.setAttribute('style', 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:9999;font-family:system-ui,sans-serif;');
                overlay.innerHTML = `
        <div style="background:#fff;padding:2rem;border-radius:0.5rem;max-width:360px;width:90%;position:relative;">
          <button id="iavica-email-close" type="button" aria-label="${this.escapeHtml(this.labels.close)}" style="position:absolute;top:0.5rem;right:0.5rem;background:none;border:none;font-size:1.5rem;line-height:1;cursor:pointer;color:#666;padding:0.25rem;">&times;</button>
          <h2 style="margin-top:0;font-size:1.25rem;padding-right:1.5rem;">${brandHtml(this.labels.connectTitle)}</h2>
          <p style="font-size:0.875rem;color:#555;">${brandHtml(this.labels.connectHint)}</p>
          <input id="iavica-email" type="email" placeholder="${this.escapeHtml(this.labels.emailPlaceholder)}" style="width:100%;padding:0.5rem;margin:0.5rem 0;box-sizing:border-box;" />
          <div id="iavica-email-error" style="color:#c00;font-size:0.8rem;min-height:1rem;"></div>
          <button id="iavica-email-submit" style="width:100%;padding:0.6rem;margin-top:0.5rem;cursor:pointer;">${this.escapeHtml(this.labels.sendMagicLink)}</button>
        </div>
      `;
                document.body.appendChild(overlay);
                const input = document.getElementById('iavica-email');
                const errorEl = document.getElementById('iavica-email-error');
                const btn = document.getElementById('iavica-email-submit');
                const closeBtn = document.getElementById('iavica-email-close');
                const onKey = (e) => {
                    if (e.key === 'Escape')
                        close();
                };
                function close() {
                    document.removeEventListener('keydown', onKey);
                    overlay.remove();
                    resolve(null);
                }
                closeBtn.addEventListener('click', close);
                document.addEventListener('keydown', onKey);
                btn.addEventListener('click', () => {
                    const email = input.value.trim();
                    if (!email || !email.includes('@')) {
                        errorEl.textContent = this.labels.invalidEmail;
                        return;
                    }
                    document.removeEventListener('keydown', onKey);
                    overlay.remove();
                    resolve(email);
                });
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter')
                        btn.click();
                });
            });
        }
        disconnect() {
            this.stopPolling();
            this.token = null;
            this.currentProjectId = null;
            this.role = null;
            this.projectName = null;
            this.setStatus('disconnected');
        }
        isConnected() {
            return this.status === 'connected' && !!this.token;
        }
        collection(name) {
            return new IavicaCollection(this, name);
        }
        async request(path, options = {}) {
            var _a, _b;
            if (!this.token) {
                throw new Error('Not authenticated');
            }
            const headers = Object.assign({ Authorization: `Bearer ${this.token}` }, options.headers);
            const res = await fetch(`${this.baseUrl}${path}`, Object.assign(Object.assign({}, options), { headers }));
            if (!res.ok) {
                const body = await this.parseError(res);
                const message = ((_a = body === null || body === void 0 ? void 0 : body.error) === null || _a === void 0 ? void 0 : _a.message) || `HTTP ${res.status}`;
                if (res.status === 401) {
                    // Session expired: try to refresh from device token, otherwise mark expired.
                    const saved = this.loadDeviceToken();
                    if (saved) {
                        const refreshed = await this.refreshFromDeviceToken(saved.token);
                        if (refreshed) {
                            return this.request(path, options);
                        }
                    }
                    this.setStatus('expired');
                }
                const err = apiError(body, res.status, message);
                if (res.status === 409 && !err.code)
                    err.code = 'VERSION_CONFLICT';
                if (err.code === 'VALIDATION_ERROR') {
                    // The app sent something the API rejects: a bug in the app's code.
                    const method = (options.method || 'GET').toUpperCase();
                    const details = ((_b = body === null || body === void 0 ? void 0 : body.error) === null || _b === void 0 ? void 0 : _b.details) ? ` ${JSON.stringify(body.error.details).slice(0, 400)}` : '';
                    reportError({
                        kind: 'api',
                        code: 'APP_BUG',
                        message: `iavica API ${res.status} VALIDATION_ERROR on ${method} ${path.split('?')[0]}: ${message}${details}`,
                        stack: cleanCallerStack(new Error().stack),
                    });
                    err.iavicaReported = true;
                }
                throw err;
            }
            if (res.status === 204)
                return undefined;
            return res.json();
        }
        async parseError(res) {
            try {
                return (await res.json());
            }
            catch (_a) {
                return null;
            }
        }
    }
    class IavicaCollection {
        constructor(db, name) {
            this.db = db;
            this.name = name;
        }
        async add(data, _opts) {
            return this.db.request(`/apps/${this.db.appId}/collections/${this.name}/records`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data }),
            });
        }
        async list(opts = {}) {
            const params = new URLSearchParams();
            if (opts.limit)
                params.set('limit', String(opts.limit));
            if (opts.cursor)
                params.set('cursor', opts.cursor);
            const query = params.toString();
            return this.db.request(`/apps/${this.db.appId}/collections/${this.name}/records${query ? '?' + query : ''}`);
        }
        async get(id) {
            return this.db.request(`/apps/${this.db.appId}/collections/${this.name}/records/${id}`);
        }
        /**
         * Update a record with optimistic concurrency. Canonical form:
         *   update(id, data, { version })
         * Also accepted (older docs, already used by generated apps):
         *   update(id, { data, version })
         */
        async update(id, data, options) {
            let payload = data;
            let version = typeof options === 'number' ? options : options === null || options === void 0 ? void 0 : options.version;
            if (version === undefined && isWrappedUpdate(data)) {
                payload = data.data;
                version = data.version;
            }
            if (typeof version !== 'number' || !Number.isFinite(version)) {
                throw usageError('update() needs the record version: collection.update(id, data, { version: record.version })');
            }
            return this.db.request(`/apps/${this.db.appId}/collections/${this.name}/records/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'If-Match': String(version) },
                body: JSON.stringify({ data: payload }),
            });
        }
        /** Delete a record: remove(id, { version }) — remove(id, version) also accepted. */
        async remove(id, options) {
            const version = typeof options === 'number' ? options : options === null || options === void 0 ? void 0 : options.version;
            if (typeof version !== 'number' || !Number.isFinite(version)) {
                throw usageError('remove() needs the record version: collection.remove(id, { version: record.version })');
            }
            return this.db.request(`/apps/${this.db.appId}/collections/${this.name}/records/${id}`, {
                method: 'DELETE',
                headers: { 'If-Match': String(version) },
            });
        }
    }
    // `{ data: {...}, version: n }` as the second argument of update().
    function isWrappedUpdate(value) {
        if (!value || typeof value !== 'object')
            return false;
        const v = value;
        return (typeof v.version === 'number' &&
            !!v.data &&
            typeof v.data === 'object' &&
            !Array.isArray(v.data) &&
            Object.keys(v).every((k) => k === 'data' || k === 'version'));
    }
    function usageError(message) {
        const err = new Error(message);
        err.code = 'VALIDATION_ERROR';
        err.iavicaKind = 'sdk';
        err.iavicaReported = true;
        reportError({ kind: 'sdk', code: 'APP_BUG', message: `iavica SDK: ${message}`, stack: cleanCallerStack(err.stack) });
        return err;
    }
    function apiError(body, status, fallback) {
        var _a, _b, _c;
        const err = new Error(((_a = body === null || body === void 0 ? void 0 : body.error) === null || _a === void 0 ? void 0 : _a.message) || fallback);
        err.code = (_b = body === null || body === void 0 ? void 0 : body.error) === null || _b === void 0 ? void 0 : _b.code;
        err.status = status;
        err.details = (_c = body === null || body === void 0 ? void 0 : body.error) === null || _c === void 0 ? void 0 : _c.details;
        return err;
    }
    // Keep only the app's own frames (drop the SDK's) so the AI sees its code.
    function cleanCallerStack(stack) {
        if (!stack)
            return undefined;
        const frames = stack
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => /:\d+:\d+\)?$/.test(l) && !/iavica(\.esm)?(\.min)?\.js/.test(l))
            .map((l) => l.replace(/(?:file|https?):\/\/[^\s)]*\/([^/\s):]+)/g, '$1'))
            .slice(0, 5);
        return frames.length ? frames.join('\n') : undefined;
    }
    /** SDK version (semver), replaced at build time. */
    const version = "1.0.0";
    function connect(config) {
        return new IavicaDatabase(config);
    }
    if (typeof window !== 'undefined') {
        window.Iavica = { connect, version };
    }

    exports.IavicaDatabase = IavicaDatabase;
    exports.connect = connect;
    exports.version = version;

    return exports;

})({});
//# sourceMappingURL=iavica.js.map
