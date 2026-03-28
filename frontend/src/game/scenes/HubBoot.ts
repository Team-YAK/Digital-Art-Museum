import Phaser from 'phaser';

export class HubBoot extends Phaser.Scene {
  constructor() {
    super({ key: 'HubBoot' });
  }

  preload(): void {
    // ---- Museum tiles ----
    this.load.image('floor_marble', '/assets/museum/tiles/floor_marble_white_01.png');
    this.load.image('floor_carpet_red', '/assets/museum/tiles/floor_carpet_red_01.png');
    this.load.image('floor_wood', '/assets/museum/tiles/floor_wood_oak_01.png');

    // ---- Museum walls ----
    this.load.image('wall_gallery', '/assets/museum/walls/wall_gallery_navy_01.png');
    this.load.image('wall_stone', '/assets/museum/walls/wall_stone_gray_01.png');
    this.load.image('wall_side', '/assets/random/WallSides3.png');

    // ---- Decorative props ----
    this.load.image('chandelier1', '/assets/museum/props/light_chandelier_gold_01.png');
    this.load.image('chandelier2', '/assets/museum/props/light_chandelier_gold_02.png');
    this.load.image('chandelier3', '/assets/museum/props/light_chandelier_gold_03.png');
    this.load.image('sconce1', '/assets/museum/props/light_wall_sconce_gold_01.png');
    this.load.image('sconce2', '/assets/museum/props/light_wall_sconce_gold_02.png');
    this.load.image('sconce3', '/assets/museum/props/light_wall_sconce_gold_03.png');
    this.load.image('plant1', '/assets/museum/props/plant_potted_01.png');
    this.load.image('plant2', '/assets/museum/props/plant_potted_02.png');
    this.load.image('plant3', '/assets/museum/props/plant_potted_03.png');
    this.load.image('plant4', '/assets/museum/props/plant_potted_04.png');
    this.load.image('bench_wood', '/assets/museum/props/bench_wood_01.png');
    this.load.image('bench_modern', '/assets/museum/props/bench_modern_01.png');
    this.load.image('statue_marble', '/assets/museum/props/statue_marble_01.png');
    this.load.image('statue_bust', '/assets/museum/props/statue_bust_marble_01.png');
    this.load.image('statue_abstract', '/assets/museum/props/statue_abstract_01.png');
    this.load.image('pedestal1', '/assets/museum/props/pedestal_stone_01.png');
    this.load.image('pedestal2', '/assets/museum/props/pedestal_stone_02.png');
    this.load.image('rope_barrier', '/assets/museum/props/rope_barrier_red_01.png');
    this.load.image('display_case', '/assets/museum/props/display_case_glass_01.png');
    this.load.image('bulletin', '/assets/random/BulletinBoard.png');
    this.load.image('couch', '/assets/random/Couch1.png');
    this.load.image('rug', '/assets/random/Rug1.png');

    // ---- Wall paintings (decorative, not interactive) ----
    for (let i = 1; i <= 10; i++) {
      const pad = i.toString().padStart(2, '0');
      this.load.image(`painting_classic_${i}`, `/assets/museum/props/painting_classic_${pad}.png`);
      this.load.image(`painting_modern_${i}`, `/assets/museum/props/painting_modern_${pad}.png`);
    }

    // ---- Portal sprites ----
    this.load.image('door_open', '/assets/random/DoorOpened.png');
    this.load.image('door_closed', '/assets/random/DoorClosed.png');
    this.load.image('stairs', '/assets/random/Stairs1.png');

    // ---- Wizard NPC ----
    this.load.image('wizard_idle_1', '/assets/npc/wizard_idle/down_1.png');
    this.load.image('wizard_idle_2', '/assets/npc/wizard_idle/down_2.png');
    for (let i = 1; i <= 7; i++) {
      this.load.image(`wizard_spell_${i}`, `/assets/npc/wizard_spellcast/down_${i}.png`);
    }

    // ---- Player walk frames ----
    const directions = ['down', 'up', 'left', 'right'];
    for (const dir of directions) {
      for (let i = 1; i <= 9; i++) {
        this.load.image(`walk_${dir}_${i}`, `/assets/player/walk_${dir}_${i}.png`);
      }
    }

    // ---- Legacy tiles (fallback) ----
    this.load.image('floor', '/assets/tiles/floor.png');
    this.load.image('wall', '/assets/tiles/wall.png');
  }

  create(): void {
    this.scene.start('HubScene2D');
  }
}
