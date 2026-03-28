import Phaser from 'phaser';
import { RoomPlayer } from '../entities/RoomPlayer';
import { ArtSlot } from '../objects/ArtSlot';
import { ArtistWall } from '../objects/ArtistWall';
import { EventBus } from '../EventBus';
import type { Room, Artwork } from '@/types/api';
import type { ArtInteractPayload, EmptySlotPayload, ArtworkUploadedPayload } from '@/types/game';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const ROOM_WIDTH = 5800;
const ROOM_HEIGHT = 1900;
const SLOT_COUNT = 25;
const COLS = 25;
const SLOT_SPACING_X = 220;
const SLOT_SPACING_Y = 320;
const START_X = (ROOM_WIDTH - (COLS - 1) * SLOT_SPACING_X) / 2;
const START_Y = 400;
const WALL_H = 64;

export class RoomScene extends Phaser.Scene {
  private player!: RoomPlayer;
  private artSlots: ArtSlot[] = [];
  private artistWall!: ArtistWall;
  private roomData!: Room;
  private isOwner!: boolean;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private nearestSlotIndex: number = -1;
  private nearBio: boolean = false;
  private modalOpen: boolean = false;
  private obstacleGroup!: Phaser.Physics.Arcade.StaticGroup;

  constructor() {
    super({ key: 'RoomScene' });
  }

  create(): void {
    this.roomData = this.registry.get('roomData') as Room;
    this.isOwner = this.registry.get('isOwner') as boolean;

    const screenHeight = this.scale.height;
    const floorY = 400;

    // Restrict player movement to only walk reasonably near the paintings!
    const walkBoundBottom = 850;
    this.physics.world.setBounds(0, floorY - 30, ROOM_WIDTH, walkBoundBottom - floorY + 30);

    this.obstacleGroup = this.physics.add.staticGroup();

    // Map boundaries (invisible walls)
    this.obstacleGroup.create(-10, ROOM_HEIGHT / 2, 'wall').setDisplaySize(20, ROOM_HEIGHT).refreshBody().setVisible(false);
    this.obstacleGroup.create(ROOM_WIDTH + 10, ROOM_HEIGHT / 2, 'wall').setDisplaySize(20, ROOM_HEIGHT).refreshBody().setVisible(false);
    this.obstacleGroup.create(ROOM_WIDTH / 2, ROOM_HEIGHT + 10, 'wall').setDisplaySize(ROOM_WIDTH, 20).refreshBody().setVisible(false);

    // ---- Background & tiles ----
    this.renderTiles(floorY, screenHeight);

    // ---- Artist wall plaque (far left, on back wall) ----
    // wallCenterY: center of the 64-px back wall tile
    // interactY: player-level proximity trigger (same height as art frames)
    this.artistWall = new ArtistWall(
      this,
      80,                        // x
      WALL_H / 2,                // wallCenterY (≈ 32px — centre of top wall row)
      floorY - 40,               // interactY — matches art frame height
      this.roomData.owner_username,
    );

    // ---- Art slots ----
    const artworkByPosition = new Map<number, Artwork>();
    for (const art of this.roomData.artworks) {
      artworkByPosition.set(art.position_index, art);
    }

    for (let i = 0; i < SLOT_COUNT; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const slotX = START_X + col * SLOT_SPACING_X;
      const slotY = START_Y + row * SLOT_SPACING_Y;

      const artwork = artworkByPosition.get(i) || null;
      const slot = new ArtSlot(this, slotX, slotY, i, artwork, this.isOwner);
      this.artSlots.push(slot);
    }

    // ---- Decorations between art slots ----
    this.renderDecorations(floorY);

    // ---- Exit portal at far-left ----
    if (this.textures.exists('door_open')) {
      this.add.image(40, floorY - 40, 'door_open').setScale(2).setDepth(3);
    }

    // ---- Player (spawns near the left side, near entrance and bio) ----
    this.player = new RoomPlayer(this, 160, floorY + 80, true);
    this.physics.add.collider(this.player.sprite, this.obstacleGroup);

    // ---- Camera: follow in both X and Y ----
    this.cameras.main.setBounds(0, 0, ROOM_WIDTH, ROOM_HEIGHT);
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);

