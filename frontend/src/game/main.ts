import Phaser from 'phaser';
import { RoomBoot } from './scenes/RoomBoot';
import { RoomScene } from './scenes/RoomScene';
import type { Room } from '@/types/api';

/** Stops Phaser from receiving keyboard events while an input/textarea is focused. */
function installInputGuard(): () => void {
  const guard = (e: KeyboardEvent) => {
    const tag = (document.activeElement?.tagName ?? '').toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA') {
      e.stopImmediatePropagation();
    }
  };
  window.addEventListener('keydown', guard, true);
  return () => window.removeEventListener('keydown', guard, true);
}

export function createGame(parent: HTMLElement, roomData: Room, isOwner: boolean): Phaser.Game {
  const w = parent.clientWidth || window.innerWidth;
  const h = parent.clientHeight || window.innerHeight;

  const removeGuard = installInputGuard();

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: w,
    height: h,
    backgroundColor: '#0d0b08',
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
  game.events.once(Phaser.Core.Events.DESTROY, removeGuard);

  return game;
}
