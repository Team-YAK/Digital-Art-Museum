import Phaser from 'phaser';
import { RoomPlayer } from '../entities/RoomPlayer';
import { EventBus } from '../EventBus';

interface HubObject {
  label: string;
  sublabel: string;
  x: number;
  y: number;
  width: number;
  height: number;
  action: string;
}

export class HubScene2D extends Phaser.Scene {
  private player!: RoomPlayer;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private objects: { hitbox: Phaser.GameObjects.Rectangle; data: HubObject; promptText: Phaser.GameObjects.Text | null }[] = [];
  private nearestIdx: number = -1;
  private modalOpen: boolean = false;
  private wizardSprite!: Phaser.GameObjects.Image;
  private wizardTimer: number = 0;
  private obstacleGroup!: Phaser.Physics.Arcade.StaticGroup;

  constructor() {
    super({ key: 'HubScene2D' });
  }

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;

    // One row of back wall tiles
    const WALL_H = 64;
    // Playfield starts right after back wall
    const FLOOR_Y = WALL_H;
    // Player is bounded to the full width (no side walls)
    this.physics.world.setBounds(0, FLOOR_Y, w, h - FLOOR_Y);

    // ---- Back wall ----
    for (let x = 0; x < w; x += 64) {
      this.add.image(x, 0, 'wall_gallery').setOrigin(0, 0).setDepth(1);
    }

    // ---- Floor: wood oak tiles (simpler, warmer look) ----
    for (let x = 0; x < w; x += 64) {
      for (let y = FLOOR_Y; y < h; y += 64) {
        this.add.image(x, y, 'floor_wood').setOrigin(0, 0).setDepth(0);
      }
    }

    // ---- Solid deep-red carpet runner down the center ----
    const carpetW = 120;
    const carpetX = w / 2 - carpetW / 2;
    // Gold border strip
    this.add.graphics()
      .fillStyle(0x8b6914, 1)
      .fillRect(carpetX - 4, FLOOR_Y, carpetW + 8, h - FLOOR_Y)
      .setDepth(0.15);
    // Deep red fill
    this.add.graphics()
      .fillStyle(0x7b0000, 1)
      .fillRect(carpetX, FLOOR_Y, carpetW, h - FLOOR_Y)
      .setDepth(0.2);

    // ---- Sconces on back wall (spaced evenly) ----
    const sconcePositions = [0.15, 0.35, 0.5, 0.65, 0.85];
    sconcePositions.forEach((pct, i) => {
      const key = `sconce${(i % 3) + 1}`;
      this.add.image(w * pct, 4, key).setOrigin(0.5, 0).setDepth(2).setScale(1.4);
    });

    // ---- Chandeliers (hang from ceiling) ----
    this.add.image(w * 0.25, WALL_H + 2, 'chandelier1').setOrigin(0.5, 0).setDepth(9).setScale(2);
    this.add.image(w * 0.75, WALL_H + 2, 'chandelier2').setOrigin(0.5, 0).setDepth(9).setScale(2);
    this.add.image(w * 0.5,  WALL_H - 4, 'chandelier3').setOrigin(0.5, 0).setDepth(9).setScale(2.5);

