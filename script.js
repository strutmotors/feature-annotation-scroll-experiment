const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const scrollSection = document.querySelector(".scroll-reveal");
const scrollScene = document.querySelector("[data-scroll-scene]");
const scrollVideo = document.querySelector("[data-scroll-video]");
const startLayer = document.querySelector("[data-layer-start]");
const endLayer = document.querySelector("[data-layer-end]");
const modeButtons = document.querySelectorAll("[data-mode]");
const prevButton = document.querySelector("[data-prev]");
const nextButton = document.querySelector("[data-next]");

window.requestAnimationFrame(() => {
  document.body.classList.add("is-ready");
});

if (!prefersReducedMotion && scrollSection && scrollScene && scrollVideo) {
  scrollVideo.muted = true;
  scrollVideo.playsInline = true;
  scrollVideo.setAttribute("playsinline", "");
  scrollVideo.setAttribute("webkit-playsinline", "");

  let videoDuration = 0;
  let videoReady = false;
  let isTicking = false;
  let isPlaying = false;
  let direction = 0;
  let lastTimestamp = 0;
  const playbackRate = 1.0;
  let mode = "scroll";
  let pendingDirection = 0;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const updateLayers = (progress) => {
    // On some mobile browsers (notably iOS Safari), video metadata/frames may not be available
    // until after an explicit user gesture. Avoid hiding the start image until the video is ready.
    if (!videoReady) {
      if (startLayer) startLayer.style.opacity = "1";
      if (endLayer) endLayer.style.opacity = "0";
      return;
    }
    if (startLayer) {
      startLayer.style.opacity = progress <= 0.02 ? "1" : "0";
    }
    if (endLayer) {
      endLayer.style.opacity = progress >= 0.98 ? "1" : "0";
    }
  };

  const updateTransportState = () => {
    if (!prevButton || !nextButton || videoDuration <= 0) return;
    const progress = scrollVideo.currentTime / videoDuration;
    prevButton.disabled = progress <= 0.01;
    nextButton.disabled = progress >= 0.99;
  };

  const syncVideo = () => {
    if (mode !== "scroll") {
      isTicking = false;
      return;
    }
    const start = scrollSection.offsetTop;
    const end = start + scrollSection.offsetHeight - window.innerHeight;
    const current = clamp(window.scrollY, start, end);
    const progress = end > start ? (current - start) / (end - start) : 0;

    if (videoDuration > 0) {
      scrollVideo.currentTime = progress * videoDuration;
    }
    updateLayers(progress);
    updateTransportState();
    isTicking = false;
  };

  const onScroll = () => {
    if (mode !== "scroll") return;
    if (isTicking) return;
    isTicking = true;
    window.requestAnimationFrame(syncVideo);
  };

  const playStep = (timestamp) => {
    if (!isPlaying || videoDuration <= 0 || direction === 0) return;
    if (!lastTimestamp) {
      // Prime the animation loop so the first frame gets a non-zero delta.
      lastTimestamp = timestamp;
      window.requestAnimationFrame(playStep);
      return;
    }
    const delta = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;
    const nextTime = scrollVideo.currentTime + direction * delta * playbackRate;
    const clampedTime = clamp(nextTime, 0, videoDuration);
    scrollVideo.currentTime = clampedTime;
    const progress = clampedTime / videoDuration;
    updateLayers(progress);

    const reachedEdge =
      (clampedTime <= 0 && direction < 0) || (clampedTime >= videoDuration && direction > 0);
    if (reachedEdge) {
      isPlaying = false;
      direction = 0;
      lastTimestamp = 0;
      updateTransportState();
      return;
    }

    window.requestAnimationFrame(playStep);
  };

  const triggerPlay = (dir) => {
    if (videoDuration <= 0) return;
    if (isPlaying) return;
    direction = dir;
    isPlaying = true;
    lastTimestamp = 0;
    window.requestAnimationFrame(playStep);
  };

  const requestPlay = (dir) => {
    if (videoDuration > 0) {
      triggerPlay(dir);
      return;
    }
    pendingDirection = dir;
    scrollVideo.load();
  };

  const primeMobilePlayback = () => {
    // iOS Safari often requires a user gesture to allow seeking/scrubbing.
    // A muted play() + pause() during a touch gesture "unlocks" the media element.
    if (videoReady) return;
    const playPromise = scrollVideo.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise
        .then(() => {
          scrollVideo.pause();
        })
        .catch(() => {});
    }
  };

  const setMode = (nextMode) => {
    mode = nextMode;
    document.body.classList.toggle("mode-buttons", mode === "buttons");
    modeButtons.forEach((button) => {
      const isActive = button.dataset.mode === mode;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    if (mode === "buttons") {
      window.scrollTo(0, scrollSection.offsetTop);
      if (videoDuration === 0) {
        scrollVideo.load();
      }
      updateTransportState();
    } else {
      syncVideo();
    }
  };

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextMode = button.dataset.mode === "buttons" ? "buttons" : "scroll";
      setMode(nextMode);
    });
  });

  prevButton?.addEventListener("click", () => {
    if (mode !== "buttons") return;
    requestPlay(-1);
  });

  nextButton?.addEventListener("click", () => {
    if (mode !== "buttons") return;
    requestPlay(1);
  });

  document.addEventListener("keydown", (event) => {
    if (mode !== "buttons") return;
    if (event.key === "ArrowRight") {
      requestPlay(1);
    }
    if (event.key === "ArrowLeft") {
      requestPlay(-1);
    }
  });

  scrollVideo.addEventListener("loadedmetadata", () => {
    videoDuration = scrollVideo.duration || 0;
    videoReady = videoDuration > 0;
    scrollVideo.pause();
    scrollVideo.currentTime = 0;
    updateLayers(0);
    updateTransportState();
    if (pendingDirection !== 0 && mode === "buttons") {
      const dir = pendingDirection;
      pendingDirection = 0;
      triggerPlay(dir);
    }
  });

  // Attempt to prime video on first user interaction for mobile browsers.
  document.addEventListener("touchstart", primeMobilePlayback, { passive: true, once: true });
  document.addEventListener("pointerdown", primeMobilePlayback, { passive: true, once: true });

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
} else {
  if (scrollVideo) {
    scrollVideo.style.display = "none";
  }
}
