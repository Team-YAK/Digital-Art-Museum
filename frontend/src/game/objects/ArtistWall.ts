import Phaser from 'phaser';
import { EventBus } from '../EventBus';

/**
 * ArtistWall — a decorative pixel-art nameplate mounted on the back wall.
 * The plaque shows the artist's username and is interactable:
 * walk close → [ SPACE ] prompt → opens bio modal in React.
 *
 * Visual: drawn on the back wall (wallCenterY ≈ 32)
 * Interaction: detected at interactY (≈ floorY - 40, same height as art frames)
 */
export class ArtistWall {
  private scene: Phaser.Scene;
  private interactX: number;
  private interactY: number;
  private promptText: Phaser.GameObjects.Text | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    wallCenterY: number,   // Y-center of the plaque graphic (on the back wall)
    interactY: number,     // Y used for proximity detection (floor level)
    username: string,
  ) {
    this.scene = scene;
    this.interactX = x;
    this.interactY = interactY;

    // ---- Plaque graphic (drawn at back-wall height) ----
    const pw = 148;
    const ph = 46;
    const px = x - pw / 2;
    const py = wallCenterY - ph / 2;

    const g = scene.add.graphics();

    // Outer shadow
    g.fillStyle(0x000000, 0.5);
    g.fillRect(px + 4, py + 4, pw, ph);

    // Dark background
    g.fillStyle(0x1a0f00, 1);
    g.fillRect(px, py, pw, ph);

    // Gold border (3px)
    g.lineStyle(3, 0xd4af37, 1);
    g.strokeRect(px, py, pw, ph);

    // Inner inset border (1px dim gold)
    g.lineStyle(1, 0x8b6914, 0.8);
    g.strokeRect(px + 5, py + 5, pw - 10, ph - 10);

    // Corner accents (small squares)
    g.fillStyle(0xd4af37, 1);
    g.fillRect(px - 1, py - 1, 6, 6);
    g.fillRect(px + pw - 5, py - 1, 6, 6);
    g.fillRect(px - 1, py + ph - 5, 6, 6);
    g.fillRect(px + pw - 5, py + ph - 5, 6, 6);

    g.setDepth(3);

    // "~ ARTIST ~" label
    scene.add.text(x, wallCenterY - 9, '~ ARTIST ~', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#8b6914',
      letterSpacing: 2,
    }).setOrigin(0.5, 0.5).setDepth(4);

    // Username (uppercase, gold)
    scene.add.text(x, wallCenterY + 8, username.toUpperCase(), {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#d4af37',
      fontStyle: 'bold',
      shadow: { offsetX: 1, offsetY: 1, color: '#000000', fill: true },
    }).setOrigin(0.5, 0.5).setDepth(4);

    // Small "[ bio ]" hint drawn below plaque
    scene.add.text(x, py + ph + 5, '[ bio ]', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#444',
      letterSpacing: 1,
    }).setOrigin(0.5, 0).setDepth(4);
  }

  getX(): number {
    return this.interactX;
  }

  getY(): number {
    return this.interactY;
  }

  showPrompt(): void {
    if (this.promptText) return;
    this.promptText = this.scene.add.text(
      this.interactX,
      this.interactY - 30,
      '[ SPACE ]',
      {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#d4af37',
        backgroundColor: '#000000cc',
        padding: { x: 8, y: 4 },
      },
    ).setOrigin(0.5, 1).setDepth(10);
  }

  hidePrompt(): void {
    if (this.promptText) {
      this.promptText.destroy();
      this.promptText = null;
    }
  }

  /** Emit interact-bio event so React can open the bio modal. */
  interact(username: string, description: string, isOwner: boolean): void {
    EventBus.emit('interact-bio', { username, description, isOwner });
  }

  setText(newBio: string): void {
    // no-op — bio is shown in the React overlay, not in the Phaser scene
    void newBio;
  }
}