    // ---- Museum title ----
    this.add.text(w / 2, WALL_H + 12, 'Digital Art Museum', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#d4af37',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0).setDepth(10);

    // ---- Obstacle group (player cannot pass through these) ----
    this.obstacleGroup = this.physics.add.staticGroup();

    // Helper: place a sprite + invisible static collider
    // ---- Side-only decorations — nothing in the walkable center ----
    // Far-left column
    this.add.image(36, FLOOR_Y + 80,  'plant1').setOrigin(0.5, 0.5).setDepth(4).setScale(1.5);
    this.add.image(36, FLOOR_Y + 200, 'pedestal1').setOrigin(0.5, 0.5).setDepth(3).setScale(1.4);
    this.add.image(36, FLOOR_Y + 155, 'statue_bust').setOrigin(0.5, 0.5).setDepth(4).setScale(1.4);
    this.add.image(36, h - 20,        'plant2').setOrigin(0.5, 1).setDepth(4).setScale(1.5);

    // Far-right column
    this.add.image(w - 36, FLOOR_Y + 80,  'plant2').setOrigin(0.5, 0.5).setDepth(4).setScale(1.5);
    this.add.image(w - 36, FLOOR_Y + 200, 'pedestal2').setOrigin(0.5, 0.5).setDepth(3).setScale(1.4);
    this.add.image(w - 36, FLOOR_Y + 155, 'statue_abstract').setOrigin(0.5, 0.5).setDepth(4).setScale(1.4);
    this.add.image(w - 36, h - 20,        'plant1').setOrigin(0.5, 1).setDepth(4).setScale(1.5);

    // ---- Interactive objects ----
    const hubObjects: HubObject[] = [
      {
        label: 'Museum Guide',
        sublabel: 'Ask me anything!',
        x: w / 2,
        y: h * 0.35,
        width: 70,
        height: 80,
        action: 'chat',
      },
      {
        label: 'My Room',
        sublabel: 'Your gallery',
        x: w * 0.18,
        y: h * 0.42,
        width: 64,
        height: 80,
        action: 'my-room',
      },
      {
        label: 'Random Room',
        sublabel: 'Explore!',
        x: w * 0.82,
        y: h * 0.42,
        width: 64,
        height: 80,
        action: 'random-room',
      },
    ];

    for (const obj of hubObjects) {
      const hitbox = this.add.rectangle(obj.x, obj.y, obj.width, obj.height, 0x000000, 0);
      hitbox.setDepth(3);

      if (obj.action === 'chat') {
        this.wizardSprite = this.add.image(obj.x, obj.y + 10, 'wizard_idle_1');
        this.wizardSprite.setScale(2.5).setDepth(5);
      } else {
        // Portal door
        this.add.image(obj.x, obj.y + 10, 'door_open').setScale(2.2).setDepth(3);
      }

      // Label above
      const labelY = obj.action === 'chat' ? obj.y - 55 : obj.y - 50;
      this.add.text(obj.x, labelY, obj.label, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ffe066',
        backgroundColor: '#000000bb',
        padding: { x: 6, y: 3 },
      }).setOrigin(0.5, 1).setDepth(10);

      this.add.text(obj.x, obj.y + obj.height / 2 + 6, obj.sublabel, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#999999',
      }).setOrigin(0.5, 0).setDepth(10);

      this.objects.push({ hitbox, data: obj, promptText: null });
    }

    // ---- Hint at bottom ----
    this.add.text(w / 2, h - 10, 'WASD / Arrow Keys to move  |  SPACE to interact', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#666666',
      backgroundColor: '#00000055',
      padding: { x: 6, y: 3 },
    }).setOrigin(0.5, 1).setDepth(10);

    // ---- Player (spawns bottom-center) ----
    this.player = new RoomPlayer(this, w / 2, h * 0.75, true);

    // Collide player with obstacles
    this.physics.add.collider(this.player.sprite, this.obstacleGroup);

    // ---- Input ----
    if (this.input.keyboard) {
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    // ---- EventBus ----
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

  update(_time: number, delta: number): void {
    if (this.modalOpen) return;

    this.player.update();

    // Wizard idle animation (toggle frames)
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
    let closestIdx = -1;
    let closestDist = Infinity;

    for (let i = 0; i < this.objects.length; i++) {
      const obj = this.objects[i].data;
      const dx = px - obj.x;
      const dy = py - obj.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 110 && dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
    }

    if (closestIdx !== this.nearestIdx) {
      if (this.nearestIdx >= 0 && this.nearestIdx < this.objects.length) {
        const prev = this.objects[this.nearestIdx];
        if (prev.promptText) { prev.promptText.destroy(); prev.promptText = null; }
      }
      this.nearestIdx = closestIdx;
      if (closestIdx >= 0) {
        const obj = this.objects[closestIdx];
        obj.promptText = this.add.text(obj.data.x, obj.data.y + obj.data.height / 2 + 24, '[ SPACE ]', {
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#d4af37',
          backgroundColor: '#000000cc',
          padding: { x: 8, y: 4 },
        }).setOrigin(0.5, 0).setDepth(10);
      }
    }

    if (this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey) && closestIdx >= 0) {
      EventBus.emit('hub-interact', { action: this.objects[closestIdx].data.action });
    }
  }

  shutdown(): void {
    EventBus.removeAllListeners('modal-opened');
    EventBus.removeAllListeners('modal-closed');
  }
}
