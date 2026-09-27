import type { PublicPath } from 'wxt/browser';
import { type Browser, browser } from '#imports';
import type { Settings, SettingsKey } from '@/core/guides/types';

type HtmlPublicPath = Extract<PublicPath, `${string}.html`>;
type ScriptPath = Extract<PublicPath, `${string}.js`>;

export function sendMessage(msg: Record<string, unknown>): Promise<unknown> {
  return browser.runtime.sendMessage(msg);
}

export function sendMessageWithCallback(msg: Record<string, unknown>, callback: (response: unknown) => void): void {
  browser.runtime.sendMessage(msg, callback);
}

export function sendMessageToTab(tabId: number, msg: Record<string, unknown>): Promise<unknown> {
  return browser.tabs.sendMessage(tabId, msg);
}

export function onMessage(
  handler: (
    msg: unknown,
    sender: Browser.runtime.MessageSender,
    sendResponse: (response?: unknown) => void,
  ) => boolean | undefined,
): void {
  browser.runtime.onMessage.addListener(handler);
}

export function offMessage(handler: (...args: unknown[]) => unknown): void {
  browser.runtime.onMessage.removeListener(handler);
}

export function getLastError(): Browser.runtime.LastError | undefined {
  return browser.runtime.lastError;
}

export function getExtensionURL(path: PublicPath): string;
export function getExtensionURL(path: `${HtmlPublicPath}${string}`): string;
export function getExtensionURL(path: string): string {
  return (browser.runtime as { getURL(p: string): string }).getURL(path);
}

export function getExtensionId(): string {
  return browser.runtime.id;
}

export function queryTabs(query: Browser.tabs.QueryInfo): Promise<Browser.tabs.Tab[]> {
  return browser.tabs.query(query);
}

/**
 * Picks the web page the user is working in. When the panel runs in its own
 * window (browsers without a side panel API), that window is focused and owns
 * the active tab, so the panel's own page is skipped before choosing.
 */
export async function getActiveTab(): Promise<Browser.tabs.Tab | undefined> {
  const tabs = await browser.tabs.query({ active: true });
  const panelUrl = getExtensionURL('/sidepanel.html');
  const webTabs = tabs.filter((tab) => (tab.url || tab.pendingUrl || '') !== panelUrl);
  const pool = webTabs.length > 0 ? webTabs : tabs;
  if (pool.length <= 1) return pool[0];

  const lastFocused = await browser.windows.getLastFocused().catch(() => undefined);
  const inFocusedWindow = pool.find((tab) => tab.windowId === lastFocused?.id);
  if (inFocusedWindow) return inFocusedWindow;

  return pool.reduce((best, tab) => {
    const bestAt = (best as { lastAccessed?: number }).lastAccessed ?? 0;
    const tabAt = (tab as { lastAccessed?: number }).lastAccessed ?? 0;
    return tabAt > bestAt ? tab : best;
  });
}

export function getTab(tabId: number): Promise<Browser.tabs.Tab> {
  return browser.tabs.get(tabId);
}

export function createTab(options: Browser.tabs.CreateProperties): Promise<Browser.tabs.Tab> {
  return browser.tabs.create(options);
}

export function updateTab(tabId: number, props: Browser.tabs.UpdateProperties): Promise<Browser.tabs.Tab | undefined> {
  return browser.tabs.update(tabId, props);
}

export function onTabActivated(handler: (activeInfo: Browser.tabs.OnActivatedInfo) => void): void {
  browser.tabs.onActivated.addListener(handler);
}

export function onTabUpdated(
  handler: (tabId: number, changeInfo: Browser.tabs.OnUpdatedInfo, tab: Browser.tabs.Tab) => void,
): void {
  browser.tabs.onUpdated.addListener(handler);
}

export function getAllWindows(): Promise<Browser.windows.Window[]> {
  return browser.windows.getAll({ populate: true });
}

export function focusWindow(windowId: number): Promise<Browser.windows.Window> {
  return browser.windows.update(windowId, { focused: true });
}

export function captureVisibleTab(format: 'jpeg' | 'png' = 'jpeg', quality = 90, windowId?: number): Promise<string> {
  if (windowId === undefined) return browser.tabs.captureVisibleTab({ format, quality });
  return browser.tabs.captureVisibleTab(windowId, { format, quality });
}

export function executeScript(tabId: number, files: ScriptPath[], allFrames = true): Promise<unknown> {
  return browser.scripting.executeScript({
    target: { tabId, allFrames },
    files,
  });
}

export const sessionStorage = {
  get: (key: string) => browser.storage.session.get(key),
  set: (items: Record<string, unknown>) => browser.storage.session.set(items),
  remove: (key: string) => browser.storage.session.remove(key),
};

export const localStorage = {
  get: <K extends SettingsKey>(keys: readonly K[]) =>
    browser.storage.local.get(keys as unknown as K) as Promise<Partial<Pick<Settings, K>>>,
  set: (items: Partial<Settings>) => browser.storage.local.set(items),
};

const hasSidePanelApi = () => typeof browser === 'object' && browser !== null && 'sidePanel' in browser;

export async function openDetachedPanel(): Promise<void> {
  const url = getExtensionURL('/sidepanel.html');
  try {
    const existing = await browser.tabs.query({ url });
    const windowId = existing[0]?.windowId;
    if (windowId !== undefined) {
      await browser.windows.update(windowId, { focused: true });
      return;
    }
  } catch {
    // fall through to creating a fresh window
  }
  await browser.windows.create({ url, type: 'popup', width: 400, height: 660 });
}

export function setSidePanelBehavior(openOnActionClick: boolean): void {
  if (import.meta.env.BROWSER === 'firefox') return;
  if (!hasSidePanelApi()) return;
  browser.sidePanel.setPanelBehavior({
    openPanelOnActionClick: openOnActionClick,
  });
}

const sidebarAction = () =>
  (browser as unknown as { sidebarAction: { open(): Promise<void> | undefined; toggle(): void } }).sidebarAction;

export function openSidebar(): void {
  try {
    if (import.meta.env.BROWSER === 'firefox') {
      sidebarAction()
        .open()
        ?.catch(() => undefined);
      return;
    }
    if (hasSidePanelApi()) {
      browser.sidePanel
        .open({ windowId: browser.windows.WINDOW_ID_CURRENT })
        ?.catch(() => void openDetachedPanel().catch(() => undefined));
      return;
    }
    void openDetachedPanel().catch(() => undefined);
  } catch {
    void openDetachedPanel().catch(() => undefined);
  }
}

export function toggleSidebar(): void {
  if (import.meta.env.BROWSER === 'firefox') {
    sidebarAction().toggle();
  }
}

export function requestHostPermissions(): Promise<boolean> {
  if (import.meta.env.BROWSER !== 'firefox') return Promise.resolve(true);
  try {
    return browser.permissions.request({ origins: ['<all_urls>'] }).catch(() => false);
  } catch {
    return Promise.resolve(false);
  }
}

export async function hasHostPermissions(): Promise<boolean> {
  if (import.meta.env.BROWSER !== 'firefox') return true;
  try {
    return await browser.permissions.contains({ origins: ['<all_urls>'] });
  } catch {
    return false;
  }
}

export function onNavigationCompleted(
  handler: (details: Browser.webNavigation.WebNavigationFramedCallbackDetails) => void,
): void {
  browser.webNavigation.onCompleted.addListener(handler);
}

export function onHistoryStateUpdated(
  handler: (details: Browser.webNavigation.WebNavigationTransitionCallbackDetails) => void,
): void {
  browser.webNavigation.onHistoryStateUpdated.addListener(handler);
}
