import Phaser from 'phaser';
import { HubBoot } from './scenes/HubBoot';
import { HubScene2D } from './scenes/HubScene2D';
import type { FeaturedArtwork } from '@/types/api';

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

export function createHubGame(
  parent: HTMLElement,
  hubArtworks: FeaturedArtwork[] = [],
): Phaser.Game {
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

  // Store artwork data in the Phaser registry so scenes can access it
  game.registry.set('hubArtworks', hubArtworks);

  game.events.once(Phaser.Core.Events.DESTROY, removeGuard);

  return game;
}
