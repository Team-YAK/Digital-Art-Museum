import Phaser from 'phaser';
import { HubBoot } from './scenes/HubBoot';
import { HubScene2D } from './scenes/HubScene2D';

/** Stops Phaser from receiving keyboard events while an input/textarea is focused. */
function installInputGuard(): () => void {
  const guard = (e: KeyboardEvent) => {
    const tag = (document.activeElement?.tagName ?? '').toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA') {
      e.stopImmediatePropagation();
    }
  };
  // capture: true runs before Phaser's window listener
  window.addEventListener('keydown', guard, true);
  return () => window.removeEventListener('keydown', guard, true);
}

export function createHubGame(parent: HTMLElement): Phaser.Game {
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
    scene: [HubBoot, HubScene2D],
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  });

  // Clean up the guard when the game is destroyed
  game.events.once(Phaser.Core.Events.DESTROY, removeGuard);

  return game;
}
