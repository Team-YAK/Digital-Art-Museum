import Phaser from 'phaser';

export class RoomBoot extends Phaser.Scene {
  constructor() {
    super({ key: 'RoomBoot' });
  }

  preload(): void {
    // Tile assets
    this.load.image('floor', '/assets/tiles/floor.png');
    this.load.image('wall', '/assets/tiles/wall.png');
    this.load.image('stairs', '/assets/tiles/stairs.png');

    // Player walk frames — 4 directions × 9 frames
    const directions = ['down', 'up', 'left', 'right'];
    for (const dir of directions) {
      for (let i = 1; i <= 9; i++) {
        this.load.image(`walk_${dir}_${i}`, `/assets/player/walk_${dir}_${i}.png`);
      }
    }
  }

  create(): void {
    this.scene.start('RoomScene');
  }
}
