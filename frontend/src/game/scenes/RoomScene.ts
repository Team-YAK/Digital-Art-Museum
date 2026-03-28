import Phaser from 'phaser';
import { RoomPlayer } from '../entities/RoomPlayer';
import { ArtSlot } from '../objects/ArtSlot';
import { ArtistWall } from '../objects/ArtistWall';
import { EventBus } from '../EventBus';
import type { Room, Artwork } from '@/types/api';
import type { ArtInteractPayload, EmptySlotPayload, ArtworkUploadedPayload } from '@/types/game';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const ROOM_WIDTH = 3000;
const SLOT_START_X = 350;
const SLOT_SPACING = 280;
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
    const WALL_H = 64;

    // Set world bounds
    this.physics.world.setBounds(0, 0, ROOM_WIDTH, screenHeight);

    // ---- Background & tiles ----
    this.renderTiles(floorY, screenHeight, WALL_H);

    // ---- Artist wall (far left) ----
    this.artistWall = new ArtistWall(
      this,
      130,
      floorY - 160,
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

    // ---- Decorations between art slots ----
    this.renderDecorations(floorY);

    // ---- Exit portal at far-left ----
    if (this.textures.exists('door_open')) {
      this.add.image(40, floorY - 40, 'door_open').setScale(2).setDepth(3);
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
      (this.player.sprite.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    });
    EventBus.on('modal-closed', () => {
      this.modalOpen = false;
      if (this.input.keyboard) this.input.keyboard.enabled = true;
    });

    EventBus.emit('scene-ready');
  }

  private renderTiles(floorY: number, screenHeight: number, wallH: number): void {
    // ---- Dark background behind walls ----
    this.add.rectangle(ROOM_WIDTH / 2, 0, ROOM_WIDTH, screenHeight, 0x0d0d1a).setOrigin(0.5, 0).setDepth(-1);

    // ---- Back wall: gallery wall tiles ----
    const wallKey = this.textures.exists('wall_gallery') ? 'wall_gallery' : 'wall';
    for (let x = 0; x < ROOM_WIDTH; x += 64) {
      this.add.image(x, 0, wallKey).setOrigin(0, 0).setDepth(0);
    }

    // ---- Wainscoting / lower wall above floor ----
    for (let x = 0; x < ROOM_WIDTH; x += 64) {
      this.add.image(x, floorY - wallH, wallKey).setOrigin(0, 0).setDepth(0);
    }

    // ---- Floor tiles: wood floor ----
    const floorKey = this.textures.exists('floor_wood') ? 'floor_wood' : 'floor';
    for (let x = 0; x < ROOM_WIDTH; x += 64) {
      for (let y = floorY; y < screenHeight; y += 64) {
        this.add.image(x, y, floorKey).setOrigin(0, 0).setDepth(0);
      }
    }

    // ---- Sconces between art slots along the wall ----
    if (this.textures.exists('sconce1')) {
      for (let i = 0; i < SLOT_COUNT - 1; i++) {
        const sx = SLOT_START_X + i * SLOT_SPACING + SLOT_SPACING / 2;
        const sconceKey = `sconce${(i % 3) + 1}`;
        this.add.image(sx, 4, sconceKey).setOrigin(0.5, 0).setDepth(2).setScale(1.3);
      }
    }
  }

  private renderDecorations(floorY: number): void {
    // ---- Plants at regular intervals ----
    if (this.textures.exists('plant1')) {
      for (let i = 0; i < SLOT_COUNT; i += 3) {
        const px = SLOT_START_X + i * SLOT_SPACING + SLOT_SPACING / 2;
        const plantKey = `plant${(i % 2) + 1}`;
        this.add.image(px, floorY - 5, plantKey).setOrigin(0.5, 1).setDepth(4).setScale(1.8);
      }
    }

    // ---- Benches every few slots ----
    if (this.textures.exists('bench_wood')) {
      for (let i = 1; i < SLOT_COUNT; i += 4) {
        const bx = SLOT_START_X + i * SLOT_SPACING;
        this.add.image(bx, floorY + 20, 'bench_wood').setOrigin(0.5, 0).setDepth(3).setScale(1.6);
      }
    }

    // ---- Pedestals at certain spots ----
    if (this.textures.exists('pedestal1')) {
      for (let i = 2; i < SLOT_COUNT; i += 5) {
        const pedX = SLOT_START_X + i * SLOT_SPACING + SLOT_SPACING / 2;
        this.add.image(pedX, floorY - 10, 'pedestal1').setOrigin(0.5, 1).setDepth(3).setScale(1.5);
      }
    }

    // ---- Rope barriers along the bottom edge ----
    if (this.textures.exists('rope_barrier')) {
      for (let x = 100; x < ROOM_WIDTH - 100; x += 400) {
        this.add.image(x, floorY + 55, 'rope_barrier').setOrigin(0.5, 0.5).setDepth(2).setScale(1.3);
      }
    }

    // ---- Chandeliers hanging from ceiling ----
    if (this.textures.exists('chandelier1')) {
      for (let i = 0; i < SLOT_COUNT; i += 2) {
        const cx = SLOT_START_X + i * SLOT_SPACING;
        const chandKey = i % 4 === 0 ? 'chandelier1' : 'chandelier2';
        this.add.image(cx, 2, chandKey).setOrigin(0.5, 0).setDepth(9).setScale(1.5);
      }
    }
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
        const payload: ArtInteractPayload = {
          artworkId: artwork.id,
          title: artwork.title,
          description: artwork.description,
          imageUrl: `${API_URL}${artwork.image_url}`,
          pixelImageUrl: `${API_URL}${artwork.pixel_image_url}`,
        };
        EventBus.emit('interact-art', payload);
      } else if (this.isOwner) {
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
