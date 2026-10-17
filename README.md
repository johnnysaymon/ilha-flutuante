# 🏝️ Ilha Flutuante

Jogo de plataforma para navegador em que dois bichinhos minúsculos, **Bolota** (uma hamster caramelo) e **Pipoca** (uma coelhinha com flor na orelha), tentam derrubar um ao outro de uma ilha flutuante. Vence quem ficar na ilha: a partida é em melhor de 3 rodadas.

Funciona no **computador** (teclado) e no **celular** (giroscópio + toque, ou botões na tela).

## Como jogar

- **Empurrão:** encoste no adversário correndo ou com a **investida** para empurrá-lo. Cada golpe aumenta a **tontura (%)** de quem apanha, e quanto maior a tontura, mais longe ele voa.
- **Pulo duplo:** dá para pular de novo no ar e voltar para a ilha depois de um empurrão.
- **Baús:** de tempos em tempos um baú cai do céu. Encoste nele para ganhar um poder:

| Poder | Cargas | Efeito |
|---|---|---|
| 🌬️ Rajada de Vento | 3 | Sopro em linha reta que empurra forte |
| 🫧 Bolha | 2 | Prende o adversário flutuando; um empurrão nele vale 1,5× |
| 🌸 Bomba de Pétalas | 2 | Arremesso em arco que explode num empurrão em área |
| 🍌 Casca de Banana | 2 | Fica no chão atrás de você; quem pisar escorrega |

### Controles

| | Computador (1 jogador) | 2 jogadores: Bolota | 2 jogadores: Pipoca | Celular (giroscópio) | Celular (botões) |
|---|---|---|---|---|---|
| Andar | ← → ou A D | A D | ← → | inclinar o celular para os lados | ◀ ▶ |
| Pular (2× no ar) | ↑ ou W | W | ↑ | puxão/giro rápido do celular | ▲ |
| Investida | Shift, ↓ ou S | S | ↓ | tocar na tela sem poder | ✦ sem poder |
| Poder | Espaço, F ou Enter | F | Enter | tocar na tela | ✦ |
| Pausa | Esc ou P | | | botão ⏸ no topo | botão ⏸ no topo |

No modo 1 jogador, a Pipoca é controlada pelo computador. A dificuldade (Fácil, Normal ou Difícil) é escolhida no menu.

No celular, segure o aparelho **deitado (paisagem)**. A posição em que ele estiver no "Já!" de cada rodada vira a posição "parada". Se precisar, use **Pausa → Recalibrar giroscópio**. Se o aparelho não tiver giroscópio ou a permissão for negada, o jogo troca sozinho para os botões na tela.

## Tecnologias

| Camada | Escolha | Por quê |
|---|---|---|
| Engine | [Phaser 3](https://phaser.io) | Engine 2D madura para navegador, com física Arcade, partículas, tweens e escala automática para qualquer tela |
| Linguagem | TypeScript | Tipagem em entidades, poderes e na interface de controle |
| Build | Vite | Servidor rápido. `@vitejs/plugin-basic-ssl` fornece HTTPS local, exigido para usar o giroscópio |
| Sensores | `DeviceOrientationEvent` / `DeviceMotionEvent` | APIs nativas do navegador (no iOS é preciso pedir permissão com um toque) |
| Arte | Desenhada por código (Phaser Graphics → texturas) | Nenhum arquivo de imagem. O cenário estático é "assado" numa textura para rodar leve no celular |
| Som | Web Audio API | Efeitos sintetizados, sem arquivos de áudio |
| Testes | Vitest + Playwright | Testes unitários da lógica pura e smoke test no Chromium |
| Publicação | GitHub Pages (Actions) + manifest PWA | HTTPS grátis, condição para os sensores funcionarem. Dá para instalar na tela inicial |

### Arquitetura

O teclado, o celular e a IA produzem o mesmo `ControlState` (`move`, `jump`, `dash`, `fire`) a cada quadro (`src/input/Controls.ts`). O personagem (`src/entities/Critter.ts`) não sabe quem o controla, então dá para trocar a IA por outro humano (ou, no futuro, por um jogador em rede) sem mexer nele.

```
src/
  config.ts              constantes de física, geometria da ilha, equilíbrio
  art.ts / world.ts      desenho procedural dos bichinhos, ilha, baús e poderes
  logic/knockback.ts     cálculo puro de empurrões e explosões
  logic/tilt.ts          inclinação → eixo, detecção do "puxão" de pulo
  ai/brain.ts            decisões da IA (puro, testável)
  ai/AIController.ts     adapta a IA à interface de controle
  input/                 teclado, giroscópio + toque, botões na tela
  entities/Critter.ts    personagem (física numa Zone, desenho num Image)
  powers/powers.ts       definição e ajuste dos 4 poderes
  scenes/                Boot, Menu, Game, Hud, Result
  audio/sfx.ts           efeitos sonoros sintetizados
```

## Rodando

```bash
npm install
npm run dev          # http://localhost:5173 (computador)
npm run dev:mobile   # HTTPS na rede local, para abrir no celular
npm test             # testes unitários (Vitest)
npm run build        # gera dist/
```

**Testar no celular:** rode `npm run dev:mobile`, abra no celular o endereço `https://<ip-do-computador>:5173` (na mesma rede Wi-Fi) e aceite o aviso de certificado. O giroscópio **só funciona em HTTPS**.

**Smoke test** (abre o jogo no Chromium, joga um pouco, emula sensores de celular e salva screenshots em `screenshots/`):

```bash
npm run build && npx vite preview --port 4173 &
npm run smoke
```

Parâmetros de URL para depuração: `?canvas` força o renderizador Canvas, e `?timer` usa `setTimeout` no lugar de `requestAnimationFrame`.

## Publicação

O workflow `.github/workflows/deploy.yml` roda os testes, gera o build e publica no GitHub Pages a cada push na `main`. Para ativar, vá em **Settings → Pages → Source: GitHub Actions** no repositório.
