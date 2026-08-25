'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import { Pause, Play } from 'lucide-react';

type NetworkInformation = {
  saveData?: boolean;
  effectiveType?: string;
  addEventListener?: (type: 'change', listener: () => void) => void;
  removeEventListener?: (type: 'change', listener: () => void) => void;
};

function getConnection(): NetworkInformation | undefined {
  return (navigator as Navigator & { connection?: NetworkInformation }).connection;
}

function connectionAllowsVideo(): boolean {
  const connection = getConnection();
  if (!connection) return true;
  if (connection.saveData) return false;
  // O arquivo passa de 2 MB: em 3G ele disputa banda com o que a pessoa veio
  // ver. O pôster já cobre a tela sozinho, então o vídeo é o que cede.
  return !/(^|-)(2g|3g)$/.test(connection.effectiveType ?? '');
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeToMotionPreference(onChange: () => void) {
  const media = window.matchMedia(REDUCED_MOTION_QUERY);
  const connection = getConnection();
  media.addEventListener('change', onChange);
  connection?.addEventListener?.('change', onChange);
  return () => {
    media.removeEventListener('change', onChange);
    connection?.removeEventListener?.('change', onChange);
  };
}

function useShowVideo(): boolean {
  return useSyncExternalStore(
    subscribeToMotionPreference,
    () => !window.matchMedia(REDUCED_MOTION_QUERY).matches && connectionAllowsVideo(),
    // Server snapshot: render only the poster.
    () => false,
  );
}

/**
 * Poster-first hero. The server renders only the lightweight poster image
 * (fast LCP); the looping video mounts after hydration and only when the
 * visitor's connection and motion preferences allow it.
 */
export default function HeroVideo() {
  const showVideo = useShowVideo();

  return (
    <div className="relative h-full w-full">
      <Image
        src="/brand/hero-poster-balaio.jpg"
        alt=""
        fill
        priority
        sizes="(max-width: 639px) calc(100vw - 40px), (max-width: 1023px) 580px, 48vw"
        className="scale-[1.16] object-cover"
      />
      {showVideo ? <PlaybackVideo /> : null}
    </div>
  );
}

function PlaybackVideo() {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [ready, setReady] = useState(false);
  const [manualPaused, setManualPaused] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let inView = true;

    const syncPlayback = async () => {
      if (manualPaused || !inView || document.visibilityState !== 'visible') {
        video.pause();
        return;
      }

      try {
        video.muted = true;
        video.playsInline = true;
        await video.play();
      } catch {
        // Autoplay blocked: the poster remains visible.
      }
    };

    const observer =
      'IntersectionObserver' in window
        ? new IntersectionObserver(
            ([entry]) => {
              inView = entry?.isIntersecting ?? true;
              void syncPlayback();
            },
            { rootMargin: '200px 0px' },
          )
        : null;
    const handleVisibilityChange = () => void syncPlayback();

    observer?.observe(video);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    void syncPlayback();

    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      video.pause();
    };
  }, [manualPaused]);

  return (
    <>
      <video
        ref={ref}
        className={`absolute inset-0 h-full w-full scale-[1.16] object-cover transition-opacity duration-500 ${ready ? 'opacity-100' : 'opacity-0'}`}
        autoPlay
        muted
        playsInline
        loop
        preload="metadata"
        controls={false}
        disablePictureInPicture
        disableRemotePlayback
        aria-hidden="true"
        tabIndex={-1}
        onLoadedData={() => setReady(true)}
        onPlaying={() => setReady(true)}
      >
        <source src="/brand/hero-optimized.mp4" type="video/mp4" />
      </video>

      {ready ? (
        <button
          type="button"
          onClick={() => setManualPaused((paused) => !paused)}
          className="absolute right-4 bottom-4 z-20 flex size-10 items-center justify-center rounded-full border border-white/25 bg-[rgb(var(--fg))]/82 text-white shadow-lg backdrop-blur transition hover:bg-[rgb(var(--fg))] sm:right-5 sm:bottom-5"
          aria-label={manualPaused ? 'Reproduzir animação' : 'Pausar animação'}
        >
          {manualPaused ? (
            <Play aria-hidden="true" className="size-4" fill="currentColor" />
          ) : (
            <Pause aria-hidden="true" className="size-4" fill="currentColor" />
          )}
        </button>
      ) : null}
    </>
  );
}
