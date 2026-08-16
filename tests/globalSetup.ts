const DEV_SERVER_URL = 'http://127.0.0.1:5173/';
const APP_TITLE = '白大衣模拟器 — 临床医学人生模拟';

export function assertFckMedCnHtml(html: string, url = DEV_SERVER_URL): void {
  if (html.includes(`<title>${APP_TITLE}</title>`)) return;

  const detectedTitle = html.match(/<title>(.*?)<\/title>/is)?.[1]?.trim() ?? '缺少 <title>';
  throw new Error(
    `[Playwright 预检] ${url} 返回的不是本项目（检测到标题：${detectedTitle}）。`
    + '请停止占用 5173 端口的其他服务，或启动本项目的 Vite 服务后重试。',
  );
}

export default async function globalSetup(): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(DEV_SERVER_URL, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`[Playwright 预检] ${DEV_SERVER_URL} 返回 HTTP ${response.status}。`);
    }
    assertFckMedCnHtml(await response.text());
  } finally {
    clearTimeout(timer);
  }
}
