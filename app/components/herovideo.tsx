'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Image from 'next/image';

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
        src="/brand/hero-poster-balaio.png"
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

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let inView = true;

    const syncPlayback = async () => {
      if (!inView || document.visibilityState !== 'visible') {
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
  }, []);

  return (
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
      <source src="/brand/hero.mp4" type="video/mp4" />
    </video>
  );
}