    // ---- Input ----
    if (this.input.keyboard) {
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    // ---- EventBus listeners ----
    EventBus.on('artwork-uploaded', (payload: any) => this.onArtworkUploaded(payload));
    EventBus.on('artwork-deleted', (payload: any) => this.onArtworkDeleted(payload));
    EventBus.on('bio-updated', (payload: any) => this.onBioUpdated(payload));
    EventBus.on('modal-opened', () => {
      this.modalOpen = true;
      if (this.input.keyboard) this.input.keyboard.enabled = false;
      if (this.player?.sprite?.body) {
        (this.player.sprite.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      }
    });
    EventBus.on('modal-closed', () => {
      this.modalOpen = false;
      if (this.input.keyboard) {
        this.input.keyboard.enabled = true;
        this.input.keyboard.resetKeys();
      }
    });

    EventBus.emit('scene-ready');
  }

  private renderTiles(floorY: number, screenHeight: number): void {
    // ---- Dark background ----
    this.add.rectangle(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, ROOM_WIDTH, ROOM_HEIGHT, 0x0d0d1a).setOrigin(0.5, 0.5).setDepth(-1);

    // ---- Back wall ----
    const wallKey = this.textures.exists('wall_charcoal') ? 'wall_charcoal' : 'wall_gallery';
    const wallTex = this.textures.get(wallKey).getSourceImage();
    const wallTileW = wallTex ? wallTex.width || 64 : 64;
    const wallTileH = wallTex ? wallTex.height || 64 : 64;
    for (let x = 0; x < ROOM_WIDTH; x += wallTileW) {
      for (let y = 0; y < floorY; y += wallTileH) {
        this.add.image(x, y, wallKey).setOrigin(0, 0).setDepth(0);
      }
    }

    // ---- Floor tiles ----
    const floorKey2 = 'floor_wood';
    for (let x = 0; x < ROOM_WIDTH; x += 128) {
      for (let y = floorY; y < ROOM_HEIGHT; y += 128) {
        this.add.image(x, y, floorKey2).setOrigin(0, 0).setDepth(0).setScale(2);
      }
    }

    // ---- Sconces between art slots along the back wall ----
    if (this.textures.exists('sconce1')) {
      for (let i = 0; i < SLOT_COUNT - 1; i++) {
        const sx = START_X + (i % COLS) * SLOT_SPACING_X + SLOT_SPACING_X / 2;
        const sconceKey = `sconce${(i % 3) + 1}`;
        this.add.image(sx, 4, sconceKey).setOrigin(0.5, 0).setDepth(2).setScale(1.3);
      }
    }
  }

  private renderDecorations(floorY: number): void {
    // ---- Plants scattered (temporarily removed per instructions) ----
    // if (this.textures.exists('plant1')) {
    //   for (let i = 0; i < SLOT_COUNT; i += 3) {
    //     const col = i % COLS;
    //     const row = Math.floor(i / COLS);
    //     const px = START_X + col * SLOT_SPACING_X + SLOT_SPACING_X / 2;
    //     const py = START_Y + row * SLOT_SPACING_Y - 40;
    //     const plantKey = `plant${(i % 2) + 1}`;
    //     this.add.image(px, py, plantKey).setOrigin(0.5, 1).setDepth(py / 1000).setScale(1.8);
    //   }
    // }

    // ---- Benches every few slots ----
    if (this.textures.exists('bench_wood')) {
      for (let i = 1; i < SLOT_COUNT; i += 4) {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const bx = START_X + col * SLOT_SPACING_X;
        const by = START_Y + row * SLOT_SPACING_Y + 60;
        this.add.image(bx, by, 'bench_wood').setOrigin(0.5, 0).setDepth(by / 1000).setScale(1.6);
      }
    }

    // ---- Pedestals at certain spots ----
    if (this.textures.exists('pedestal1')) {
      for (let i = 2; i < SLOT_COUNT; i += 5) {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const pedX = START_X + col * SLOT_SPACING_X + SLOT_SPACING_X / 2;
        const pedY = START_Y + row * SLOT_SPACING_Y - 10;
        this.add.image(pedX, pedY, 'pedestal1').setOrigin(0.5, 1).setDepth(pedY / 1000).setScale(1.5);
      }
    }

    // ---- Chandeliers hanging from ceiling ----
    if (this.textures.exists('chandelier1')) {
      for (let i = 0; i < SLOT_COUNT; i += 2) {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const cx = START_X + col * SLOT_SPACING_X;
        const chandKey = i % 4 === 0 ? 'chandelier1' : 'chandelier2';
        this.add.image(cx, 2, chandKey).setOrigin(0.5, 0).setDepth(9).setScale(1.5);
      }
    }
  }

  update(): void {
    if (this.modalOpen) return;

    this.player.update();

    const px = this.player.sprite.x;
    const py = this.player.sprite.y;

    // ---- Art slot proximity (2D distance) ----
    let closestIdx = -1;
    let closestDist = Infinity;

    for (let i = 0; i < this.artSlots.length; i++) {
      const slot = this.artSlots[i];
      const dx = px - slot.getX();
      const dy = py - slot.getY();
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 130 && dist < closestDist && slot.hasContent()) {
        closestDist = dist;
        closestIdx = i;
      }
    }

    // Update art slot proximity effects
    if (closestIdx !== this.nearestSlotIndex) {
      if (this.nearestSlotIndex >= 0 && this.nearestSlotIndex < this.artSlots.length) {
        this.artSlots[this.nearestSlotIndex].hideProximityEffects();
      }
      this.nearestSlotIndex = closestIdx;
      if (closestIdx >= 0) {
        this.artSlots[closestIdx].showProximityEffects();
      }
    }

    // ---- Bio plaque proximity ----
    const bdx = px - this.artistWall.getX();
    const bdy = py - this.artistWall.getY();
    const bioDist = Math.sqrt(bdx * bdx + bdy * bdy);
    const nowNearBio = bioDist < 110;

    if (nowNearBio !== this.nearBio) {
      this.nearBio = nowNearBio;
      if (nowNearBio) {
        this.artistWall.showPrompt();
      } else {
        this.artistWall.hidePrompt();
      }
    }

    // ---- Decor layout (statues and benches) ----
    const floorY = 400;
    for (let i = 2; i < SLOT_COUNT; i += 3) {
      const slotX = START_X + i * SLOT_SPACING_X;
      // Put a bench or statue in front of the art without blocking path
      if (i % 2 === 0) {
        this.add.image(slotX, floorY + 160, 'bench_wood').setOrigin(0.5, 1).setScale(1.5).setDepth(2);
      } else {
        const ped = this.add.image(slotX, floorY + 130, 'pedestal1').setOrigin(0.5, 1).setDepth(1);
        this.add.image(slotX, floorY + 130 - ped.height / 2, 'statue_bust').setOrigin(0.5, 1).setDepth(2);
      }
    }

    // ---- Space to interact ----
    if (this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      if (this.nearBio) {
        // Bio plaque takes priority when the player is standing near it
        this.artistWall.interact(
          this.roomData.owner_username,
          this.roomData.artist_description,
          this.isOwner,
        );
      } else if (closestIdx >= 0) {
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
    EventBus.removeAllListeners('artwork-uploaded');
    EventBus.removeAllListeners('artwork-deleted');
    EventBus.removeAllListeners('bio-updated');
    EventBus.removeAllListeners('modal-opened');
    EventBus.removeAllListeners('modal-closed');
  }
}
