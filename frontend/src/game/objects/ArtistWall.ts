import Phaser from 'phaser';

export class ArtistWall {
  private scene: Phaser.Scene;
  private bioText: Phaser.GameObjects.Text;
  private labelText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, description: string) {
    this.scene = scene;

    // "About the Artist" label
    this.labelText = scene.add.text(x, y - 60, 'About the Artist', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#d4af37',
      fontStyle: 'bold',
    });
    this.labelText.setOrigin(0.5, 0.5);
    this.labelText.setDepth(2);

    // Bio text
    this.bioText = scene.add.text(x, y, description || 'No bio yet...', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#cccccc',
      align: 'center',
      wordWrap: { width: 160 },
      lineSpacing: 4,
    });
    this.bioText.setOrigin(0.5, 0);
    this.bioText.setDepth(2);
  }

  setText(newBio: string): void {
    this.bioText.setText(newBio || 'No bio yet...');
  }
}
