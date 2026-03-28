import Phaser from 'phaser';

export class RoomPlayer {
  public sprite: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private lastDirection: string = 'down';
  private speed = 200;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    // Create sprite using the first walk_down frame
    this.sprite = scene.physics.add.sprite(x, y, 'walk_down_1');
    this.sprite.setScale(2);
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
    const left = this.cursors?.left?.isDown || this.wasd?.A?.isDown;
    const right = this.cursors?.right?.isDown || this.wasd?.D?.isDown;

    if (left) {
      this.sprite.setVelocityX(-this.speed);
      this.sprite.setVelocityY(0);
      this.sprite.play('walk-left', true);
      this.lastDirection = 'left';
    } else if (right) {
      this.sprite.setVelocityX(this.speed);
      this.sprite.setVelocityY(0);
      this.sprite.play('walk-right', true);
      this.lastDirection = 'right';
    } else {
      this.sprite.setVelocityX(0);
      this.sprite.setVelocityY(0);
      this.sprite.stop();
      // Show idle frame (first frame of last direction)
      this.sprite.setTexture(`walk_${this.lastDirection}_1`);
    }
  }

  getX(): number {
    return this.sprite.x;
  }

  getY(): number {
    return this.sprite.y;
  }
}
