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
  color: number;
  action: string;
}

export class HubScene2D extends Phaser.Scene {
  private player!: RoomPlayer;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private objects: { rect: Phaser.GameObjects.Rectangle; data: HubObject; promptText: Phaser.GameObjects.Text | null }[] = [];
  private nearestIdx: number = -1;
  private modalOpen: boolean = false;

  constructor() {
    super({ key: 'HubScene2D' });
  }

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;

    // ---- Floor ----
    const floorTex = this.textures.get('floor');
    const fw = floorTex.getSourceImage().width;
    const fh = floorTex.getSourceImage().height;
    for (let x = 0; x < w; x += fw) {
      for (let y = 0; y < h; y += fh) {
        this.add.image(x, y, 'floor').setOrigin(0, 0).setDepth(0);
      }
    }

    // ---- Walls ----
    const wallTex = this.textures.get('wall');
    const ww = wallTex.getSourceImage().width;
    const wh = wallTex.getSourceImage().height;
    // Top wall
    for (let x = 0; x < w; x += ww) {
      this.add.image(x, 0, 'wall').setOrigin(0, 0).setDepth(1);
    }
    // Bottom wall
    for (let x = 0; x < w; x += ww) {
      this.add.image(x, h - wh, 'wall').setOrigin(0, 0).setDepth(1);
    }
    // Left wall column
    for (let y = 0; y < h; y += wh) {
      this.add.image(0, y, 'wall').setOrigin(0, 0).setDepth(1);
    }
    // Right wall column
    for (let x = w - ww; x < w; x += ww) {
      for (let y = 0; y < h; y += wh) {
        this.add.image(x, y, 'wall').setOrigin(0, 0).setDepth(1);
      }
    }

    // ---- Title ----
    this.add.text(w / 2, wh + 20, 'Digital Art Museum', {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#d4af37',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0).setDepth(5);

    // ---- Interactive objects ----
    const hubObjects: HubObject[] = [
      {
        label: 'Guide NPC',
        sublabel: 'Ask me anything!',
        x: w / 2,
        y: h * 0.35,
        width: 60,
        height: 70,
        color: 0xf4a261,
        action: 'chat',
      },
      {
        label: 'My Room',
        sublabel: 'Your gallery',
        x: w * 0.22,
        y: h * 0.5,
        width: 55,
        height: 75,
        color: 0x7c3aed,
        action: 'my-room',
      },
      {
        label: 'Random Room',
        sublabel: 'Explore!',
        x: w * 0.78,
        y: h * 0.5,
        width: 55,
        height: 75,
        color: 0x0ea5e9,
        action: 'random-room',
      },
    ];

    for (const obj of hubObjects) {
      let rect: Phaser.GameObjects.Rectangle;

      if (obj.action === 'chat' && this.textures.exists('wizard')) {
        // Use wizard sprite for Guide NPC
        const wizardSprite = this.add.image(obj.x, obj.y, 'wizard');
        wizardSprite.setScale(2);
        wizardSprite.setDepth(3);
        // Invisible rect for proximity detection sizing
        rect = this.add.rectangle(obj.x, obj.y, obj.width, obj.height, obj.color, 0);
        rect.setDepth(3);
      } else {
        // Fallback: colored rectangle
        rect = this.add.rectangle(obj.x, obj.y, obj.width, obj.height, obj.color, 0.85);
        rect.setStrokeStyle(2, 0xd4af37);
        rect.setDepth(3);

        if (obj.action === 'chat') {
          this.add.circle(obj.x, obj.y - obj.height / 2 - 15, 18, obj.color, 0.9)
            .setStrokeStyle(2, 0xd4af37).setDepth(3);
        }
      }

      // Label above
      const labelOffset = obj.action === 'chat' ? 45 : 16;
      this.add.text(obj.x, obj.y - obj.height / 2 - labelOffset, obj.label, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#ffe066',
        align: 'center',
        backgroundColor: '#000000aa',
        padding: { x: 6, y: 3 },
      }).setOrigin(0.5, 1).setDepth(5);

      // Sublabel
      this.add.text(obj.x, obj.y + obj.height / 2 + 6, obj.sublabel, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#aaaaaa',
        align: 'center',
      }).setOrigin(0.5, 0).setDepth(5);

      this.objects.push({ rect, data: obj, promptText: null });
    }

    // ---- Hint text ----
    this.add.text(w / 2, h - wh - 12, 'WASD / Arrow Keys to move  |  SPACE to interact', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#888888',
    }).setOrigin(0.5, 1).setDepth(5);

    // ---- Player ----
    const wallPad = Math.max(ww, 40);
    this.physics.world.setBounds(wallPad, wh, w - wallPad * 2, h - wh * 2);
    this.player = new RoomPlayer(this, w / 2, h * 0.7, true);

    // ---- Input ----
    if (this.input.keyboard) {
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    // ---- EventBus ----
    EventBus.on('modal-opened', () => {
      this.modalOpen = true;
      if (this.input.keyboard) this.input.keyboard.enabled = false;
    });
    EventBus.on('modal-closed', () => {
      this.modalOpen = false;
      if (this.input.keyboard) this.input.keyboard.enabled = true;
    });
    EventBus.emit('scene-ready');
  }

  update(): void {
    if (this.modalOpen) return;

    this.player.update();

    const px = this.player.sprite.x;
    const py = this.player.sprite.y;

    let closestIdx = -1;
    let closestDist = Infinity;

    for (let i = 0; i < this.objects.length; i++) {
      const obj = this.objects[i].data;
      const dx = px - obj.x;
      const dy = py - obj.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 100 && dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
    }

    if (closestIdx !== this.nearestIdx) {
      // Remove old prompt
      if (this.nearestIdx >= 0 && this.nearestIdx < this.objects.length) {
        const prev = this.objects[this.nearestIdx];
        if (prev.promptText) {
          prev.promptText.destroy();
          prev.promptText = null;
        }
        prev.rect.setStrokeStyle(2, 0xd4af37);
      }
      this.nearestIdx = closestIdx;
      // Show new prompt
      if (closestIdx >= 0) {
        const obj = this.objects[closestIdx];
        obj.rect.setStrokeStyle(3, 0xffe066);
        obj.promptText = this.add.text(obj.data.x, obj.data.y + obj.data.height / 2 + 22, '[ SPACE ]', {
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#d4af37',
          backgroundColor: '#000000cc',
          padding: { x: 8, y: 4 },
        }).setOrigin(0.5, 0).setDepth(10);
      }
    }

    // SPACE to interact
    if (this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey) && closestIdx >= 0) {
      const action = this.objects[closestIdx].data.action;
      EventBus.emit('hub-interact', { action });
    }
  }

  shutdown(): void {
    EventBus.removeAllListeners('modal-opened');
    EventBus.removeAllListeners('modal-closed');
  }
}
