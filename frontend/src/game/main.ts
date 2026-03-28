import Phaser from 'phaser';
import { RoomBoot } from './scenes/RoomBoot';
import { RoomScene } from './scenes/RoomScene';
import type { Room } from '@/types/api';

export function createGame(parent: HTMLElement, roomData: Room, isOwner: boolean): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#1a1a2e',
    pixelArt: true,
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    scene: [RoomBoot, RoomScene],
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  });

  game.registry.set('roomData', roomData);
  game.registry.set('isOwner', isOwner);

  return game;
}
