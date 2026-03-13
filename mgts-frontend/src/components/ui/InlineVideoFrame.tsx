"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

type InlineVideoFrameProps = {
  imageUrl?: string | null;
  imageAlt?: string;
  videoUrl?: string | null;
  badge?: React.ReactNode;
  className?: string;
};

export default function InlineVideoFrame({
  imageUrl,
  imageAlt = "",
  videoUrl,
  badge,
  className = "",
}: InlineVideoFrameProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!isPlaying) return;
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => {
      // Ignore autoplay restrictions; user can press play again.
    });
  }, [isPlaying]);

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handleClose = () => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
    setIsPlaying(false);
  };

  return (
    <div className={`relative h-full w-full ${className}`}>
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={imageAlt}
          fill
          sizes="(min-width: 1024px) 40vw, 100vw"
          className={`object-cover transition-transform duration-700 group-hover:scale-105 ${
            isPlaying ? "opacity-0" : "opacity-100"
          }`}
        />
      ) : (
        <div
          className={`absolute inset-0 bg-slate-800/40 ${
            isPlaying ? "opacity-0" : "opacity-100"
          }`}
        />
      )}

      {videoUrl && (
        <video
          ref={videoRef}
          className={`absolute inset-0 h-full w-full object-cover ${
            isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          controls
          playsInline
          controlsList="nodownload noremoteplayback nofullscreen"
          disablePictureInPicture
          preload="metadata"
          src={videoUrl}
          onEnded={handleClose}
        />
      )}

      {videoUrl && !isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-all">
          <button
            className="flex items-center justify-center rounded-full size-20 bg-primary text-white shadow-2xl shadow-primary/50 transform group-hover:scale-110 transition-all"
            type="button"
            aria-label="Смотреть видео"
            onClick={handlePlay}
          >
            <span className="material-symbols-outlined !text-4xl fill-[1]">play_arrow</span>
          </button>
        </div>
      )}

      {badge && (
        <div className={isPlaying ? "hidden" : ""}>
          {badge}
        </div>
      )}

      {videoUrl && isPlaying && (
        <button
          className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors"
          type="button"
          aria-label="Закрыть видео"
          onClick={handleClose}
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      )}
    </div>
  );
}
