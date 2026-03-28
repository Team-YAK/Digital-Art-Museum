const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

import type { User, Room, Artwork, ChatResponse } from "@/types/api";

// Users
export async function createUser(username: string): Promise<User> {
  return request<User>("/api/users", {
    method: "POST",
    body: JSON.stringify({ username }),
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
  const res = await fetch(
    `${API_URL}/api/rooms/${encodeURIComponent(username)}/artworks`,
    {
      method: "POST",
      headers: { "X-Username": username },
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
  await fetch(
    `${API_URL}/api/rooms/${encodeURIComponent(username)}/artworks/${positionIndex}`,
    {
      method: "DELETE",
      headers: { "X-Username": username },
    }
  );
}

// Chat
export async function chatWithGuide(query: string): Promise<ChatResponse> {
  return request<ChatResponse>("/api/chat/guide", {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}
