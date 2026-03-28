import Phaser from 'phaser';

export class HubBoot extends Phaser.Scene {
  constructor() {
    super({ key: 'HubBoot' });
  }

  preload(): void {
    this.load.image('floor', '/assets/tiles/floor.png');
    this.load.image('wall', '/assets/tiles/wall.png');
    this.load.image('stairs', '/assets/tiles/stairs.png');

    const directions = ['down', 'up', 'left', 'right'];
    for (const dir of directions) {
      for (let i = 1; i <= 9; i++) {
        this.load.image(`walk_${dir}_${i}`, `/assets/player/walk_${dir}_${i}.png`);
      }
    }
  }

  create(): void {
    this.scene.start('HubScene2D');
  }
}
