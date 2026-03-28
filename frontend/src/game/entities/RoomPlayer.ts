import Phaser from 'phaser';

export class RoomPlayer {
  public sprite: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private lastDirection: string = 'down';
  private speed = 200;
  private allowVertical: boolean;

  constructor(scene: Phaser.Scene, x: number, y: number, allowVertical = false) {
    this.allowVertical = allowVertical;
    // Create sprite using the first walk_down frame
    this.sprite = scene.physics.add.sprite(x, y, 'walk_down_1');
    this.sprite.setScale(2);
    this.sprite.setDepth(6);
    this.sprite.setCollideWorldBounds(true);
    (this.sprite.body as Phaser.Physics.Arcade.Body).setGravityY(0);

    // Create animations from individual frame images
    const directions = ['down', 'up', 'left', 'right'];
    for (const dir of directions) {
      const frames: Phaser.Types.Animations.AnimationFrame[] = [];
      for (let i = 1; i <= 9; i++) {
        frames.push({ key: `walk_${dir}_${i}` });
      }
      scene.anims.create({
        key: `walk-${dir}`,
        frames,
        frameRate: 10,
        repeat: -1,
      });
    }

    // Setup input
    if (scene.input.keyboard) {
      this.cursors = scene.input.keyboard.createCursorKeys();
      this.wasd = {
        W: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }
  }

  update(): void {
    // Never process movement when a text input / textarea has keyboard focus
    const tag = (document.activeElement?.tagName ?? '').toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA') {
      this.sprite.setVelocity(0, 0);
      return;
    }

    const left = this.cursors?.left?.isDown || this.wasd?.A?.isDown;
    const right = this.cursors?.right?.isDown || this.wasd?.D?.isDown;
    const up = this.allowVertical && (this.cursors?.up?.isDown || this.wasd?.W?.isDown);
    const down = this.allowVertical && (this.cursors?.down?.isDown || this.wasd?.S?.isDown);

    let vx = 0;
    let vy = 0;
    if (left) vx = -this.speed;
    else if (right) vx = this.speed;
    if (up) vy = -this.speed;
    else if (down) vy = this.speed;

    this.sprite.setVelocity(vx, vy);

    if (vx < 0) { this.sprite.setFlipX(true); this.sprite.play('walk-right', true); this.lastDirection = 'left'; }
    else if (vx > 0) { this.sprite.setFlipX(false); this.sprite.play('walk-right', true); this.lastDirection = 'right'; }
    else if (vy < 0) { this.sprite.setFlipX(false); this.sprite.play('walk-up', true); this.lastDirection = 'up'; }
    else if (vy > 0) { this.sprite.setFlipX(false); this.sprite.play('walk-down', true); this.lastDirection = 'down'; }
    else {
      this.sprite.stop();
      const idleDir = this.lastDirection === 'left' ? 'right' : this.lastDirection;
      this.sprite.setTexture(`walk_${idleDir}_1`);
      this.sprite.setFlipX(this.lastDirection === 'left');
    }
  }

  getX(): number {
    return this.sprite.x;
  }

  getY(): number {
    return this.sprite.y;
  }
}
