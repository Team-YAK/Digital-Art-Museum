import Phaser from 'phaser';
import { RoomPlayer } from '../entities/RoomPlayer';
import { EventBus } from '../EventBus';
import type { FeaturedArtwork } from '@/types/api';

// ─── World constants ────────────────────────────────────────────────────────
const HUB_SIZE   = 3000;
const WALL_H     = 64;

// ─── Grid Definitions for Walkways ───────────────────────────────────────────
const SLOT_COUNT = 24; // We will generate 24 easel frames in a grid
const COLS = 6;
const SLOT_SPACING_X = 400;
const SLOT_SPACING_Y = 400;
const START_X = (HUB_SIZE - (COLS - 1) * SLOT_SPACING_X) / 2;
const START_Y = 800; // start below the entrance

// ─── Hub canvas ─────────────────────────────────────────────────────────────
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
    const h = HUB_SIZE;
    const floorY = h * 0.75; // No longer highly relevant for true 2D, but we'll use 0 for back wall

    // World & physics bounds
    this.physics.world.setBounds(0, WALL_H, HUB_SIZE, HUB_SIZE - WALL_H);

    // Obstacle group (easel colliders)
    this.obstacleGroup = this.physics.add.staticGroup();

    // Invincible map boundaries
    this.obstacleGroup.create(-10, HUB_SIZE/2, 'wall').setDisplaySize(20, HUB_SIZE).refreshBody().setVisible(false);
    this.obstacleGroup.create(HUB_SIZE+10, HUB_SIZE/2, 'wall').setDisplaySize(20, HUB_SIZE).refreshBody().setVisible(false);
    this.obstacleGroup.create(HUB_SIZE/2, HUB_SIZE+10, 'wall').setDisplaySize(HUB_SIZE, 20).refreshBody().setVisible(false);

    // ── Tiles ──────────────────────────────────────────────────────────────
    this.buildTiles(HUB_SIZE);

    // ── Carpet runner (center of room, full length) ─────────────────────────
    this.buildCarpet(HUB_SIZE);

    // ── Sconces on back wall ────────────────────────────────────────────────
    for (let x = 300; x < HUB_SIZE; x += 320) {
      const key = `sconce${(Math.floor(x / 320) % 3) + 1}`;
      this.add.image(x, 6, key).setOrigin(0.5, 0).setDepth(2).setScale(1.3);
    }

    // ── Chandeliers ─────────────────────────────────────────────────────────
    const chandKeys = ['chandelier1', 'chandelier2', 'chandelier3'];
    for (let x = 400; x < HUB_SIZE; x += 600) {
      const key = chandKeys[Math.floor(x / 600) % chandKeys.length];
      this.add.image(x, WALL_H + 2, key).setOrigin(0.5, 0).setDepth(9).setScale(1.8);
    }

    // ── Museum title (entrance zone) ────────────────────────────────────────
    this.add.text(HUB_SIZE / 2, WALL_H + 14, 'Digital Art Museum', {
      fontFamily: 'monospace', fontSize: '18px', color: '#d4af37', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setDepth(10);

    // ── Side decorations ────────────────────────────────────────────────────
    this.buildDecorations();

    // ── Interactive hub objects (guide NPC + My Room portal) ─────────────────
    const staticObjects: HubObject[] = [
      { label: 'Museum Guide', sublabel: 'Ask me anything!', x: HUB_SIZE * 0.5, y: 350, action: 'chat' },
      { label: 'My Room',      sublabel: 'Your gallery',     x:  150, y: WALL_H + 20, action: 'my-room' },
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
      
      this.obstacleGroup.create(obj.x, obj.y + 10, 'wall_gallery').setDisplaySize(60, 20).refreshBody().setVisible(false);
    }

    // ── Build canvas slots and assign artworks ─────────────────────────────
    this.buildCanvases();

    // ── Hint text ──────────────────────────────────────────────────────────
    this.add.text(HUB_SIZE / 2, HUB_SIZE - 20, 'WASD / Arrow Keys  ·  SPACE to interact', {
      fontFamily: 'monospace', fontSize: '14px', color: '#666666',
      backgroundColor: '#00000055', padding: { x: 6, y: 3 },
    }).setOrigin(0.5, 1).setDepth(10);

    // ── Player ────────────────────────────────────────────────────────────
    this.player = new RoomPlayer(this, HUB_SIZE / 2, HUB_SIZE - 200, true);
    this.physics.add.collider(this.player.sprite, this.obstacleGroup);

    // ── Camera ────────────────────────────────────────────────────────────
    this.cameras.main.setBounds(0, 0, HUB_SIZE, HUB_SIZE);
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
  private buildTiles(h: number): void {
    const floorKey = this.textures.exists('floor_wood') ? 'floor_wood' : 'floor';
    for (let x = 0; x < HUB_SIZE; x += 128) {
      for (let y = WALL_H; y < h; y += 128) {
        this.add.image(x, y, floorKey).setOrigin(0, 0).setDepth(0).setScale(2);
      }
    }
    const wallKey = this.textures.exists('wall_gallery') ? 'wall_gallery' : 'wall';
    for (let x = 0; x < HUB_SIZE; x += 64) {
      this.add.image(x, 0, wallKey).setOrigin(0, 0).setDepth(0);
    }
    this.add.rectangle(HUB_SIZE / 2, HUB_SIZE / 2, HUB_SIZE, HUB_SIZE, 0x0d0d1a).setOrigin(0.5, 0.5).setDepth(-1);
  }

  // ── Deep-red carpet runner ──────────────────────────────────────────────────
  private buildCarpet(h: number): void {
    const carpetW = 200;
    const carpetX = HUB_SIZE / 2 - carpetW / 2;
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
  private buildDecorations(): void {
    const plantKeys = ['plant1', 'plant2'];
    // Plants along the organized walkway edges
    for (let i = 0; i < SLOT_COUNT; i += 2) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const px = START_X + col * SLOT_SPACING_X + SLOT_SPACING_X / 2;
      const py = START_Y + row * SLOT_SPACING_Y - 40;
      this.add.image(px, py, plantKeys[i % 2]).setOrigin(0.5, 1).setDepth(py / 1000).setScale(1.6);
    }

    // Pedestals in regular spots
    if (this.textures.exists('pedestal1')) {
      for (let i = 1; i < SLOT_COUNT; i += 4) {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const pedX = START_X + col * SLOT_SPACING_X + SLOT_SPACING_X / 2;
        const pedY = START_Y + row * SLOT_SPACING_Y - 10;
        const pedKey = i % 2 === 0 ? 'pedestal1' : 'pedestal2';
        if (this.textures.exists(pedKey)) {
          this.add.image(pedX, pedY, pedKey).setOrigin(0.5, 1).setDepth(pedY / 1000).setScale(1.4);
        }
      }
    }
  }

  // ── Build all canvas slots and paint any artworks onto them ────────────────
  private buildCanvases(): void {
    const artworks: FeaturedArtwork[] = this.registry.get('hubArtworks') || [];
    let artIdx = 0;

    const allSlots: HubCanvas[] = [];

    // Wall slots (3 distributed slots along the back wall to not look completely bare)
    const wallSpots = [HUB_SIZE * 0.25, HUB_SIZE * 0.75];
    for (const wx of wallSpots) {
      const art = artworks[artIdx] ?? null;
      allSlots.push({ x: wx, interactY: 40, type: 'wall', artwork: art, prompt: null });
      if (art) artIdx++;
    }

    // Organized Easel grid slots
    for (let i = 0; i < SLOT_COUNT; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const slotX = START_X + col * SLOT_SPACING_X;
      const slotY = START_Y + row * SLOT_SPACING_Y;
      
      const art = artworks[artIdx] ?? null;
      allSlots.push({ x: slotX, interactY: slotY, type: 'easel', artwork: art, prompt: null });
      if (art) artIdx++;
    }

    this.hubCanvases = allSlots;

    // Render each slot
    for (const canvas of this.hubCanvases) {
      if (canvas.type === 'wall') {
        this.renderWallCanvas(canvas);
      } else {
        this.renderEaselCanvas(canvas, HUB_SIZE);
      }
    }
  }

  // ── Wall-mounted painting ────────────────────────────────────────────────────
  private renderWallCanvas(canvas: HubCanvas): void {
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
