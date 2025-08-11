import React, { useEffect, useState } from "react";
import { promptPWAInstall } from "../pwa";

export default function InstallBanner() {
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const onAvailable = () => setCanInstall(true);
    window.addEventListener("pwa-install-available", onAvailable);
    return () => window.removeEventListener("pwa-install-available", onAvailable);
  }, []);

  if (!canInstall) return null;

  return (
    <div className="fixed bottom-4 left-0 right-0 mx-auto max-w-md px-4 z-50">
      <div className="rounded-xl bg-indigo-600 text-white p-3 shadow flex items-center justify-between">
        <span className="text-sm">Install Transaction Manager?</span>
        <button
          className="ml-3 rounded-md bg-white/20 px-3 py-1 text-sm hover:bg-white/30"
          onClick={async () => {
            const outcome = await promptPWAInstall();
            // hide after user decides
            setCanInstall(false);
            // Optional: you can log outcome === 'accepted' | 'dismissed'
          }}
        >
          Install
        </button>
      </div>
    </div>
  );
}
