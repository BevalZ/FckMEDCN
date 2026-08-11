import { test, expect } from '@playwright/test';

test.use({
  viewport: { width: 393, height: 659 },
  hasTouch: true,
  isMobile: true,
});

test('手机竖屏标题层跟随画布缩放且开始按钮可点击', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await page.waitForFunction(() => {
    const canvas = document.querySelector('#game-container > canvas');
    const overlay = document.getElementById('title-overlay');
    return !!canvas && overlay?.classList.contains('show') && !!overlay.style.transform;
  });

  const layout = await page.evaluate(() => {
    const canvas = document.querySelector('#game-container > canvas')!.getBoundingClientRect();
    const overlay = document.getElementById('title-overlay')!.getBoundingClientRect();
    const start = document.getElementById('title-start')!.getBoundingClientRect();
    return {
      viewport: { width: innerWidth, height: innerHeight },
      canvas: { left: canvas.left, top: canvas.top, width: canvas.width, height: canvas.height },
      overlay: { left: overlay.left, top: overlay.top, width: overlay.width, height: overlay.height },
      start: { left: start.left, top: start.top, right: start.right, bottom: start.bottom },
    };
  });

  expect(layout.overlay.left).toBeCloseTo(layout.canvas.left, 0);
  expect(layout.overlay.top).toBeCloseTo(layout.canvas.top, 0);
  expect(layout.overlay.width).toBeCloseTo(layout.canvas.width, 0);
  expect(layout.overlay.height).toBeCloseTo(layout.canvas.height, 0);
  expect(layout.start.left).toBeGreaterThanOrEqual(0);
  expect(layout.start.top).toBeGreaterThanOrEqual(0);
  expect(layout.start.right).toBeLessThanOrEqual(layout.viewport.width);
  expect(layout.start.bottom).toBeLessThanOrEqual(layout.viewport.height);

  await page.getByRole('button', { name: '[ 开始游戏 ]' }).click();
  await expect(page.locator('#title-overlay')).not.toHaveClass(/show/);
});

test('触屏设备的缝合、CPR 与夜班小游戏都有可点击操作', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
  await page.waitForFunction(() => (window as any).game.scene.getScenes(true)
    .some((scene: any) => scene.sys.settings.key === 'TitleScene'));

  const controls = await page.evaluate(async () => {
    const scene = (window as any).game.scene.getScenes(true)[0];
    const { launchMinigame } = await import('/src/ui/launchMinigame.ts');

    const suture = launchMinigame(scene, 'suture', '触屏测试') as any;
    const sutureButton = suture.root.list.find((item: any) => item.text === '落针');
    const sutureClickable = sutureButton?.input?.enabled === true;
    suture.destroy();

    const cpr = launchMinigame(scene, 'cpr', '触屏测试') as any;
    const cprButton = cpr.root.list.find((item: any) => item.text === '按压');
    const cprClickable = cprButton?.input?.enabled === true;
    cpr.destroy();

    const night = launchMinigame(scene, 'nightshift', '触屏测试') as any;
    const clickableBeds = night.root.list.filter((item: any) =>
      item.type === 'Rectangle' && item.width === 100 && item.height === 64 && item.input?.enabled === true,
    ).length;
    night.destroy();

    return { sutureClickable, cprClickable, clickableBeds };
  });

  expect(controls).toEqual({ sutureClickable: true, cprClickable: true, clickableBeds: 5 });
});

test('触屏确认弹窗的取消与确认入口独立可点', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await page.waitForFunction(() => (window as any).game?.scene?.getScenes(true)
    .some((scene: any) => scene.sys.settings.key === 'TitleScene'));

  const result = await page.evaluate(async () => {
    const scene = (window as any).game.scene.getScene('TitleScene');
    const { ConsequencePopup } = await import('/src/ui/ConsequencePopup.ts');
    const { showQuarterAdvancePrompt } = await import('/src/ui/quarterAdvancePrompt.ts');
    const popup = new ConsequencePopup(scene, 'undergrad') as any;
    let confirmed = 0;
    let cancelled = 0;

    showQuarterAdvancePrompt(popup, () => { confirmed++; }, () => { cancelled++; });
    const cancel = popup.container.list.find((item: any) =>
      item.type === 'Text' && item.text === '取消 [ 点击 / ESC ]');
    const confirm = popup.container.list.find((item: any) =>
      item.type === 'Rectangle' && item.input?.enabled === true);
    const cancelClickable = cancel.input?.enabled === true;
    const confirmClickable = confirm.input?.enabled === true;
    const cancelBounds = cancel.getBounds();
    const confirmBounds = confirm.getBounds();
    const separate = cancelBounds.right < confirmBounds.left;
    cancel.emit('pointerdown');

    showQuarterAdvancePrompt(popup, () => { confirmed++; }, () => { cancelled++; });
    popup.container.list.find((item: any) =>
      item.type === 'Rectangle' && item.input?.enabled === true).emit('pointerdown');
    await new Promise(resolve => setTimeout(resolve, 150));

    return {
      cancelClickable,
      confirmClickable,
      separate,
      confirmed,
      cancelled,
    };
  });

  expect(result).toEqual({
    cancelClickable: true,
    confirmClickable: true,
    separate: true,
    confirmed: 1,
    cancelled: 1,
  });
});

