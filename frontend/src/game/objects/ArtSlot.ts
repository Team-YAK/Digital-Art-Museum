import Phaser from 'phaser';
import type { Artwork } from '@/types/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class ArtSlot {
  private scene: Phaser.Scene;
  private x: number;
  private y: number;
  private positionIndex: number;
  private artwork: Artwork | null;
  private isOwner: boolean;

  private artSprite: Phaser.GameObjects.Image | null = null;
  private titleText: Phaser.GameObjects.Text | null = null;
  private plusText: Phaser.GameObjects.Text | null = null;
  private frameBorder: Phaser.GameObjects.Rectangle | null = null;
  private interactionZone: Phaser.GameObjects.Zone | null = null;
  private glowTween: Phaser.Tweens.Tween | null = null;
  private promptText: Phaser.GameObjects.Text | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    positionIndex: number,
    artwork: Artwork | null,
    isOwner: boolean
  ) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.positionIndex = positionIndex;
    this.artwork = artwork;
    this.isOwner = isOwner;

    if (artwork) {
      this.renderArtwork(artwork);
    } else if (isOwner) {
      this.renderEmptyOwner();
    }
    // Visitor with no artwork: render nothing
  }

  private renderArtwork(artwork: Artwork): void {
    const imageUrl = `${API_URL}${artwork.pixel_image_url}`;
    const imageKey = `art_${this.positionIndex}_${artwork.id}`;

    // Gold frame border
    this.frameBorder = this.scene.add.rectangle(this.x, this.y - 80, 140, 140, 0x1a1a2e);
    this.frameBorder.setStrokeStyle(3, 0xd4af37);
    this.frameBorder.setDepth(1);

    // Load and display the pixel art image dynamically
    if (this.scene.textures.exists(imageKey)) {
      this.showArtSprite(imageKey);
    } else {
      this.scene.load.image(imageKey, imageUrl);
      this.scene.load.once('complete', () => {
        this.showArtSprite(imageKey);
      });
      this.scene.load.start();
    }

    // Title text below artwork
    this.titleText = this.scene.add.text(this.x, this.y + 10, artwork.title, {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#e0e0e0',
      align: 'center',
      wordWrap: { width: 120 },
    });
    this.titleText.setOrigin(0.5, 0);
    this.titleText.setDepth(2);
  }

  private showArtSprite(key: string): void {
    this.artSprite = this.scene.add.image(this.x, this.y - 80, key);
    this.artSprite.setDisplaySize(120, 120);
    this.artSprite.setDepth(2);
  }

  private renderEmptyOwner(): void {
    // Gold frame border for empty slot
    this.frameBorder = this.scene.add.rectangle(this.x, this.y - 80, 140, 140, 0x1a1a2e);
    this.frameBorder.setStrokeStyle(2, 0x555555);
    this.frameBorder.setDepth(1);

    this.plusText = this.scene.add.text(this.x, this.y - 80, '+', {
      fontFamily: 'monospace',
      fontSize: '48px',
      color: '#666666',
      align: 'center',
    });
    this.plusText.setOrigin(0.5, 0.5);
    this.plusText.setDepth(2);

    // Interaction zone for empty slots
    this.interactionZone = this.scene.add.zone(this.x, this.y - 80, 140, 140);
  }

  /** Show proximity glow and interaction prompt */
  showProximityEffects(): void {
    if (!this.frameBorder) return;

    // Start glow tween if not already running
    if (!this.glowTween || !this.glowTween.isPlaying()) {
      this.glowTween = this.scene.tweens.add({
        targets: this.frameBorder,
        alpha: { from: 0.5, to: 1 },
        duration: 600,
        yoyo: true,
        repeat: -1,
      });
    }

    // Show "Press SPACE" prompt
    if (!this.promptText) {
      this.promptText = this.scene.add.text(this.x, this.y - 170, 'Press SPACE', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#d4af37',
        align: 'center',
        backgroundColor: '#000000aa',
        padding: { x: 6, y: 3 },
      });
      this.promptText.setOrigin(0.5, 0.5);
      this.promptText.setDepth(10);
    }
  }

  /** Hide proximity glow and interaction prompt */
  hideProximityEffects(): void {
    if (this.glowTween) {
      this.glowTween.stop();
      this.glowTween = null;
      if (this.frameBorder) this.frameBorder.setAlpha(1);
    }
    if (this.promptText) {
      this.promptText.destroy();
      this.promptText = null;
    }
  }

  /** Replace "+" with actual artwork after upload */
  fill(artwork: Artwork): void {
    // Clean up empty slot elements
    if (this.plusText) {
      this.plusText.destroy();
      this.plusText = null;
    }
    if (this.interactionZone) {
      this.interactionZone.destroy();
      this.interactionZone = null;
    }
    if (this.frameBorder) {
      this.frameBorder.destroy();
      this.frameBorder = null;
    }

    this.artwork = artwork;
    this.renderArtwork(artwork);
  }

  /** Revert slot to empty (after artwork deletion) */
  clear(): void {
    if (this.artSprite) {
      this.artSprite.destroy();
      this.artSprite = null;
    }
    if (this.titleText) {
      this.titleText.destroy();
      this.titleText = null;
    }
    if (this.frameBorder) {
      this.frameBorder.destroy();
      this.frameBorder = null;
    }
    this.hideProximityEffects();

    this.artwork = null;
    if (this.isOwner) {
      this.renderEmptyOwner();
    }
  }

  getPositionIndex(): number {
    return this.positionIndex;
  }

  getArtwork(): Artwork | null {
    return this.artwork;
  }

  getX(): number {
    return this.x;
  }

  getY(): number {
    return this.y;
  }

  hasContent(): boolean {
    return this.artwork !== null || (this.isOwner && this.plusText !== null);
  }
}
