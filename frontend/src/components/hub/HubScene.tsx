"use client";

import { useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Text, Box, Plane } from "@react-three/drei";
import * as THREE from "three";
import { useRouter } from "next/navigation";
import { getRandomRoom } from "@/lib/api";

// --- Player Controller (invisible, camera-attached) ---
function PlayerController() {
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const SPEED = 5;
  const BOUNDS = 8; // half-width of the room

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true; };
    const onUp   = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  useFrame((_, delta) => {
    const dir = new THREE.Vector3();
    if (keys.current["w"] || keys.current["arrowup"])    dir.z -= 1;
    if (keys.current["s"] || keys.current["arrowdown"])  dir.z += 1;
    if (keys.current["a"] || keys.current["arrowleft"])  dir.x -= 1;
    if (keys.current["d"] || keys.current["arrowright"]) dir.x += 1;
    dir.normalize().multiplyScalar(SPEED * delta);

    const next = camera.position.clone().add(dir);
    next.x = Math.max(-BOUNDS, Math.min(BOUNDS, next.x));
    next.z = Math.max(-BOUNDS, Math.min(BOUNDS, next.z));
    camera.position.copy(next);
  });

  return null;
}

// --- Floor ---
function HubFloor() {
  return (
    <Plane
      args={[20, 20]}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      receiveShadow
    >
      <meshStandardMaterial color="#1a1a2e" />
    </Plane>
  );
}

// --- Walls ---
function HubWalls() {
  const wallColor = "#16213e";
  return (
    <>
      {/* Back */}
      <Box args={[20, 6, 0.3]} position={[0, 3, -10]}>
        <meshStandardMaterial color={wallColor} />
      </Box>
      {/* Front */}
      <Box args={[20, 6, 0.3]} position={[0, 3, 10]}>
        <meshStandardMaterial color={wallColor} />
      </Box>
      {/* Left */}
      <Box args={[0.3, 6, 20]} position={[-10, 3, 0]}>
        <meshStandardMaterial color={wallColor} />
      </Box>
      {/* Right */}
      <Box args={[0.3, 6, 20]} position={[10, 3, 0]}>
        <meshStandardMaterial color={wallColor} />
      </Box>
    </>
  );
}

// --- Clickable Portal ---
interface PortalProps {
  position: [number, number, number];
  label: string;
  color: string;
  onClick: () => void;
}

function Portal({ position, label, color, onClick }: PortalProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <group position={position} onClick={onClick}>
      <Box
        args={[1.8, 2.8, 0.2]}
        onPointerEnter={() => { document.body.style.cursor = "pointer"; setHovered(true); }}
        onPointerLeave={() => { document.body.style.cursor = "default"; setHovered(false); }}
      >
        <meshStandardMaterial
          color={hovered ? "#ffffff" : color}
          emissive={color}
          emissiveIntensity={hovered ? 0.8 : 0.3}
        />
      </Box>
      <Text
        position={[0, -1.8, 0.2]}
        fontSize={0.28}
        color="white"
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        {label}
      </Text>
    </group>
  );
}

// --- Guide NPC ---
interface GuideNPCProps {
  onTalk: () => void;
}

function GuideNPC({ onTalk }: GuideNPCProps) {
  const [hovered, setHovered] = useState(false);
  const bodyRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (bodyRef.current) {
      bodyRef.current.position.y = 1.2 + Math.sin(clock.elapsedTime * 2) * 0.05;
    }
  });

  return (
    <group position={[0, 0, -6]} onClick={onTalk}>
      {/* Body */}
      <Box
        ref={bodyRef}
        args={[0.6, 1.0, 0.3]}
        position={[0, 1.2, 0]}
        onPointerEnter={() => { document.body.style.cursor = "pointer"; setHovered(true); }}
        onPointerLeave={() => { document.body.style.cursor = "default"; setHovered(false); }}
      >
        <meshStandardMaterial
          color={hovered ? "#ffe066" : "#f4a261"}
          emissive="#f4a261"
          emissiveIntensity={hovered ? 0.5 : 0.1}
        />
      </Box>
      {/* Head */}
      <Box args={[0.45, 0.45, 0.3]} position={[0, 2.0, 0]}>
        <meshStandardMaterial color="#f4a261" />
      </Box>
      {/* Label */}
      <Text
        position={[0, 2.7, 0]}
        fontSize={0.22}
        color="#ffe066"
        anchorX="center"
        anchorY="middle"
      >
        Guide NPC
      </Text>
      <Text
        position={[0, 2.42, 0]}
        fontSize={0.16}
        color="#aaaaaa"
        anchorX="center"
        anchorY="middle"
      >
        [click to talk]
      </Text>
    </group>
  );
}

// --- Main Scene ---
interface HubSceneProps {
  username: string;
  onOpenChat: () => void;
}

function Scene({ username, onOpenChat }: HubSceneProps) {
  const router = useRouter();

  async function goToRandomRoom() {
    try {
      const { username: rndUser } = await getRandomRoom();
      router.push(`/room/${rndUser}`);
    } catch {
      // No rooms yet -- go to own room as fallback
      router.push(`/room/${username}`);
    }
  }

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[0, 4, 0]} intensity={1.5} castShadow />

      <PlayerController />
      <HubFloor />
      <HubWalls />

      {/* My Room portal -- left wall */}
      <Portal
        position={[-7, 1.6, -3]}
        label={`My Room`}
        color="#7c3aed"
        onClick={() => router.push(`/room/${username}`)}
      />

      {/* Random Room portal -- right wall */}
      <Portal
        position={[7, 1.6, -3]}
        label="Random Room"
        color="#0ea5e9"
        onClick={goToRandomRoom}
      />

      {/* Guide NPC -- back wall center */}
      <GuideNPC onTalk={onOpenChat} />
    </>
  );
}

export default function HubScene({ username, onOpenChat }: HubSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 1.6, 6], fov: 75 }}
      style={{ width: "100%", height: "100vh", background: "#0f0f1a" }}
      shadows
    >
      <Scene username={username} onOpenChat={onOpenChat} />
    </Canvas>
  );
}
