import {
  brandHtml,
  installErrorReporter,
  maybeShowPhoneTip,
  reportError,
  setUiLocale,
  showPendingDialog,
  type PendingDialog,
} from './ui';

export interface IavicaConfig {
  appId: string;
  appName?: string;
  apiBaseUrl?: string;
  devModeToken?: string;
  locale?: 'en' | 'es';
  labels?: Partial<IavicaLabels>;
}

export interface IavicaLabels {
  connectTitle: string;
  connectHint: string;
  emailPlaceholder: string;
  sendMagicLink: string;
  invalidEmail: string;
  close: string;
  chooseProjectTitle: string;
  chooseProjectHint: string;
  owner: string;
  sharedEditor: string;
  createOwnProject: string;
}

// Default API base when `apiBaseUrl` is not given:
// - loaded over http(s) (e.g. https://iavica.com/sdk/v1/iavica.js) → same origin + /v1,
//   so a self-hosted or local Docker stack works without configuration;
// - loaded from disk (file://) or as an ES module → the hosted service.
const HOSTED_API_BASE = 'https://iavica.com/v1';

// Start listening for page errors as soon as the SDK script loads.
installErrorReporter();
const DEFAULT_API_BASE: string = (() => {
  try {
    const src =
      typeof document !== 'undefined'
        ? (document.currentScript as HTMLScriptElement | null)?.src
        : undefined;
    if (src && /^https?:/i.test(src)) return `${new URL(src).origin}/v1`;
  } catch {
    // Fall through to the hosted default.
  }
  return HOSTED_API_BASE;
})();

