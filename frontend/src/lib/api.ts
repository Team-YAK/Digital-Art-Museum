const API_URL = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:8000");
const TOKEN_KEY = "museum_token";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

import type {
  User,
  Room,
  Artwork,
  ChatResponse,
  TokenResponse,
  CommentData,
  LikeData,
  FeaturedArtwork,
} from "@/types/api";

// Auth
export async function register(
  username: string,
  password: string
): Promise<TokenResponse> {
  return request<TokenResponse>("/api/users/register", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function login(
  username: string,
  password: string
): Promise<TokenResponse> {
  return request<TokenResponse>("/api/users/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

// Users
export async function createUser(
  username: string,
  password: string
): Promise<User> {
  return request<User>("/api/users", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function getUser(username: string): Promise<User> {
  return request<User>(`/api/users/${encodeURIComponent(username)}`);
}

// Rooms
export async function getRoom(username: string): Promise<Room> {
  return request<Room>(`/api/rooms/${encodeURIComponent(username)}`);
}

export async function getRandomRoom(): Promise<{ username: string }> {
  return request<{ username: string }>("/api/rooms/random");
}

export async function updateRoomDescription(
  username: string,
  artistDescription: string
): Promise<Room> {
  return request<Room>(`/api/rooms/${encodeURIComponent(username)}`, {
    method: "PUT",
    body: JSON.stringify({ artist_description: artistDescription }),
  });
}

// Artworks
export async function uploadArtwork(
  username: string,
  formData: FormData
): Promise<Artwork> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(
    `${API_URL}/api/rooms/${encodeURIComponent(username)}/artworks`,
    {
      method: "POST",
      headers,
      body: formData,
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function deleteArtwork(
  username: string,
  positionIndex: number
): Promise<void> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  await fetch(
    `${API_URL}/api/rooms/${encodeURIComponent(username)}/artworks/${positionIndex}`,
    {
      method: "DELETE",
      headers,
    }
  );
}

// Chat
export async function chatWithGuide(query: string, context?: string, imageUrl?: string): Promise<ChatResponse> {
  return request<ChatResponse>("/api/chat/guide", {
    method: "POST",
    body: JSON.stringify({ query, context, image_url: imageUrl }),
  });
}

// Comments
export async function getComments(artworkId: number): Promise<CommentData[]> {
  return request<CommentData[]>(`/api/artworks/${artworkId}/comments`);
}

export async function addComment(
  artworkId: number,
  text: string,
  parentId?: number
): Promise<CommentData> {
  return request<CommentData>(`/api/artworks/${artworkId}/comments`, {
    method: "POST",
    body: JSON.stringify({ text, parent_id: parentId || null }),
  });
}

// Featured artworks for hub display
export async function getFeaturedArtworks(limit = 27): Promise<FeaturedArtwork[]> {
  const raw = await request<FeaturedArtwork[]>(`/api/rooms/featured?limit=${limit}`);
  // Prefix relative image URLs with the API base
  return raw.map((a) => ({
    ...a,
    pixel_image_url: a.pixel_image_url.startsWith("http")
      ? a.pixel_image_url
      : `${API_URL}${a.pixel_image_url}`,
  }));
}

// Likes
export async function getLikes(artworkId: number): Promise<LikeData> {
  return request<LikeData>(`/api/artworks/${artworkId}/likes`);
}

export async function toggleLike(artworkId: number): Promise<LikeData> {
  return request<LikeData>(`/api/artworks/${artworkId}/likes`, {
    method: "POST",
  });
}
