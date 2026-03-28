import Phaser from 'phaser';
import { RoomPlayer } from '../entities/RoomPlayer';
import { EventBus } from '../EventBus';
import type { FeaturedArtwork } from '@/types/api';

// ─── World constants ────────────────────────────────────────────────────────
const HUB_WIDTH  = 5200;
const WALL_H     = 64;

// ─── Canvas-slot definitions (wall + easel positions) ───────────────────────
// type='wall'  → frame drawn on the back wall, interaction at floor level
// type='easel' → free-standing easel at (x, ey)
interface CanvasSlot {
  x:    number;
  type: 'wall' | 'easel';
  ey?:  number; // easel base-Y (world-space, runtime, filled in create())
}

// Wall slots spread across the full width
const WALL_SLOTS_X = [500, 820, 1140, 1500, 1820, 2180, 2550, 2900, 3260, 3640, 4020, 4420, 4800];

// Easel slots — x positions only; ey is computed in create() from screen height
const EASEL_SLOTS: Array<{ x: number; yFrac: number }> = [
  { x:  420, yFrac: 0.50 },
  { x:  700, yFrac: 0.62 },
  { x:  960, yFrac: 0.44 },
  { x: 1260, yFrac: 0.57 },
  { x: 1560, yFrac: 0.47 },
  { x: 1900, yFrac: 0.60 },
  { x: 2150, yFrac: 0.42 },
  { x: 2420, yFrac: 0.55 },
  { x: 2750, yFrac: 0.48 },
  { x: 3050, yFrac: 0.62 },
  { x: 3320, yFrac: 0.44 },
  { x: 3680, yFrac: 0.54 },
  { x: 3980, yFrac: 0.42 },
  { x: 4300, yFrac: 0.57 },
];

// ─── Hub canvas (a slot + optional artwork) ──────────────────────────────────
interface HubCanvas {
  x:         number;
  interactY: number; // Y used for proximity detection
  type:      'wall' | 'easel';
  artwork:   FeaturedArtwork | null;
  prompt:    Phaser.GameObjects.Text | null;
}

// ─── Fixed hub interactive objects (wizard, portal) ─────────────────────────
interface HubObject {
  label:    string;
  sublabel: string;
  x:        number;
  y:        number;
  action:   string;
}

// ─────────────────────────────────────────────────────────────────────────────
export class HubScene2D extends Phaser.Scene {
  private player!: RoomPlayer;
  private spaceKey!: Phaser.Input.Keyboard.Key;

  // NPC / portal objects
  private hubObjects: { x: number; y: number; action: string; prompt: Phaser.GameObjects.Text | null }[] = [];
  private nearestObjIdx: number = -1;

  // Painting canvases
  private hubCanvases: HubCanvas[] = [];
  private nearestCanvasIdx: number = -1;

  private wizardSprite!: Phaser.GameObjects.Image;
  private wizardTimer = 0;

  private obstacleGroup!: Phaser.Physics.Arcade.StaticGroup;
  private modalOpen = false;

  constructor() {
    super({ key: 'HubScene2D' });
  }

  // ── preload: dynamically load artwork images stored in registry ─────────────
  preload(): void {
    const artworks: FeaturedArtwork[] = this.registry.get('hubArtworks') || [];
    for (const art of artworks) {
      const key = `hub_art_${art.id}`;
      if (!this.textures.exists(key)) {
        this.load.image(key, art.pixel_image_url);
      }
    }
  }

  // ── create ──────────────────────────────────────────────────────────────────
  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const floorY = Math.floor(h * 0.75);

    // World & physics bounds
    this.physics.world.setBounds(0, WALL_H, HUB_WIDTH, h - WALL_H);

    // Obstacle group (easel colliders)
    this.obstacleGroup = this.physics.add.staticGroup();

    // ── Tiles ──────────────────────────────────────────────────────────────
    this.buildTiles(floorY, h);

    // ── Carpet runner (center of room, full length) ─────────────────────────
    this.buildCarpet(floorY, h);

    // ── Sconces on back wall ────────────────────────────────────────────────
    for (let x = 300; x < HUB_WIDTH; x += 320) {
      const key = `sconce${(Math.floor(x / 320) % 3) + 1}`;
      this.add.image(x, 6, key).setOrigin(0.5, 0).setDepth(2).setScale(1.3);
    }

