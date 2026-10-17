// Smoke test: abre o jogo no Chromium, joga um pouco e tira screenshots.
// Uso: npm run build && npx vite preview --port 4173 & node scripts/smoke.mjs
import { chromium, devices } from 'playwright-core';
import { mkdirSync } from 'node:fs';

// `?timer`: o Chromium headless limita o requestAnimationFrame; setTimeout mantém 60 fps.
const URL = process.env.URL ?? 'http://localhost:4173/?timer';
const OUT = process.env.OUT ?? 'screenshots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium',
  args: ['--headless=new', '--autoplay-policy=no-user-gesture-required', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Página headless nunca recebe foco, e sem foco o Phaser limita o delta a 16 ms (jogo em câmera lenta).
const focus = (page) => page.evaluate(() => window.dispatchEvent(new Event('focus')));

async function desktop() {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => errors.push(`[desktop] ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`[desktop console] ${m.text()}`));
  await page.goto(URL);
  await focus(page);
  await sleep(1200);
  await page.screenshot({ path: `${OUT}/1-menu.png` });

  await page.mouse.click(640, 270); // 1 Jogador × Computador
  const waitPlay = () =>
    page.waitForFunction(() => window.__game.scene.getScene('Game')?.state === 'play', null, { timeout: 60000 });
  await waitPlay();
  // anda, pula, investe
  await page.keyboard.down('ArrowRight');
  await sleep(500);
  await page.keyboard.press('ArrowUp');
  await sleep(250);
  await page.keyboard.press('ArrowUp');
  await sleep(300);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.press('Shift');
  await sleep(2500);
  await page.screenshot({ path: `${OUT}/2-jogo.png` });

  const state = await page.evaluate(() => {
    const g = window.__game.scene.getScene('Game');
    return g.critters.map((c) => ({ id: c.id, x: Math.round(c.x), y: Math.round(c.feetY), dizzy: c.dizzy, power: c.power }));
  });
  console.log('estado após jogar:', JSON.stringify(state));

  // força um poder para ver os efeitos
  await page.evaluate(() => window.__game.scene.getScene('Game').critters[0].givePower('bomba'));
  await page.keyboard.press('Space');
  await sleep(700);
  await page.screenshot({ path: `${OUT}/3-poder.png` });

  // derruba o computador até o fim da partida para ver a tela de vitória
  // (a IA também pode vencer antes — tudo bem, o que importa é chegar ao fim da partida)
  for (let i = 0; i < 3; i++) {
    await page.waitForFunction(
      () => window.__game.scene.isActive('Result') || window.__game.scene.getScene('Game')?.state === 'play',
      null,
      { timeout: 60000 },
    );
    if (await page.evaluate(() => window.__game.scene.isActive('Result'))) break;
    await page.evaluate(() => window.__game.scene.getScene('Game').critters[1].body.reset(640, 900));
    await sleep(300);
  }
  await page.waitForFunction(() => window.__game.scene.isActive('Result'), null, { timeout: 60000 }).catch(() => {});
  await sleep(800);
  await page.screenshot({ path: `${OUT}/4-vitoria.png` });
  const active = await page.evaluate(() => window.__game.scene.getScenes(true).map((s) => s.scene.key));
  console.log('cenas ativas no fim:', active.join(','));
  await page.close();
  return active.includes('Result');
}

async function mobile() {
  const ctx = await browser.newContext({ ...devices['Pixel 7 landscape'] });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`[mobile] ${e.message}`));
  await page.goto(URL);
  await focus(page);
  await sleep(1200);
  await page.screenshot({ path: `${OUT}/5-menu-celular.png` });
  const box = await page.locator('canvas').boundingBox();
  const at = (x, y) => ({ x: box.x + (x / 1280) * box.width, y: box.y + (y / 720) * box.height });
  const p = at(640, 270); // Jogar com giroscópio
  await page.touchscreen.tap(p.x, p.y);
  await sleep(600);
  // sensores sintéticos: celular deitado (paisagem), depois inclinado para a direita
  const orient = (beta, gamma) =>
    page.evaluate(([b, g]) => {
      const e = new Event('deviceorientation');
      Object.assign(e, { alpha: 0, beta: b, gamma: g });
      window.dispatchEvent(e);
    }, [beta, gamma]);
  // Em paisagem o eixo lateral é o beta; se o emulador reportar retrato, é o gamma.
  const angle = await page.evaluate(() => screen.orientation?.angle ?? 0);
  const landscape = angle === 90 || angle === 270;
  await orient(0, 30);
  // a calibração acontece no "Já!": mantém o celular parado até a rodada começar
  await page.waitForFunction(() => window.__game.scene.getScene('Game')?.state === 'play', null, { timeout: 60000 });
  // adversário parado, para medir só o efeito dos sensores
  await page.evaluate(() => {
    const g = window.__game.scene.getScene('Game');
    g.controllers.set(g.critters[1], { read: () => ({ move: 0, jump: false, dash: false, fire: false }) });
  });
  await sleep(200);
  const x0 = await page.evaluate(() => window.__game.scene.getScene('Game').critters[0].x);
  for (let i = 0; i < 12; i++) {
    await (landscape ? orient(angle === 90 ? 16 : -16, 30) : orient(0, 46)); // inclina para a direita
    await sleep(100);
  }
  const x1 = await page.evaluate(() => window.__game.scene.getScene('Game').critters[0].x);
  // puxão rápido = pulo
  await page.evaluate(() => {
    const e = new Event('devicemotion');
    Object.assign(e, { rotationRate: { alpha: 0, beta: 0, gamma: 260 }, acceleration: { x: 0, y: 0, z: 0 } });
    window.dispatchEvent(e);
  });
  await sleep(120);
  const vy = await page.evaluate(() => window.__game.scene.getScene('Game').critters[0].body.velocity.y);
  await page.screenshot({ path: `${OUT}/6-jogo-celular.png` });
  console.log(`celular: x ${Math.round(x0)} → ${Math.round(x1)} (inclinação), vy após puxão = ${Math.round(vy)}`);
  await ctx.close();
  return x1 > x0 + 40 && vy < -200;
}

const okDesktop = await desktop();
const okMobile = await mobile();
await browser.close();

console.log('erros:', errors.length ? errors : 'nenhum');
console.log(`desktop: ${okDesktop ? 'OK' : 'FALHOU'} | celular: ${okMobile ? 'OK' : 'FALHOU'}`);
process.exit(okDesktop && okMobile && errors.length === 0 ? 0 : 1);
