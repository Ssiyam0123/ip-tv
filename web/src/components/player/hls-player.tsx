'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Loader2,
  AlertTriangle,
  RefreshCw,
  PictureInPicture2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlaybackSource } from '@/lib/api.types';

interface HlsPlayerProps {
  sources: PlaybackSource[];
  channelName: string;
  onSourceChange?: (sourceId: string) => void;
}

type PlayerState = 'loading' | 'playing' | 'paused' | 'error' | 'retrying';

export function HlsPlayer({ sources, channelName, onSourceChange }: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [playerState, setPlayerState] = useState<PlayerState>('loading');
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPip, setIsPip] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const [currentQuality, setCurrentQuality] = useState<string>('auto');

  // Refs to avoid stale closures in error/timeout callbacks
  const retryCountRef = useRef(0);
  const sourceIndexRef = useRef(0);
  const attemptPlaybackRef = useRef<(sourceIndex: number) => void>(() => {});
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const MAX_RETRIES = 2;
  const RETRY_DELAY = 2000;

  // Auto-hide controls after 3 seconds (mobile friendly)
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (playerState === 'playing') setShowControls(false);
    }, 3000);
  }, [playerState]);

  const currentSource = sources[currentSourceIndex];

  const cleanupHls = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  // Define handlePlaybackError before attemptPlayback so attemptPlayback can reference it.
  // We use refs for mutable state to avoid stale closures in setTimeout callbacks.
  const handlePlaybackError = useCallback(() => {
    const currentRetry = retryCountRef.current;
    const currentIdx = sourceIndexRef.current;

    if (currentRetry < MAX_RETRIES) {
      setPlayerState('retrying');
      const newRetry = currentRetry + 1;
      retryCountRef.current = newRetry;
      setRetryCount(newRetry);
      setTimeout(() => {
        attemptPlaybackRef.current(sourceIndexRef.current);
      }, RETRY_DELAY);
    } else if (currentIdx < sources.length - 1) {
      // Try next source
      const nextIndex = currentIdx + 1;
      sourceIndexRef.current = nextIndex;
      setCurrentSourceIndex(nextIndex);
      retryCountRef.current = 0;
      setRetryCount(0);
      setPlayerState('loading');
      onSourceChange?.(sources[nextIndex].sourceId);
      setTimeout(() => {
        attemptPlaybackRef.current(sourceIndexRef.current);
      }, 500);
    } else {
      setErrorMessage('No playable sources available.');
      setPlayerState('error');
    }
  }, [sources, onSourceChange]);

  const attemptPlayback = useCallback(
    (sourceIndex: number) => {
      const source = sources[sourceIndex];
      if (!source || !videoRef.current) return;

      cleanupHls();
      setPlayerState('loading');
      setErrorMessage('');

      const video = videoRef.current;

      // Check if native HLS is supported (Safari)
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = source.playbackUrl;
        video.addEventListener('loadedmetadata', () => setPlayerState('playing'), { once: true });
        video.addEventListener('error', () => handlePlaybackError(), { once: true });
        video.play().catch(() => {});
        return;
      }

      // Use hls.js
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 30,
        });

        hlsRef.current = hls;

        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          hls.loadSource(source.playbackUrl);
        });

        hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
          const qualities = data.levels.map((l) => `${l.height}p`);
          setAvailableQualities(qualities);
          setPlayerState('playing');
          video.play().catch(() => {});
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            handlePlaybackError();
          }
        });

        hls.attachMedia(video);
      } else {
        setErrorMessage('HLS playback is not supported on this browser.');
        setPlayerState('error');
      }
    },
    [sources, cleanupHls, handlePlaybackError],
  );

  // Keep attemptPlaybackRef up-to-date
  useEffect(() => {
    attemptPlaybackRef.current = attemptPlayback;
  }, [attemptPlayback]);

  // Initialize playback when sources change
  useEffect(() => {
    if (sources.length > 0) {
      // Reset refs
      retryCountRef.current = 0;
      sourceIndexRef.current = 0;
      attemptPlayback(0);
    }
    return cleanupHls;
  }, [sources, attemptPlayback, cleanupHls]);

  // Handle fullscreen changes + orientation lock
  useEffect(() => {
    const handleFsChange = () => {
      const entering = document.fullscreenElement === containerRef.current;
      setIsFullscreen(entering);

      // Lock orientation to landscape on mobile when entering fullscreen
      if (entering && screen.orientation && 'lock' in screen.orientation) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (screen.orientation as any).lock('landscape').catch(() => {});
      } else if (!entering && screen.orientation && 'unlock' in screen.orientation) {
        screen.orientation.unlock();
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Handle PiP changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onEnterPiP = () => setIsPip(true);
    const onLeavePiP = () => setIsPip(false);
    video.addEventListener('enterpictureinpicture', onEnterPiP);
    video.addEventListener('leavepictureinpicture', onLeavePiP);
    return () => {
      video.removeEventListener('enterpictureinpicture', onEnterPiP);
      video.removeEventListener('leavepictureinpicture', onLeavePiP);
    };
  }, []);

  // Clean up controls timer on unmount
  useEffect(() => {
    return () => { if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current); };
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch((err) => {
        console.warn('Playback failed or was blocked by browser:', err);
      });
      setPlayerState('playing');
    } else {
      videoRef.current.pause();
      setPlayerState('paused');
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
    setVolume(val);
    setIsMuted(val === 0);
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (isFullscreen) {
      await document.exitFullscreen();
    } else {
      await containerRef.current.requestFullscreen();
    }
  };

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.warn('PiP not supported:', err);
    }
  };

  const handleRetry = () => {
    retryCountRef.current = 0;
    sourceIndexRef.current = 0;
    setRetryCount(0);
    setCurrentSourceIndex(0);
    attemptPlayback(0);
  };

  const changeQuality = (quality: string) => {
    setCurrentQuality(quality);
    if (hlsRef.current) {
      if (quality === 'auto') {
        hlsRef.current.currentLevel = -1;
      } else {
        const levelIndex = hlsRef.current.levels.findIndex(
          (l) => `${l.height}p` === quality,
        );
        if (levelIndex >= 0) {
          hlsRef.current.currentLevel = levelIndex;
        }
      }
    }
  };

  if (playerState === 'error') {
    return (
      <div className="relative aspect-video rounded-xl bg-zinc-900 flex flex-col items-center justify-center gap-4 p-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-500">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <div className="text-center">
          <p className="text-lg font-medium text-text">{errorMessage}</p>
          <p className="text-sm text-text-muted mt-1">{channelName}</p>
        </div>
        <button
          onClick={handleRetry}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative aspect-video rounded-xl overflow-hidden bg-black group',
        'ring-1 ring-border/50',
      )}
      onTouchStart={showControlsTemporarily}
      onMouseMove={showControlsTemporarily}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        className="h-full w-full object-contain cursor-pointer"
        onClick={togglePlay}
        playsInline
        preload="metadata"
        muted={isMuted}
        onPlay={() => setPlayerState('playing')}
        onPause={() => setPlayerState('paused')}
      />

      {/* Loading overlay */}
      {(playerState === 'loading' || playerState === 'retrying') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 gap-3">
          <Loader2 className={cn('h-10 w-10 text-primary', playerState === 'loading' && 'animate-spin')} />
          {playerState === 'retrying' && (
            <p className="text-sm text-text-muted animate-pulse">
              Retrying... ({retryCount}/{MAX_RETRIES})
            </p>
          )}
          {playerState === 'loading' && (
            <p className="text-sm text-text-muted">Loading stream...</p>
          )}
        </div>
      )}

      {/* Center play button when paused */}
      {playerState === 'paused' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer" onClick={togglePlay}>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/90 text-white shadow-lg transition-transform hover:scale-105">
            <Play className="h-8 w-8 ml-1" />
          </div>
        </div>
      )}

      {/* Controls overlay */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-4 pt-10',
          'transition-opacity duration-300',
          showControls || playerState === 'paused' ? 'opacity-100' : 'opacity-0',
        )}
      >

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="p-1.5 text-white hover:text-white/80 transition-colors"
              aria-label={playerState === 'playing' ? 'Pause' : 'Play'}
            >
              {playerState === 'playing' ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </button>

            {/* Mute */}
            <button
              onClick={toggleMute}
              className="p-1.5 text-white/80 hover:text-white transition-colors"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </button>

            {/* Volume slider */}
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-20 h-1 appearance-none bg-white/20 rounded-full cursor-pointer accent-white"
              aria-label="Volume"
            />

            {/* Channel name */}
            <span className="ml-2 text-xs text-white/70 hidden sm:inline truncate max-w-[200px]">
              {channelName}
            </span>

            {/* LIVE Badge */}
            <div className="flex items-center gap-1 bg-red-600/10 border border-red-600/20 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase text-red-500 animate-pulse select-none ml-1">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              Live
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quality selector */}
            {availableQualities.length > 0 && (
              <div className="relative group/quality">
                <button
                  className="px-2 py-1 text-xs font-medium text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded transition-colors"
                  aria-label="Quality selector"
                >
                  {currentQuality}
                </button>
                <div className="absolute bottom-full right-0 mb-2 hidden group-hover/quality:block">
                  <div className="bg-zinc-900 border border-border rounded-lg p-1 shadow-xl">
                    <button
                      onClick={() => changeQuality('auto')}
                      className={cn(
                        'block w-full text-left px-3 py-1.5 text-xs rounded transition-colors whitespace-nowrap',
                        currentQuality === 'auto'
                          ? 'bg-primary text-white'
                          : 'text-text-secondary hover:text-text hover:bg-surface-hover',
                      )}
                    >
                      Auto
                    </button>
                    {availableQualities.map((q) => (
                      <button
                        key={q}
                        onClick={() => changeQuality(q)}
                        className={cn(
                          'block w-full text-left px-3 py-1.5 text-xs rounded transition-colors whitespace-nowrap',
                          currentQuality === q
                            ? 'bg-primary text-white'
                            : 'text-text-secondary hover:text-text hover:bg-surface-hover',
                        )}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Source indicator */}
            {sources.length > 1 && (
              <span className="text-xs text-white/50 hidden sm:inline">
                Source {currentSourceIndex + 1}/{sources.length}
              </span>
            )}

            {/* Picture in Picture */}
            {typeof document !== 'undefined' && 'pictureInPictureEnabled' in document && (
              <button
                onClick={togglePiP}
                className={cn(
                  'p-1.5 transition-colors',
                  isPip ? 'text-primary' : 'text-white/80 hover:text-white',
                )}
                aria-label="Picture in Picture"
                title="Picture in Picture"
              >
                <PictureInPicture2 className="h-5 w-5" />
              </button>
            )}

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 text-white/80 hover:text-white transition-colors"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize className="h-5 w-5" />
              ) : (
                <Maximize className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Source selector (top-right) */}
      {sources.length > 1 && (
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <select
            value={currentSourceIndex}
            onChange={(e) => {
              const idx = parseInt(e.target.value);
              setCurrentSourceIndex(idx);
              setRetryCount(0);
              attemptPlayback(idx);
              onSourceChange?.(sources[idx].sourceId);
            }}
            className="bg-black/60 text-white text-xs rounded-lg px-2 py-1 border border-white/20 backdrop-blur-sm cursor-pointer"
            aria-label="Select source"
          >
            {sources.map((source, i) => (
              <option key={source.sourceId} value={i}>
                {source.quality} (Source {i + 1})
              </option>
            ))}
          </select>
        </div>
      )}
      {/* Top Left Live Broadcast Badge */}
      <div className="absolute top-3 left-3 bg-red-600 px-2.5 py-0.75 rounded-md text-[10px] font-extrabold uppercase text-white shadow-lg flex items-center gap-1.5 z-10 select-none animate-pulse">
        <span className="h-1.5 w-1.5 rounded-full bg-white" />
        Live
      </div>
    </div>
  );
}
