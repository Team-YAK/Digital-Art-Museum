export interface ArtInteractPayload {
  artworkId: number;
  title: string;
  description: string;
  imageUrl: string;
  pixelImageUrl: string;
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