    // ── Chandeliers ─────────────────────────────────────────────────────────
    const chandKeys = ['chandelier1', 'chandelier2', 'chandelier3'];
    for (let x = 400; x < HUB_WIDTH; x += 600) {
      const key = chandKeys[Math.floor(x / 600) % chandKeys.length];
      this.add.image(x, WALL_H + 2, key).setOrigin(0.5, 0).setDepth(9).setScale(1.8);
    }

    // ── Museum title (entrance zone) ────────────────────────────────────────
    this.add.text(w / 2, WALL_H + 14, 'Digital Art Museum', {
      fontFamily: 'monospace', fontSize: '18px', color: '#d4af37', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setDepth(10);

    // ── Side decorations ────────────────────────────────────────────────────
    this.buildDecorations(floorY, h);

    // ── Interactive hub objects (guide NPC + My Room portal) ─────────────────
    const staticObjects: HubObject[] = [
      { label: 'Museum Guide', sublabel: 'Ask me anything!', x: w * 0.5, y: h * 0.35, action: 'chat' },
      { label: 'My Room',      sublabel: 'Your gallery',     x:  100,    y: h * 0.42, action: 'my-room' },
    ];

    for (const obj of staticObjects) {
      if (obj.action === 'chat') {
        this.wizardSprite = this.add.image(obj.x, obj.y + 10, 'wizard_idle_1')
          .setScale(2.5).setDepth(5);
      } else {
        this.add.image(obj.x, obj.y + 10, 'door_open').setScale(2.2).setDepth(3);
      }

      // Label above
      const labelY = obj.action === 'chat' ? obj.y - 55 : obj.y - 50;
      this.add.text(obj.x, labelY, obj.label, {
        fontFamily: 'monospace', fontSize: '12px', color: '#ffe066',
        backgroundColor: '#000000bb', padding: { x: 6, y: 3 },
      }).setOrigin(0.5, 1).setDepth(10);

      this.add.text(obj.x, obj.y + 46, obj.sublabel, {
        fontFamily: 'monospace', fontSize: '10px', color: '#999999',
      }).setOrigin(0.5, 0).setDepth(10);

      this.hubObjects.push({ x: obj.x, y: obj.y, action: obj.action, prompt: null });
    }

    // ── Build canvas slots and assign artworks ─────────────────────────────
    this.buildCanvases(floorY, h);

    // ── Hint text ──────────────────────────────────────────────────────────
    this.add.text(HUB_WIDTH / 2, h - 10, 'WASD / Arrow Keys  ·  SPACE to interact', {
      fontFamily: 'monospace', fontSize: '10px', color: '#666666',
      backgroundColor: '#00000055', padding: { x: 6, y: 3 },
    }).setOrigin(0.5, 1).setDepth(10);

    // ── Player ────────────────────────────────────────────────────────────
    this.player = new RoomPlayer(this, 200, h * 0.65, true);
    this.physics.add.collider(this.player.sprite, this.obstacleGroup);

    // ── Camera ────────────────────────────────────────────────────────────
    this.cameras.main.setBounds(0, 0, HUB_WIDTH, h);
    this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.08);

    // ── Input ─────────────────────────────────────────────────────────────
    if (this.input.keyboard) {
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    // ── EventBus ──────────────────────────────────────────────────────────
    EventBus.on('modal-opened', () => {
      this.modalOpen = true;
      if (this.input.keyboard) this.input.keyboard.enabled = false;
      (this.player.sprite.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    });
    EventBus.on('modal-closed', () => {
      this.modalOpen = false;
      if (this.input.keyboard) this.input.keyboard.enabled = true;
    });

    EventBus.emit('scene-ready');
  }

  // ── Tile the back wall and floor across the full hub width ─────────────────
  private buildTiles(floorY: number, h: number): void {
    for (let x = 0; x < HUB_WIDTH; x += 64) {
      this.add.image(x, 0, 'wall_gallery').setOrigin(0, 0).setDepth(1);
    }
    for (let x = 0; x < HUB_WIDTH; x += 64) {
      for (let y = WALL_H; y < h; y += 64) {
        this.add.image(x, y, 'floor_wood').setOrigin(0, 0).setDepth(0);
      }
    }
  }

  // ── Deep-red carpet runner ──────────────────────────────────────────────────
  private buildCarpet(floorY: number, h: number): void {
    const carpetW = 140;
    const carpetX = HUB_WIDTH / 2 - carpetW / 2;
    // Gold border
    this.add.graphics()
      .fillStyle(0x8b6914, 1)
      .fillRect(carpetX - 4, WALL_H, carpetW + 8, h - WALL_H)
      .setDepth(0.15);
    // Red fill
    this.add.graphics()
      .fillStyle(0x7b0000, 1)
      .fillRect(carpetX, WALL_H, carpetW, h - WALL_H)
      .setDepth(0.2);
  }

  // ── Side decorations at regular intervals ──────────────────────────────────
  private buildDecorations(floorY: number, h: number): void {
    const plantKeys = ['plant1', 'plant2'];
    // Plants along left and right "edges" of the hub at intervals
    for (let x = 80; x < HUB_WIDTH; x += 600) {
      this.add.image(x,           floorY - 8, plantKeys[Math.floor(x / 600) % 2])
        .setOrigin(0.5, 1).setDepth(4).setScale(1.6);
      this.add.image(x + HUB_WIDTH / 10, h - 12, plantKeys[(Math.floor(x / 600) + 1) % 2])
        .setOrigin(0.5, 1).setDepth(4).setScale(1.4);
    }

    // Pedestals in the far corners and at regular spots
    if (this.textures.exists('pedestal1')) {
      for (let x = 250; x < HUB_WIDTH; x += 900) {
        const pedKey = x % 1800 === 0 ? 'pedestal1' : 'pedestal2';
        if (this.textures.exists(pedKey)) {
          this.add.image(x, floorY - 8, pedKey).setOrigin(0.5, 1).setDepth(3).setScale(1.4);
        }
      }
    }

    // Statues
    if (this.textures.exists('statue_bust')) {
      for (let x = 1200; x < HUB_WIDTH; x += 1800) {
        this.add.image(x, floorY - 8, 'statue_bust').setOrigin(0.5, 1).setDepth(4).setScale(1.3);
      }
    }
    if (this.textures.exists('statue_abstract')) {
      for (let x = 2400; x < HUB_WIDTH; x += 1800) {
        this.add.image(x, floorY - 8, 'statue_abstract').setOrigin(0.5, 1).setDepth(4).setScale(1.3);
      }
    }
  }

  // ── Build all canvas slots and paint any artworks onto them ────────────────
  private buildCanvases(floorY: number, h: number): void {
    const artworks: FeaturedArtwork[] = this.registry.get('hubArtworks') || [];
    let artIdx = 0;

    const allSlots: HubCanvas[] = [];

    // Wall slots
    for (const wx of WALL_SLOTS_X) {
      const art = artworks[artIdx] ?? null;
      allSlots.push({ x: wx, interactY: floorY - 40, type: 'wall', artwork: art, prompt: null });
      if (art) artIdx++;
    }

    // Easel slots
    for (const es of EASEL_SLOTS) {
      const ey = Math.floor(h * es.yFrac);
      const art = artworks[artIdx] ?? null;
      allSlots.push({ x: es.x, interactY: ey, type: 'easel', artwork: art, prompt: null });
      if (art) artIdx++;
    }

    this.hubCanvases = allSlots;

    // Render each slot
    for (const canvas of this.hubCanvases) {
      if (canvas.type === 'wall') {
        this.renderWallCanvas(canvas, floorY);
      } else {
        this.renderEaselCanvas(canvas, h);
      }
    }
  }

  // ── Wall-mounted painting ────────────────────────────────────────────────────
  private renderWallCanvas(canvas: HubCanvas, floorY: number): void {
    const cx   = canvas.x;
    const cy   = 40; // vertical center on the back wall tile
    const fw   = 100;
    const fh   = 76;

    const g = this.add.graphics().setDepth(2);

    // Shadow
    g.fillStyle(0x000000, 0.35);
    g.fillRect(cx - fw / 2 + 3, cy - fh / 2 + 3, fw, fh);

    // Frame background
    g.fillStyle(0x1a0f00, 1);
    g.fillRect(cx - fw / 2, cy - fh / 2, fw, fh);

    // Gold outer border
    g.lineStyle(3, 0xd4af37, 1);
    g.strokeRect(cx - fw / 2, cy - fh / 2, fw, fh);

    // Inner inset
    g.lineStyle(1, 0x8b6914, 0.7);
    g.strokeRect(cx - fw / 2 + 4, cy - fh / 2 + 4, fw - 8, fh - 8);

    if (canvas.artwork) {
      // Artwork image
      const key = `hub_art_${canvas.artwork.id}`;
      if (this.textures.exists(key)) {
        const img = this.add.image(cx, cy, key);
        img.setDisplaySize(fw - 10, fh - 10).setDepth(3);
      }

      // Artist label below frame
      this.add.text(cx, cy + fh / 2 + 5, `@${canvas.artwork.owner_username}`, {
        fontFamily: 'monospace', fontSize: '9px', color: '#8b6914',
      }).setOrigin(0.5, 0).setDepth(4);
    } else {
      // Empty frame placeholder
      g.fillStyle(0x2a1a08, 0.6);
      g.fillRect(cx - fw / 2 + 5, cy - fh / 2 + 5, fw - 10, fh - 10);
    }
  }

  // ── Free-standing easel painting ─────────────────────────────────────────────
  private renderEaselCanvas(canvas: HubCanvas, h: number): void {
    const cx     = canvas.x;
    const cy     = canvas.interactY;   // easel base/interaction y
    const fw     = 90;
    const fh     = 72;
    const postH  = 55;
    const baseW  = 68;
    const frameTopY  = cy - postH - fh;      // top of the canvas frame
    const frameCY    = frameTopY + fh / 2;   // centre of the frame

    // Depth: higher y = closer = drawn on top
    const depth = 3 + Math.floor(cy / h * 4); // 3..7

    const g = this.add.graphics().setDepth(depth);

    // ── Canvas frame shadow ──────────────────────────────────────────────
    g.fillStyle(0x000000, 0.3);
    g.fillRect(cx - fw / 2 + 3, frameTopY + 3, fw, fh);

    // ── Canvas frame background ─────────────────────────────────────────
    g.fillStyle(0x1a0f00, 1);
    g.fillRect(cx - fw / 2, frameTopY, fw, fh);

    // ── Gold border ─────────────────────────────────────────────────────
    g.lineStyle(3, 0xd4af37, 1);
    g.strokeRect(cx - fw / 2, frameTopY, fw, fh);

    // ── Inner inset ─────────────────────────────────────────────────────
    g.lineStyle(1, 0x8b6914, 0.7);
    g.strokeRect(cx - fw / 2 + 4, frameTopY + 4, fw - 8, fh - 8);

    // ── Easel post (dark wood) ───────────────────────────────────────────
    g.fillStyle(0x3d2200, 1);
    g.fillRect(cx - 3, frameCY + fh / 2, 6, postH);

    // ── Easel legs (A-frame) ─────────────────────────────────────────────
    g.lineStyle(4, 0x3d2200, 1);
    g.lineBetween(cx, cy - 8, cx - baseW / 2, cy + 2);
    g.lineBetween(cx, cy - 8, cx + baseW / 2, cy + 2);

    // ── Base plate (dark wood) ───────────────────────────────────────────
    g.fillStyle(0x3d2200, 1);
    g.fillRect(cx - baseW / 2, cy - 4, baseW, 8);

    // ── Artwork image ────────────────────────────────────────────────────
    if (canvas.artwork) {
      const key = `hub_art_${canvas.artwork.id}`;
      if (this.textures.exists(key)) {
        const img = this.add.image(cx, frameCY, key);
        img.setDisplaySize(fw - 10, fh - 10).setDepth(depth + 0.5);
      }

      // Artist label below easel
      this.add.text(cx, cy + 10, `@${canvas.artwork.owner_username}`, {
        fontFamily: 'monospace', fontSize: '9px', color: '#8b6914',
      }).setOrigin(0.5, 0).setDepth(depth + 1);
    } else {
      // Empty canvas texture
      g.fillStyle(0x2a1a08, 0.5);
      g.fillRect(cx - fw / 2 + 5, frameTopY + 5, fw - 10, fh - 10);
    }

    // ── Thin physics collider at base (so player can't walk through) ─────
    const blocker = this.obstacleGroup.create(cx, cy, 'wall_gallery') as Phaser.Physics.Arcade.Image;
    blocker.setVisible(false).setDisplaySize(baseW, 12).refreshBody();
  }

  // ── update ──────────────────────────────────────────────────────────────────
  update(_time: number, delta: number): void {
    if (this.modalOpen) return;

    this.player.update();

    // Wizard animation
    if (this.wizardSprite) {
      this.wizardTimer += delta;
      if (this.wizardTimer > 600) {
        this.wizardTimer = 0;
        const cur = this.wizardSprite.texture.key;
        this.wizardSprite.setTexture(cur === 'wizard_idle_1' ? 'wizard_idle_2' : 'wizard_idle_1');
      }
    }

    const px = this.player.sprite.x;
    const py = this.player.sprite.y;

    // ── Hub object proximity (wizard / portal) ──────────────────────────
    let closestObjIdx = -1;
    let closestObjDist = Infinity;
    for (let i = 0; i < this.hubObjects.length; i++) {
      const o = this.hubObjects[i];
      const dx = px - o.x;
      const dy = py - o.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 110 && d < closestObjDist) { closestObjDist = d; closestObjIdx = i; }
    }
    if (closestObjIdx !== this.nearestObjIdx) {
      if (this.nearestObjIdx >= 0) {
        const prev = this.hubObjects[this.nearestObjIdx];
        if (prev.prompt) { prev.prompt.destroy(); prev.prompt = null; }
      }
      this.nearestObjIdx = closestObjIdx;
      if (closestObjIdx >= 0) {
        const o = this.hubObjects[closestObjIdx];
        o.prompt = this.add.text(o.x, o.y + 52, '[ SPACE ]', {
          fontFamily: 'monospace', fontSize: '12px', color: '#d4af37',
          backgroundColor: '#000000cc', padding: { x: 8, y: 4 },
        }).setOrigin(0.5, 0).setDepth(10);
      }
    }

    // ── Canvas proximity ────────────────────────────────────────────────
    let closestCanvasIdx = -1;
    let closestCanvasDist = Infinity;
    const CANVAS_RANGE = 130;
    for (let i = 0; i < this.hubCanvases.length; i++) {
      const c = this.hubCanvases[i];
      if (!c.artwork) continue;
      const dx = px - c.x;
      const dy = py - c.interactY;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < CANVAS_RANGE && d < closestCanvasDist) {
        closestCanvasDist = d;
        closestCanvasIdx = i;
      }
    }
    if (closestCanvasIdx !== this.nearestCanvasIdx) {
      if (this.nearestCanvasIdx >= 0) {
        const prev = this.hubCanvases[this.nearestCanvasIdx];
        if (prev.prompt) { prev.prompt.destroy(); prev.prompt = null; }
      }
      this.nearestCanvasIdx = closestCanvasIdx;
      if (closestCanvasIdx >= 0) {
        const c = this.hubCanvases[closestCanvasIdx];
        const promptY = c.type === 'wall' ? c.interactY - 80 : c.interactY - 130;
        c.prompt = this.add.text(c.x, promptY, '[ SPACE ]', {
          fontFamily: 'monospace', fontSize: '11px', color: '#d4af37',
          backgroundColor: '#000000cc', padding: { x: 8, y: 4 },
        }).setOrigin(0.5, 1).setDepth(20);
      }
    }

    // ── SPACE interaction ───────────────────────────────────────────────
    if (this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      // Canvases take priority when nearby
      if (closestCanvasIdx >= 0) {
        const c = this.hubCanvases[closestCanvasIdx];
        if (c.artwork) {
          EventBus.emit('hub-interact', { action: 'visit-room', username: c.artwork.owner_username });
        }
      } else if (closestObjIdx >= 0) {
        EventBus.emit('hub-interact', { action: this.hubObjects[closestObjIdx].action });
      }
    }
  }

  shutdown(): void {
    EventBus.removeAllListeners('modal-opened');
    EventBus.removeAllListeners('modal-closed');
  }
}