test('事件卡的离开提示可触控且执行与 ESC 相同的取消回调', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await page.waitForFunction(() => (window as any).game?.scene?.getScenes(true)
    .some((scene: any) => scene.sys.settings.key === 'TitleScene'));

  const result = await page.evaluate(async () => {
    const scene = (window as any).game.scene.getScene('TitleScene');
    const { EventCard } = await import('/src/ui/EventCard.ts');
    let cancelled = 0;
    const card = new EventCard(scene, 'undergrad', () => {}) as any;
    card.show({
      id: 'touch_cancel_probe',
      stage: 'undergrad',
      title: '触控取消测试',
      body: '点按右上角应当离开事件卡。',
      category: 'system',
      weight: 1,
      choices: [{ text: '保留选项', delta: {} }],
    }, () => { cancelled++; });

    const hint = card.container.list.find((item: any) =>
      item.type === 'Text' && String(item.text).includes('ESC 离开'));
    const clickable = hint?.input?.enabled === true;
    const communicatesTouch = String(hint?.text).includes('点击');
    hint?.emit('pointerdown');

    return { clickable, communicatesTouch, cancelled, busy: card.busy };
  });

  expect(result).toEqual({
    clickable: true,
    communicatesTouch: true,
    cancelled: 1,
    busy: false,
  });
});

test('触屏行走与卡片场景都有可操作的辅助入口', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 60000 });
  await page.waitForFunction(() => (window as any).game.scene.getScenes(true)
    .some((scene: any) => scene.sys.settings.key === 'TitleScene'));

  await page.evaluate(() => {
    const { gs } = (window as any).__mod;
    gs.patchState({ stage: 'undergrad' });
    (window as any).game.scene.getScene('TitleScene').scene.start('CampusScene');
  });
  await page.waitForFunction(() => !!(window as any).game.scene.getScene('CampusScene')?.scene.isActive());
  await page.waitForFunction(() => (window as any).game.scene.getScene('CampusScene')?.consequence?.busy === true);
  await page.evaluate(() => {
    const popup = (window as any).game.scene.getScene('CampusScene').consequence.container;
    const hitArea = popup.list.find((item: any) => item.input?.enabled === true);
    hitArea.emit('pointerdown');
  });
  await page.waitForFunction(() => (window as any).game.scene.getScene('CampusScene')?.consequence?.busy === false);

  const walking = await page.evaluate(() => {
    const scene: any = (window as any).game.scene.getScene('CampusScene');
    const shortcut = (label: string) => scene.children.list.find((item: any) =>
      item.type === 'Text' && item.text === label && item.depth === 130);
    const task = shortcut('任务');
    const help = shortcut('帮助');
    const menu = shortcut('菜单');
    const questBefore = scene.questLog.root.visible;
    task.emit('pointerdown');
    const questAfter = scene.questLog.root.visible;
    help.emit('pointerdown');
    const helpContainer = scene.children.list.find((item: any) =>
      item.type === 'Container' && item.depth === 200);
    const helpTitle = helpContainer?.list.find((item: any) =>
      item.type === 'Text' && String(item.text).includes('操作帮助'));
    const helpOpen = !!helpContainer && !!helpTitle;
    helpTitle?.emit('pointerdown');
    menu.emit('pointerdown');
    const menuContainer = scene.children.list.find((item: any) =>
      item.type === 'Container' && item.depth === 190);
    const continueItem = menuContainer?.list.find((item: any) =>
      item.type === 'Text' && String(item.text).includes('继续游戏'));
    const menuOpen = !!menuContainer && continueItem?.input?.enabled === true;
    const genderItem = menuContainer?.list.find((item: any) =>
      item.type === 'Text' && String(item.text).includes('修改性别'));
    genderItem?.emit('pointerdown');
    const genderChoiceClickable = menuContainer?.list.some((item: any) =>
      item.type === 'Text' && String(item.text).includes('男生') && item.input?.enabled === true);
    const menuTitle = menuContainer?.list.find((item: any) =>
      item.type === 'Text' && String(item.text).includes('游戏菜单'));
    menuTitle?.emit('pointerdown');
    const restartClickableAfterBack = menuContainer?.list.some((item: any) =>
      item.type === 'Text' && String(item.text).includes('重新开档') && item.input?.enabled === true);
    continueItem?.emit('pointerdown');
    const menuClosed = !scene.children.list.some((item: any) =>
      item.type === 'Container' && item.depth === 190);
    return {
      clickable: [task, help, menu].every((item: any) => item?.input?.enabled === true),
      questBefore, questAfter, helpOpen, menuOpen, genderChoiceClickable, restartClickableAfterBack, menuClosed,
    };
  });

  expect(walking).toEqual({
    clickable: true,
    questBefore: true,
    questAfter: false,
    helpOpen: true,
    menuOpen: true,
    genderChoiceClickable: true,
    restartClickableAfterBack: true,
    menuClosed: true,
  });

  await page.evaluate(() => {
    const { gs } = (window as any).__mod;
    gs.patchState({ stage: 'career' });
    (window as any).game.scene.getScene('CampusScene').scene.start('CareerScene');
  });
  await page.waitForFunction(() => !!(window as any).game.scene.getScene('CareerScene')?.scene.isActive());
  const cardShortcuts = await page.evaluate(() => {
    const scene: any = (window as any).game.scene.getScene('CareerScene');
    return ['导师', '帮助', '菜单'].map(label => {
      const item = scene.children.list.find((child: any) =>
        child.type === 'Text' && child.text === label && child.depth === 130);
      return { label, clickable: item?.input?.enabled === true };
    });
  });
  expect(cardShortcuts).toEqual([
    { label: '导师', clickable: true },
    { label: '帮助', clickable: true },
    { label: '菜单', clickable: true },
  ]);
});
