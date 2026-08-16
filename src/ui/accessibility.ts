const STATUS_ID = 'game-a11y-status';
const CONTAINER_ID = 'game-container';

let statusNode: HTMLElement | null = null;

function getStatusNode(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  if (statusNode?.isConnected) return statusNode;
  statusNode = document.getElementById(STATUS_ID);
  if (!statusNode) {
    statusNode = document.createElement('div');
    statusNode.id = STATUS_ID;
    statusNode.setAttribute('aria-live', 'polite');
    statusNode.setAttribute('aria-atomic', 'true');
    statusNode.className = 'visually-hidden';
    document.body.appendChild(statusNode);
  }
  return statusNode;
}

/** 初始化 Canvas 外层语义，让键盘和辅助技术有稳定的焦点/状态入口。 */
export function initAccessibility(): void {
  if (typeof document === 'undefined') return;
  const container = document.getElementById(CONTAINER_ID);
  if (!container) return;
  container.setAttribute('role', 'region');
  container.setAttribute('aria-label', '白大衣模拟器游戏画布');
  container.setAttribute('aria-describedby', STATUS_ID);
  container.setAttribute('tabindex', '0');
  getStatusNode();

  const labelCanvas = () => {
    const canvas = container.querySelector('canvas');
    if (!canvas) return;
    canvas.setAttribute('aria-label', '游戏画布。使用键盘、方向键或触控操作。');
    canvas.setAttribute('tabindex', '0');
  };
  labelCanvas();
  if (typeof MutationObserver === 'function') {
    new MutationObserver(labelCanvas).observe(container, { childList: true });
  }
}

/** 向屏幕阅读器和无障碍调试工具播报当前游戏状态。 */
export function announceAccessibility(text: string): void {
  const node = getStatusNode();
  if (!node) return;
  node.textContent = '';
  node.textContent = text.trim();
}

export function clearAccessibilityAnnouncement(): void {
  const node = getStatusNode();
  if (node) node.textContent = '';
}
