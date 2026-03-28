export function LoadingScreen() {
  return (
    <div className="flex items-center justify-center w-full h-screen bg-gray-950">
      <div className="text-center">
        <div className="text-2xl font-mono text-purple-400 animate-pulse">
          Loading...
        </div>
      </div>
    </div>
  );
}
