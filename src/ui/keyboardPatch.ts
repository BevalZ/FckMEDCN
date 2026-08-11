import Phaser from 'phaser';

// Phaser 的全局键盘队列只在 Game POST_STEP 清空。低帧率或一次渲染前执行多个
// update step 时，同一组 keydown/keyup 会被同一个 Scene KeyboardPlugin 重放。
// Phaser 自带的“仅比较上一条事件”去重会被中间的 keyup 打断，导致菜单方向键、
// 数字键和 Tab 偶发执行两次。按“插件 + 原生事件 + 事件名”记忆已分发项，既保留
// keydown-SPACE 与通用 keydown 各一次，也不妨碍事件继续传播到其它活动 Scene。

const PATCHED = Symbol.for('fckmedcn.keyboardPatch.installed');

export function installKeyboardPatch(): void {
  const prototype = Phaser.Input.Keyboard.KeyboardPlugin.prototype as unknown as Record<PropertyKey, unknown>;
  if (prototype[PATCHED]) return;

  const originalEmit = Phaser.Input.Keyboard.KeyboardPlugin.prototype.emit;
  const seenByPlugin = new WeakMap<object, WeakMap<object, Set<string | symbol>>>();

  Phaser.Input.Keyboard.KeyboardPlugin.prototype.emit = function (
    this: Phaser.Input.Keyboard.KeyboardPlugin,
    eventName: string | symbol,
    ...args: unknown[]
  ): boolean {
    const rawEvent = args[0];
    const isKeyboardEvent = typeof eventName === 'string'
      && (eventName === 'keydown' || eventName === 'keyup'
        || eventName.startsWith('keydown-') || eventName.startsWith('keyup-'));

    if (isKeyboardEvent && rawEvent !== null && typeof rawEvent === 'object') {
      let seenEvents = seenByPlugin.get(this);
      if (!seenEvents) {
        seenEvents = new WeakMap<object, Set<string | symbol>>();
        seenByPlugin.set(this, seenEvents);
      }
      let eventNames = seenEvents.get(rawEvent);
      if (!eventNames) {
        eventNames = new Set<string | symbol>();
        seenEvents.set(rawEvent, eventNames);
      } else if (eventNames.has(eventName)) {
        return false;
      }
      eventNames.add(eventName);
    }

    return Reflect.apply(originalEmit, this, [eventName, ...args]) as boolean;
  } as typeof originalEmit;

  prototype[PATCHED] = true;
}
