import React, { useState } from 'react';
import { PlayIcon, PauseIcon, VolumeIcon, GearIcon, PipIcon, FullscreenIcon } from './Icons';

const emojiSet = ['❤️', '👏', '😂', '😮', '🔥', '⭐'];

/**
 * VideoPanel is a non-functional yet styled video area to match the viewers dashboard layout.
 * PUBLIC_INTERFACE
 * @returns JSX.Element
 */
export default function VideoPanel() {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(60);
  const [progress, setProgress] = useState(40);

  return (
    <section className="video-card card" aria-label="Live stream panel">
      <div className="stage" role="img" aria-label="Live stream placeholder">
        <div className="overlay-top-left">
          <span className="pill pill-live"><span className="dot" aria-hidden="true"></span> Recording</span>
          <span className="pill pill-warning">Matchday 28</span>
        </div>

        <div className="loader" aria-live="polite">
          <div className="spinner" aria-hidden="true"></div>
          <div className="caption">Loading stream...</div>
        </div>

        <div className="reaction-bar" aria-label="React with emoji">
          {emojiSet.map(e => (
            <button key={e} className="reaction" aria-label={`Send ${e} reaction`}>
              {e}
            </button>
          ))}
        </div>
      </div>

      <div className="player-controls" aria-label="Player controls">
        <div className="controls-top">
          <button
            className="icon-btn"
            onClick={() => setPlaying(p => !p)}
            aria-label={playing ? 'Pause' : 'Play'}
            title={playing ? 'Pause' : 'Play'}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>
          <span className="live"><span className="dot" aria-hidden="true" /> Live</span>
          <div className="spacer" />
          <div className="right-cluster">
            <div className="volume" role="group" aria-label="Volume">
              <button className="icon-btn" aria-hidden="true"><VolumeIcon /></button>
              <input
                className="range"
                type="range"
                min={0}
                max={100}
                value={volume}
                onChange={e => setVolume(Number(e.target.value))}
                aria-label="Volume level"
              />
            </div>
            <button className="icon-btn" aria-label="Settings"><GearIcon /></button>
            <button className="icon-btn" aria-label="Picture in picture"><PipIcon /></button>
            <button className="icon-btn" aria-label="Fullscreen"><FullscreenIcon /></button>
          </div>
        </div>
        <input
          className="range"
          type="range"
          min={0}
          max={100}
          value={progress}
          onChange={e => setProgress(Number(e.target.value))}
          aria-label="Seek"
        />
      </div>

      <div className="scoreboard" aria-label="Scoreboard">
        <div className="team team-left">Home</div>
        <div className="score" aria-live="polite">0 : 0</div>
        <div className="team team-right" style={{ textAlign: 'right' }}>Away</div>
      </div>
    </section>
  );
}
