export interface User {
  id: number;
  username: string;
  room_id: number;
  created_at: string;
}

export interface Room {
  id: number;
  owner_username: string;
  artist_description: string;
  artworks: Artwork[];
}

export interface Artwork {
  id: number;
  room_id: number;
  title: string;
  description: string;
  image_url: string;
  pixel_image_url: string;
  position_index: number;
  created_at: string;
}

export interface ChatResponse {
  response: string;
  suggestions: ChatSuggestion[];
}

export interface ChatSuggestion {
  username: string;
  reason: string;
}
