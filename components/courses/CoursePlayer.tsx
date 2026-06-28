"use client";

/* eslint-disable @typescript-eslint/no-explicit-any -- the YouTube IFrame and
   Vimeo Player SDKs are loaded at runtime and have no bundled types. */

import { useEffect, useRef } from "react";
import { recordLessonProgress } from "@/app/(client)/academy/actions";
import type { VideoProvider } from "@/lib/types";

/** Load a third-party <script> once; resolve when it's ready. */
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`failed to load ${src}`));
    document.head.appendChild(s);
  });
}

/** Resolve the global YT namespace, loading the IFrame API if needed. */
function loadYouTube(): Promise<any> {
  return new Promise((resolve) => {
    const w = window as any;
    if (w.YT?.Player) {
      resolve(w.YT);
      return;
    }
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(w.YT);
    };
    void loadScript("https://www.youtube.com/iframe_api");
  });
}

/** Resolve the global Vimeo namespace, loading the Player SDK if needed. */
function loadVimeo(): Promise<any> {
  return new Promise((resolve) => {
    const w = window as any;
    if (w.Vimeo?.Player) {
      resolve(w.Vimeo);
      return;
    }
    void loadScript("https://player.vimeo.com/api/player.js").then(() =>
      resolve((window as any).Vimeo),
    );
  });
}

/**
 * Embeds a YouTube/Vimeo player and reports watch progress (debounced ~10s,
 * plus on pause/end/tab-hide/unmount) to the server. Seeks to `startAt` on load
 * so clients resume where they left off.
 */
export function CoursePlayer({
  lessonId,
  provider,
  videoId,
  startAt,
}: {
  lessonId: string;
  provider: VideoProvider;
  videoId: string;
  startAt: number;
}) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};
    const st = { position: startAt, duration: null as number | null, lastSent: 0 };

    const send = (force = false) => {
      const now = Date.now();
      if (!force && now - st.lastSent < 10000) return;
      st.lastSent = now;
      void recordLessonProgress({
        lessonId,
        position: st.position,
        duration: st.duration,
      });
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") send(true);
    };
    document.addEventListener("visibilitychange", onVisibility);

    if (provider === "youtube") {
      void loadYouTube().then((YT) => {
        if (cancelled || !mountRef.current) return;
        const el = document.createElement("div");
        mountRef.current.appendChild(el);
        const player = new YT.Player(el, {
          width: "100%",
          height: "100%",
          videoId,
          playerVars: { rel: 0, modestbranding: 1 },
          events: {
            onReady: () => {
              if (startAt > 0) player.seekTo(startAt, true);
            },
            onStateChange: (e: any) => {
              // YT.PlayerState: 0 = ended, 2 = paused.
              if (e.data === 0 || e.data === 2) send(true);
            },
          },
        });
        const iv = setInterval(() => {
          if (typeof player.getCurrentTime === "function") {
            st.position = player.getCurrentTime() || st.position;
            const d = player.getDuration?.();
            if (d) st.duration = d;
            send(false);
          }
        }, 5000);
        cleanup = () => {
          clearInterval(iv);
          send(true);
          player.destroy?.();
        };
      });
    } else {
      void loadVimeo().then((Vimeo) => {
        if (cancelled || !mountRef.current) return;
        const player = new Vimeo.Player(mountRef.current, { id: Number(videoId) });
        player.ready().then(() => {
          if (startAt > 0) player.setCurrentTime(startAt).catch(() => {});
        });
        player.on("timeupdate", (data: { seconds: number; duration: number }) => {
          st.position = data.seconds;
          st.duration = data.duration;
          send(false);
        });
        player.on("pause", () => send(true));
        player.on("ended", () => send(true));
        cleanup = () => {
          send(true);
          player.destroy?.();
        };
      });
    }

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      cleanup();
    };
  }, [lessonId, provider, videoId, startAt]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">
      <div
        ref={mountRef}
        className="absolute inset-0 h-full w-full [&>iframe]:h-full [&>iframe]:w-full"
      />
    </div>
  );
}
