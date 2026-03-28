import Phaser from 'phaser';
import { RoomPlayer } from '../entities/RoomPlayer';
import { ArtSlot } from '../objects/ArtSlot';
import { ArtistWall } from '../objects/ArtistWall';
import { EventBus } from '../EventBus';
import type { Room, Artwork } from '@/types/api';
import type { ArtInteractPayload, EmptySlotPayload, ArtworkUploadedPayload } from '@/types/game';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const ROOM_WIDTH = 3000;
const SLOT_START_X = 300;
const SLOT_SPACING = 300;
const SLOT_COUNT = 10;

export class RoomScene extends Phaser.Scene {
  private player!: RoomPlayer;
  private artSlots: ArtSlot[] = [];
  private artistWall!: ArtistWall;
  private roomData!: Room;
  private isOwner!: boolean;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private nearestSlotIndex: number = -1;
  private modalOpen: boolean = false;

  constructor() {
    super({ key: 'RoomScene' });
  }

  create(): void {
    this.roomData = this.registry.get('roomData') as Room;
    this.isOwner = this.registry.get('isOwner') as boolean;

    const screenHeight = this.scale.height;
    const floorY = screenHeight * 0.75;

    // Set world bounds
    this.physics.world.setBounds(0, 0, ROOM_WIDTH, screenHeight);

    // ---- Background & tiles ----
    this.renderTiles(floorY, screenHeight);

    // ---- Artist wall (far left) ----
    this.artistWall = new ArtistWall(
      this,
      100,
      floorY - 180,
      this.roomData.artist_description
    );

    // ---- Art slots ----
    const artworkByPosition = new Map<number, Artwork>();
    for (const art of this.roomData.artworks) {
      artworkByPosition.set(art.position_index, art);
    }

    for (let i = 0; i < SLOT_COUNT; i++) {
      const slotX = SLOT_START_X + i * SLOT_SPACING;
      const artwork = artworkByPosition.get(i) || null;
      const slot = new ArtSlot(this, slotX, floorY - 40, i, artwork, this.isOwner);
      this.artSlots.push(slot);
    }

    // ---- Player ----
    this.player = new RoomPlayer(this, 200, floorY - 30);

    // ---- Camera ----
    this.cameras.main.setBounds(0, 0, ROOM_WIDTH, screenHeight);
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0);

    // ---- Input ----
    if (this.input.keyboard) {
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    // ---- EventBus listeners ----
    EventBus.on('artwork-uploaded', this.onArtworkUploaded, this);
    EventBus.on('artwork-deleted', this.onArtworkDeleted, this);
    EventBus.on('bio-updated', this.onBioUpdated, this);
    EventBus.on('modal-opened', () => {
      this.modalOpen = true;
      if (this.input.keyboard) this.input.keyboard.enabled = false;
    });
    EventBus.on('modal-closed', () => {
      this.modalOpen = false;
      if (this.input.keyboard) this.input.keyboard.enabled = true;
    });

    // Emit scene-ready so React knows the game is interactive
    EventBus.emit('scene-ready');
  }

  private renderTiles(floorY: number, screenHeight: number): void {
    // Dark wall background
    this.add.rectangle(ROOM_WIDTH / 2, 0, ROOM_WIDTH, screenHeight, 0x0d0d1a).setOrigin(0.5, 0);

    // Wall tiles along the top
    const wallTex = this.textures.get('wall');
    const wallW = wallTex.getSourceImage().width;
    const wallH = wallTex.getSourceImage().height;
    for (let x = 0; x < ROOM_WIDTH; x += wallW) {
      // Top wall row
      const topWall = this.add.image(x, 0, 'wall').setOrigin(0, 0).setDepth(0);
      topWall.setScale(1);
      // Wall row above floor
      this.add.image(x, floorY - wallH, 'wall').setOrigin(0, 0).setDepth(0);
    }

    // Floor tiles
    const floorTex = this.textures.get('floor');
    const floorW = floorTex.getSourceImage().width;
    const floorH = floorTex.getSourceImage().height;
    for (let x = 0; x < ROOM_WIDTH; x += floorW) {
      for (let y = floorY; y < screenHeight; y += floorH) {
        this.add.image(x, y, 'floor').setOrigin(0, 0).setDepth(0);
      }
    }

    // Stairs decoration at far-right
    this.add.image(ROOM_WIDTH - 60, floorY - 20, 'stairs').setOrigin(0.5, 1).setDepth(1);
  }

  update(): void {
    if (this.modalOpen) return;

    this.player.update();

    // Check proximity to art slots
    const playerX = this.player.getX();
    let closestIdx = -1;
    let closestDist = Infinity;

    for (let i = 0; i < this.artSlots.length; i++) {
      const slot = this.artSlots[i];
      const dist = Math.abs(playerX - slot.getX());
      if (dist < 120 && dist < closestDist && slot.hasContent()) {
        closestDist = dist;
        closestIdx = i;
      }
    }

    // Update proximity effects
    if (closestIdx !== this.nearestSlotIndex) {
      if (this.nearestSlotIndex >= 0 && this.nearestSlotIndex < this.artSlots.length) {
        this.artSlots[this.nearestSlotIndex].hideProximityEffects();
      }
      this.nearestSlotIndex = closestIdx;
      if (closestIdx >= 0) {
        this.artSlots[closestIdx].showProximityEffects();
      }
    }

    // Space to interact
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && closestIdx >= 0) {
      const slot = this.artSlots[closestIdx];
      const artwork = slot.getArtwork();

      if (artwork) {
        // Interact with existing artwork
        const payload: ArtInteractPayload = {
          artworkId: artwork.id,
          title: artwork.title,
          description: artwork.description,
          imageUrl: `${API_URL}${artwork.image_url}`,
          pixelImageUrl: `${API_URL}${artwork.pixel_image_url}`,
        };
        EventBus.emit('interact-art', payload);
      } else if (this.isOwner) {
        // Interact with empty slot (owner only)
        const payload: EmptySlotPayload = {
          positionIndex: slot.getPositionIndex(),
          roomOwner: this.roomData.owner_username,
        };
        EventBus.emit('interact-empty-slot', payload);
      }
    }
  }

  private onArtworkUploaded(payload: ArtworkUploadedPayload): void {
    const slot = this.artSlots[payload.positionIndex];
    if (slot) {
      slot.fill({
        id: payload.id,
        room_id: this.roomData.id,
        title: payload.title,
        description: '',
        image_url: payload.pixelImageUrl.replace(API_URL, ''),
        pixel_image_url: payload.pixelImageUrl.replace(API_URL, ''),
        position_index: payload.positionIndex,
        created_at: new Date().toISOString(),
      });
    }
  }

  private onArtworkDeleted(payload: { positionIndex: number }): void {
    const slot = this.artSlots[payload.positionIndex];
    if (slot) {
      slot.clear();
    }
  }

  private onBioUpdated(payload: { bio: string }): void {
    this.artistWall.setText(payload.bio);
  }

  shutdown(): void {
    EventBus.off('artwork-uploaded', this.onArtworkUploaded, this);
    EventBus.off('artwork-deleted', this.onArtworkDeleted, this);
    EventBus.off('bio-updated', this.onBioUpdated, this);
    EventBus.removeAllListeners('modal-opened');
    EventBus.removeAllListeners('modal-closed');
  }
}
