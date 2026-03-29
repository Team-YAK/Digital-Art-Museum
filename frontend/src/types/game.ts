export interface ArtInteractPayload {
  artworkId: number;
  title: string;
  description: string;
  imageUrl: string;
  pixelImageUrl: string;
  positionIndex: number;
}

export interface EmptySlotPayload {
  positionIndex: number;
  roomOwner: string;
}

export interface ArtworkUploadedPayload {
  id: number;
  positionIndex: number;
  pixelImageUrl: string;
  title: string;
}

export interface BioInteractPayload {
  username: string;
  description: string;
  isOwner: boolean;
}