const EN_LABELS: IavicaLabels = {
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

const ES_LABELS: IavicaLabels = {
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

export interface IavicaRecord {
  id: string;
  data: Record<string, unknown>;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListOptions {
  /** How many records to return (default 50). Values above 100 fetch several pages. */
  limit?: number;
  /** `nextCursor` from a previous call, to continue after it. */
  cursor?: string;
}

export interface AddOptions {
  /** Stable key for this creation; the same key never creates a second record. */
  idempotencyKey?: string;
}

const PAGE_SIZE = 100; // API maximum per request
const ADD_RETRIES = 2;

function randomId(): string {
  try {
    if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  } catch {
    // ignore
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export interface ListResult {
  items: IavicaRecord[];
  nextCursor: string | null;
}

export type Status = 'disconnected' | 'connecting' | 'pending' | 'connected' | 'expired' | 'denied' | 'offline' | 'error';

interface LinkRequestResponse {
  requestId: string;
  pollSecret: string;
  status: string;
  expiresIn: number;
  pollIntervalSeconds: number;
}

interface LinkStatusResponse {
  status: 'pending' | 'approved' | 'denied' | 'expired';
}

interface AuthResult {
  token: string;
  expiresAt: string;
  deviceToken?: string;
  deviceTokenExpiresAt?: string;
  projectId?: string;
  role?: 'owner' | 'editor';
  projectName?: string | null;
}

export interface ProjectOption {
  projectId: string;
  name: string;
  role: 'owner' | 'editor';
}

interface RedeemSelection {
  status: 'selection_required';
  projects: ProjectOption[];
  hasOwnProject: boolean;
}

function isSelectionResult(json: AuthResult | RedeemSelection): json is RedeemSelection {
  return (json as RedeemSelection).status === 'selection_required';
}

const DEVICE_TOKEN_KEY_PREFIX = 'iavica_device_token:';
const DEVICE_EMAIL_KEY_PREFIX = 'iavica_email:';
const VISITOR_ID_KEY = 'iavica_visitor_id';

export class IavicaDatabase {
  private token: string | null = null;
  private deviceToken: string | null = null;
  private status: Status = 'disconnected';
  private role: 'owner' | 'editor' | null = null;
  private projectName: string | null = null;
  private currentProjectId: string | null = null;
  private readonly listeners = new Map<string, Set<(payload?: unknown) => void>>();
  private abortController: AbortController | null = null;

  private pendingDialog: PendingDialog | null = null;

  constructor(private readonly config: IavicaConfig) {
    setUiLocale(config.locale);
  }

  get appId(): string {
    return this.config.appId;
  }

  getRole(): 'owner' | 'editor' | null {
    return this.role;
  }

  getProjectName(): string | null {
    return this.projectName;
  }

  getProjectId(): string | null {
    return this.currentProjectId;
  }

  private get labels(): IavicaLabels {
    const base = this.config.locale === 'es' ? ES_LABELS : EN_LABELS;
    return { ...base, ...(this.config.labels || {}) };
  }

  private get baseUrl(): string {
    return (this.config.apiBaseUrl || DEFAULT_API_BASE).replace(/\/$/, '');
  }

  on(event: string, handler: (payload?: unknown) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  private emit(event: string, payload?: unknown) {
    this.listeners.get(event)?.forEach((h) => {
      try {
        h(payload);
      } catch {
        // ignore
      }
    });
  }

  private setStatus(status: Status) {
    this.status = status;
    this.emit('status', status);
    if (status === 'connected' && !this.config.devModeToken) maybeShowPhoneTip(this.config.appId);
  }

  private deviceTokenKey(): string {
    return `${DEVICE_TOKEN_KEY_PREFIX}${this.config.appId}`;
  }

  private deviceEmailKey(): string {
    return `${DEVICE_EMAIL_KEY_PREFIX}${this.config.appId}`;
  }

  private saveDeviceToken(deviceToken: string, email: string) {
    try {
      localStorage.setItem(this.deviceTokenKey(), deviceToken);
      localStorage.setItem(this.deviceEmailKey(), email);
    } catch {
      // localStorage may be unavailable or restricted; ignore.
    }
  }

  private loadDeviceToken(): { token: string; email: string } | null {
    try {
      const token = localStorage.getItem(this.deviceTokenKey());
      const email = localStorage.getItem(this.deviceEmailKey());
      if (token && email) return { token, email };
    } catch {
      // ignore
    }
    return null;
  }

  private clearDeviceToken() {
    try {
      localStorage.removeItem(this.deviceTokenKey());
      localStorage.removeItem(this.deviceEmailKey());
    } catch {
      // ignore
    }
  }

  private getVisitorId(): string {
    try {
      let id = localStorage.getItem(VISITOR_ID_KEY);
      if (!id) {
        const random =
          typeof globalThis.crypto?.randomUUID === 'function'
            ? globalThis.crypto.randomUUID()
            : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
        id = random;
        localStorage.setItem(VISITOR_ID_KEY, id);
      }
      return id;
    } catch {
      return 'unknown';
    }
  }

  private trackAppOpen(event: 'opened' | 'connected'): void {
    if (typeof fetch !== 'function') return;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
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

  async ready(): Promise<void> {
    if (this.token) return;
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

  private stopPolling() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  private async bootstrapDev(): Promise<void> {
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

    const json = (await res.json()) as AuthResult;
    this.token = json.token;
    this.currentProjectId = json.projectId ?? null;
    this.role = json.role ?? null;
    this.projectName = json.projectName ?? null;
    if (json.deviceToken) {
      this.deviceToken = json.deviceToken;
      this.saveDeviceToken(json.deviceToken, 'dev@iavica.local');
    }
    this.setStatus('connected');
  }

  private async startEmailFlow(email: string): Promise<void> {
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

    const data = (await res.json()) as LinkRequestResponse;
    this.setStatus('pending');
    // "Connecting… check your email" while the user approves the link. Closing
    // it only hides it; polling continues until approved, denied or expired.
    this.pendingDialog = showPendingDialog(email);
    try {
      await this.pollAndRedeem(data.requestId, data.pollSecret, data.pollIntervalSeconds * 1000, email);
    } finally {
      this.closePendingDialog();
    }
  }

  private closePendingDialog() {
    this.pendingDialog?.close();
    this.pendingDialog = null;
  }

  private async refreshFromDeviceToken(deviceToken: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/sessions/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceToken }),
      });
      if (!res.ok) return false;
      const json = (await res.json()) as AuthResult;
      this.token = json.token;
      this.currentProjectId = json.projectId ?? null;
      this.role = json.role ?? null;
      this.projectName = json.projectName ?? null;
      return true;
    } catch {
      return false;
    }
  }

  async logout(): Promise<void> {
    this.stopPolling();
    if (this.deviceToken) {
      try {
        await fetch(`${this.baseUrl}/sessions/disconnect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceToken: this.deviceToken }),
        });
      } catch {
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

  private async pollAndRedeem(requestId: string, pollSecret: string, intervalMs: number, email: string): Promise<void> {
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

        const statusData = (await statusRes.json()) as LinkStatusResponse;

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
      } catch (err: any) {
        if (err.name === 'AbortError') {
          this.setStatus('disconnected');
          return;
        }
        this.setStatus('error');
        throw err;
      }
    }
  }

  private async redeemWithSelection(
    requestId: string,
    pollSecret: string,
    email: string
  ): Promise<void> {
    let body: Record<string, unknown> = { appName: this.config.appName };

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
      const json = (await redeemRes.json()) as AuthResult | RedeemSelection;

      if (isSelectionResult(json)) {
        const choice = await this.promptProjectSelection(json.projects, !json.hasOwnProject);
        body = {
          appName: this.config.appName,
          ...(choice === 'create' ? { createOwnProject: true } : { projectId: choice }),
        };
        continue;
      }

      this.token = json.token;
      this.currentProjectId = json.projectId ?? null;
      this.role = json.role ?? null;
      this.projectName = json.projectName ?? null;
      if (json.deviceToken) {
        this.deviceToken = json.deviceToken;
        this.saveDeviceToken(json.deviceToken, email);
      }
      return;
    }
  }

  async invite(email: string, role: 'editor' = 'editor'): Promise<void> {
    if (!this.token || !this.currentProjectId) {
      throw new Error('Not authenticated');
    }
    const res = await fetch(
      `${this.baseUrl}/apps/${this.config.appId}/projects/${this.currentProjectId}/invitations`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, role }),
      }
    );
    if (!res.ok) {
      const body = await this.parseError(res);
      throw apiError(body, res.status, `Invite failed: ${res.status}`);
    }
  }

  private promptProjectSelection(
    projects: ProjectOption[],
    allowCreate: boolean
  ): Promise<string | 'create'> {
    this.closePendingDialog();
    return new Promise((resolve) => {
      const existing = document.getElementById('iavica-project-overlay');
      if (existing) existing.remove();

      const overlay = document.createElement('div');
      overlay.id = 'iavica-project-overlay';
      overlay.setAttribute(
        'style',
        'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:9999;font-family:system-ui,sans-serif;'
      );

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
          const id = btn.getAttribute('data-project-id') as string;
          overlay.remove();
          resolve(id);
        });
      });
      document.getElementById('iavica-project-create')?.addEventListener('click', () => {
        overlay.remove();
        resolve('create');
      });
    });
  }

  private escapeHtml(value: string): string {
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

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private promptEmail(): Promise<string | null> {
    return new Promise((resolve) => {
      const existing = document.getElementById('iavica-email-overlay');
      if (existing) existing.remove();

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

      const input = document.getElementById('iavica-email') as HTMLInputElement;
      const errorEl = document.getElementById('iavica-email-error') as HTMLDivElement;
      const btn = document.getElementById('iavica-email-submit') as HTMLButtonElement;
      const closeBtn = document.getElementById('iavica-email-close') as HTMLButtonElement;

      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') close();
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
        if (e.key === 'Enter') btn.click();
      });
    });
  }

  disconnect(): void {
    this.stopPolling();
    this.token = null;
    this.currentProjectId = null;
    this.role = null;
    this.projectName = null;
    this.setStatus('disconnected');
  }

  isConnected(): boolean {
    return this.status === 'connected' && !!this.token;
  }

  collection(name: string): IavicaCollection {
    return new IavicaCollection(this, name);
  }

  async request(path: string, options: RequestInit = {}): Promise<unknown> {
    if (!this.token) {
      throw new Error('Not authenticated');
    }
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      ...(options.headers as Record<string, string>),
    };
    const res = await fetch(`${this.baseUrl}${path}`, { ...options, headers });
    if (!res.ok) {
      const body = await this.parseError(res);
      const message = body?.error?.message || `HTTP ${res.status}`;
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
      if (res.status === 409 && !err.code) err.code = 'VERSION_CONFLICT';
      if (err.code === 'VALIDATION_ERROR') {
        // The app sent something the API rejects: a bug in the app's code.
        const method = (options.method || 'GET').toUpperCase();
        const details = body?.error?.details ? ` ${JSON.stringify(body.error.details).slice(0, 400)}` : '';
        reportError({
          kind: 'api',
          code: 'APP_BUG',
          message: `iavica API ${res.status} VALIDATION_ERROR on ${method} ${path.split('?')[0]}: ${message}${details}`,
          stack: cleanCallerStack(new Error().stack),
        });
        (err as any).iavicaReported = true;
      }
      throw err;
    }
    if (res.status === 204) return undefined;
    return res.json();
  }

  private async parseError(res: Response): Promise<{ error?: { code?: string; message?: string; details?: unknown } } | null> {
    try {
      return (await res.json()) as any;
    } catch {
      return null;
    }
  }
}

class IavicaCollection {
  constructor(private readonly db: IavicaDatabase, private readonly name: string) {}

  /**
   * Create a record. Idempotent: pass `idempotencyKey` for entries that
   * several devices or retries could create twice (e.g.
   * `recurring:${templateId}@${date}`); the same key returns the record
   * created the first time. Without a key the SDK uses a random one and
   * reuses it when it retries after a network error.
   */
  async add(data: Record<string, unknown>, opts: AddOptions = {}): Promise<IavicaRecord> {
    const key = opts.idempotencyKey ?? `sdk:${randomId()}`;
    const send = () =>
      this.db.request(`/apps/${this.db.appId}/collections/${this.name}/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
        body: JSON.stringify({ data }),
      }) as Promise<IavicaRecord>;
    for (let attempt = 0; ; attempt++) {
      try {
        return await send();
      } catch (err) {
        // Only network failures are retried: the server may have created the
        // record already, and the same key makes the retry safe.
        if (!(err instanceof TypeError) || attempt >= ADD_RETRIES) throw err;
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
      }
    }
  }

  /**
   * List records, newest first. Returns `{ items, nextCursor }`.
   * `limit` may be larger than the 100-per-request API page: the SDK fetches
   * the pages needed. Pass `nextCursor` back as `cursor` for the next batch.
   */
  async list(opts: ListOptions = {}): Promise<ListResult> {
    const wanted = Math.max(1, Math.floor(opts.limit ?? 50));
    const items: IavicaRecord[] = [];
    let cursor = opts.cursor ?? null;
    do {
      const page = await this.page(Math.min(PAGE_SIZE, wanted - items.length), cursor);
      items.push(...page.items);
      cursor = page.nextCursor;
    } while (cursor && items.length < wanted);
    return { items, nextCursor: cursor };
  }

  /**
   * Every record in the collection, newest first, following all pages.
   * Stops at `max` (default 10,000, the per-project record limit).
   */
  async listAll(opts: { max?: number } = {}): Promise<IavicaRecord[]> {
    return (await this.list({ limit: opts.max ?? 10000 })).items;
  }

  private page(limit: number, cursor: string | null): Promise<ListResult> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set('cursor', cursor);
    return this.db.request(`/apps/${this.db.appId}/collections/${this.name}/records?${params}`) as Promise<ListResult>;
  }

  async get(id: string): Promise<IavicaRecord> {
    return this.db.request(`/apps/${this.db.appId}/collections/${this.name}/records/${id}`) as Promise<IavicaRecord>;
  }

  /**
   * Update a record with optimistic concurrency. Canonical form:
   *   update(id, data, { version })
   * Also accepted (older docs, already used by generated apps):
   *   update(id, { data, version })
   */
  async update(
    id: string,
    data: Record<string, unknown>,
    options?: { version: number } | number
  ): Promise<IavicaRecord> {
    let payload = data;
    let version = typeof options === 'number' ? options : options?.version;
    if (version === undefined && isWrappedUpdate(data)) {
      payload = data.data as Record<string, unknown>;
      version = data.version as number;
    }
    if (typeof version !== 'number' || !Number.isFinite(version)) {
      throw usageError(
        'update() needs the record version: collection.update(id, data, { version: record.version })'
      );
    }
    return this.db.request(`/apps/${this.db.appId}/collections/${this.name}/records/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'If-Match': String(version) },
      body: JSON.stringify({ data: payload }),
    }) as Promise<IavicaRecord>;
  }

  /** Delete a record: remove(id, { version }) — remove(id, version) also accepted. */
  async remove(id: string, options?: { version: number } | number): Promise<void> {
    const version = typeof options === 'number' ? options : options?.version;
    if (typeof version !== 'number' || !Number.isFinite(version)) {
      throw usageError(
        'remove() needs the record version: collection.remove(id, { version: record.version })'
      );
    }
    return this.db.request(`/apps/${this.db.appId}/collections/${this.name}/records/${id}`, {
      method: 'DELETE',
      headers: { 'If-Match': String(version) },
    }) as Promise<void>;
  }
}

// `{ data: {...}, version: n }` as the second argument of update().
function isWrappedUpdate(value: unknown): value is { data: Record<string, unknown>; version: number } {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.version === 'number' &&
    !!v.data &&
    typeof v.data === 'object' &&
    !Array.isArray(v.data) &&
    Object.keys(v).every((k) => k === 'data' || k === 'version')
  );
}

function usageError(message: string): Error {
  const err = new Error(message) as Error & { code: string; iavicaKind: string };
  err.code = 'VALIDATION_ERROR';
  err.iavicaKind = 'sdk';
  (err as any).iavicaReported = true;
  reportError({ kind: 'sdk', code: 'APP_BUG', message: `iavica SDK: ${message}`, stack: cleanCallerStack(err.stack) });
  return err;
}

type IavicaApiError = Error & { code?: string; status?: number; details?: unknown };

function apiError(
  body: { error?: { code?: string; message?: string; details?: unknown } } | null,
  status: number,
  fallback: string
): IavicaApiError {
  const err = new Error(body?.error?.message || fallback) as IavicaApiError;
  err.code = body?.error?.code;
  err.status = status;
  err.details = body?.error?.details;
  return err;
}

// Keep only the app's own frames (drop the SDK's) so the AI sees its code.
function cleanCallerStack(stack: string | undefined): string | undefined {
  if (!stack) return undefined;
  const frames = stack
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /:\d+:\d+\)?$/.test(l) && !/iavica(\.esm)?(\.min)?\.js/.test(l))
    .map((l) => l.replace(/(?:file|https?):\/\/[^\s)]*\/([^/\s):]+)/g, '$1'))
    .slice(0, 5);
  return frames.length ? frames.join('\n') : undefined;
}

declare const __IAVICA_SDK_VERSION__: string;
/** SDK version (semver), replaced at build time. */
export const version: string = __IAVICA_SDK_VERSION__;

export function connect(config: IavicaConfig): IavicaDatabase {
  return new IavicaDatabase(config);
}

// IIFE global
declare global {
  interface Window {
    Iavica: { connect: typeof connect; version: string };
  }
}

if (typeof window !== 'undefined') {
  window.Iavica = { connect, version };
}
