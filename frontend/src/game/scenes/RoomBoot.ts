import Phaser from 'phaser';

export class RoomBoot extends Phaser.Scene {
  constructor() {
    super({ key: 'RoomBoot' });
  }

  preload(): void {
    // ---- Tiles ----
    this.load.image('floor_wood',   '/assets/tiles/floor_wood.png');
    this.load.image('wall_gallery', '/assets/tiles/wall_gallery.png');

    // ---- Props ----
    this.load.image('chandelier1', '/assets/props/chandelier_01.png');
    this.load.image('chandelier2', '/assets/props/chandelier_02.png');
    this.load.image('sconce1',     '/assets/props/sconce_01.png');
    this.load.image('sconce2',     '/assets/props/sconce_02.png');
    this.load.image('sconce3',     '/assets/props/sconce_03.png');
    this.load.image('pedestal1',   '/assets/props/pedestal_01.png');

    // ---- RandomSprites ----
    this.load.image('plant1',    '/assets/sprites/Plant1.png');
    this.load.image('plant2',    '/assets/sprites/Plant2.png');
    this.load.image('door_open', '/assets/sprites/DoorOpened.png');
    this.load.image('stairs',    '/assets/sprites/Stairs1.png');

    // ---- Player walk frames ----
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
