(() => {
  document.documentElement.classList.add("js-ready");

  const header = document.querySelector("[data-header]");
  const progress = document.querySelector("[data-reading-progress]");
  const navToggle = document.querySelector("[data-nav-toggle]");
  const navLabel = document.querySelector("[data-nav-label]");
  const nav = document.querySelector("[data-nav]");
  let scrollFrame = null;

  const updateScrollState = () => {
    const scrollTop = window.scrollY;
    const scrollable = Math.max(
      document.documentElement.scrollHeight - window.innerHeight,
      1,
    );

    header?.classList.toggle("is-scrolled", scrollTop > 24);
    if (progress) {
      progress.style.transform = `scaleX(${Math.min(scrollTop / scrollable, 1)})`;
    }
    scrollFrame = null;
  };

  const requestScrollUpdate = () => {
    if (scrollFrame !== null) return;
    scrollFrame = window.requestAnimationFrame(updateScrollState);
  };

  updateScrollState();
  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  window.addEventListener("resize", requestScrollUpdate, { passive: true });

  const setMenuOpen = (open) => {
    if (!header || !navToggle) return;
    header.classList.toggle("nav-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    if (navLabel) navLabel.textContent = open ? "Fermer le menu" : "Ouvrir le menu";
  };

  navToggle?.addEventListener("click", () => {
    setMenuOpen(navToggle.getAttribute("aria-expanded") !== "true");
  });

  nav?.addEventListener("click", (event) => {
    if (event.target.closest("a")) setMenuOpen(false);
  });

  document.addEventListener("click", (event) => {
    if (!header?.classList.contains("nav-open")) return;
    if (!header.contains(event.target)) setMenuOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !header?.classList.contains("nav-open")) return;
    setMenuOpen(false);
    playInterfaceSound("close");
    navToggle?.focus();
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 940) setMenuOpen(false);
  });

  const navLinks = [...document.querySelectorAll(".main-nav a[href^='#']")];
  const navTargets = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if ("IntersectionObserver" in window && navTargets.length) {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visible) return;
        navLinks.forEach((link) => {
          const active = link.getAttribute("href") === `#${visible.target.id}`;
          if (active) link.setAttribute("aria-current", "true");
          else link.removeAttribute("aria-current");
        });
      },
      { rootMargin: "-24% 0px -58% 0px", threshold: [0.01, 0.2] },
    );
    navTargets.forEach((section) => sectionObserver.observe(section));
  }

  const revealItems = [...document.querySelectorAll(".reveal")];
  if (!("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    revealItems.forEach((item) => revealObserver.observe(item));
  }

  document.querySelectorAll("[data-accordion]").forEach((accordion) => {
    const items = [...accordion.querySelectorAll(":scope > details")];
    items.forEach((details) => {
      details.addEventListener("toggle", () => {
        if (!details.open) return;
        items.forEach((other) => {
          if (other !== details) other.open = false;
        });
      });
    });
  });

  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

  /* Progressive copy appears only when an expandable answer is requested. */

  const progressiveTargets = [
    ...document.querySelectorAll("[data-progressive-copy], .reading-note > p, .method-card > div"),
  ];

  const prepareProgressiveCopy = (container) => {
    if (!container || container.dataset.progressiveReady === "true" || reducedMotion) return;
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) {
      if (walker.currentNode.nodeValue.trim()) textNodes.push(walker.currentNode);
    }
    let wordIndex = 0;
    textNodes.forEach((node) => {
      const fragment = document.createDocumentFragment();
      node.nodeValue.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          fragment.append(document.createTextNode(part));
          return;
        }
        const span = document.createElement("span");
        span.className = "progressive-word";
        span.style.setProperty("--word-delay", `${Math.min(wordIndex * 18, 1250)}ms`);
        span.textContent = part;
        fragment.append(span);
        wordIndex += 1;
      });
      node.replaceWith(fragment);
    });
    container.dataset.progressiveReady = "true";
  };

  const playProgressiveCopy = (container) => {
    if (!container || reducedMotion) return;
    prepareProgressiveCopy(container);
    container.classList.remove("is-writing");
    void container.offsetWidth;
    container.classList.add("is-writing");
  };

  progressiveTargets.forEach((target) => {
    prepareProgressiveCopy(target);
    const details = target.closest("details");
    details?.addEventListener("toggle", () => {
      if (details.open) playProgressiveCopy(target);
    });
    if (details?.open) window.setTimeout(() => playProgressiveCopy(target), 160);
  });

  /* Short interface cues. Nothing plays before the visitor's first gesture. */

  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  let audioContext = null;
  let masterGain = null;
  let audioReady = null;
  let audioUnlocked = false;
  let noiseBuffer = null;
  let inputMode = "pointer";
  const lastSoundAt = new Map();

  const setAudioParam = (param, method, value, time) => {
    if (!param) return;
    if (typeof param[method] === "function") param[method](value, time);
    else param.value = value;
  };

  const ensureAudioContext = async () => {
    if (!AudioEngine) return false;

    if (!audioContext) {
      audioContext = new AudioEngine();
      masterGain = audioContext.createGain();
      masterGain.gain.value = 0.38;

      if (typeof audioContext.createDynamicsCompressor === "function") {
        const limiter = audioContext.createDynamicsCompressor();
        setAudioParam(limiter.threshold, "setValueAtTime", -24, audioContext.currentTime);
        setAudioParam(limiter.knee, "setValueAtTime", 12, audioContext.currentTime);
        setAudioParam(limiter.ratio, "setValueAtTime", 4, audioContext.currentTime);
        setAudioParam(limiter.attack, "setValueAtTime", 0.006, audioContext.currentTime);
        setAudioParam(limiter.release, "setValueAtTime", 0.14, audioContext.currentTime);
        masterGain.connect(limiter);
        limiter.connect(audioContext.destination);
      } else {
        masterGain.connect(audioContext.destination);
      }
    }

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }
    return audioContext.state === "running";
  };

  const getAudioReady = () => {
    if (!audioUnlocked || !AudioEngine) return Promise.resolve(false);
    if (!audioReady || audioContext?.state !== "running") {
      audioReady = ensureAudioContext().catch(() => false);
    }
    return audioReady;
  };

  const unlockAudio = () => {
    audioUnlocked = true;
    void getAudioReady();
  };

  const scheduleTone = ({
    frequency,
    endFrequency = frequency,
    offset = 0,
    duration = 0.1,
    level = 0.14,
    type = "sine",
    filterFrequency = 2600,
  }) => {
    if (!audioContext || !masterGain || audioContext.state !== "running") return;
    const startsAt = audioContext.currentTime + 0.008 + offset;
    const oscillator = audioContext.createOscillator();
    const envelope = audioContext.createGain();
    oscillator.type = type;
    setAudioParam(oscillator.frequency, "setValueAtTime", Math.max(frequency, 1), startsAt);
    setAudioParam(
      oscillator.frequency,
      "exponentialRampToValueAtTime",
      Math.max(endFrequency, 1),
      startsAt + duration,
    );
    setAudioParam(envelope.gain, "setValueAtTime", 0.0001, startsAt);
    setAudioParam(
      envelope.gain,
      "exponentialRampToValueAtTime",
      level,
      startsAt + Math.min(0.012, duration / 3),
    );
    setAudioParam(
      envelope.gain,
      "exponentialRampToValueAtTime",
      0.0001,
      startsAt + duration,
    );

    if (typeof audioContext.createBiquadFilter === "function") {
      const filter = audioContext.createBiquadFilter();
      filter.type = "lowpass";
      setAudioParam(filter.frequency, "setValueAtTime", filterFrequency, startsAt);
      oscillator.connect(filter);
      filter.connect(envelope);
    } else {
      oscillator.connect(envelope);
    }
    envelope.connect(masterGain);
    oscillator.start(startsAt);
    oscillator.stop(startsAt + duration + 0.02);
  };

  const getNoiseBuffer = () => {
    if (noiseBuffer || !audioContext || typeof audioContext.createBuffer !== "function") {
      return noiseBuffer;
    }
    const sampleRate = audioContext.sampleRate || 48000;
    const length = Math.max(1, Math.round(sampleRate * 0.34));
    noiseBuffer = audioContext.createBuffer(1, length, sampleRate);
    const samples = noiseBuffer.getChannelData(0);
    let seed = 173;
    for (let index = 0; index < samples.length; index += 1) {
      seed = (seed * 16807) % 2147483647;
      const fade = 1 - index / samples.length;
      samples[index] = ((seed / 2147483647) * 2 - 1) * fade;
    }
    return noiseBuffer;
  };

  const scheduleNoise = ({
    offset = 0,
    duration = 0.11,
    level = 0.075,
    startFrequency = 1450,
    endFrequency = 760,
    q = 0.72,
  } = {}) => {
    if (
      !audioContext ||
      !masterGain ||
      audioContext.state !== "running" ||
      typeof audioContext.createBufferSource !== "function"
    ) return;
    const buffer = getNoiseBuffer();
    if (!buffer) return;
    const startsAt = audioContext.currentTime + 0.008 + offset;
    const source = audioContext.createBufferSource();
    const envelope = audioContext.createGain();
    source.buffer = buffer;
    setAudioParam(envelope.gain, "setValueAtTime", 0.0001, startsAt);
    setAudioParam(envelope.gain, "linearRampToValueAtTime", level, startsAt + 0.008);
    setAudioParam(
      envelope.gain,
      "exponentialRampToValueAtTime",
      0.0001,
      startsAt + duration,
    );

    if (typeof audioContext.createBiquadFilter === "function") {
      const filter = audioContext.createBiquadFilter();
      filter.type = "bandpass";
      setAudioParam(filter.frequency, "setValueAtTime", startFrequency, startsAt);
      setAudioParam(filter.frequency, "exponentialRampToValueAtTime", endFrequency, startsAt + duration);
      setAudioParam(filter.Q, "setValueAtTime", q, startsAt);
      source.connect(filter);
      filter.connect(envelope);
    } else {
      source.connect(envelope);
    }
    envelope.connect(masterGain);
    source.start(startsAt);
    source.stop(startsAt + duration + 0.015);
  };

  const scheduleMarkerFoley = (profile = {}) => {
    if (
      !audioContext
      || !masterGain
      || audioContext.state !== "running"
      || typeof audioContext.createBufferSource !== "function"
    ) return;

    const duration = Math.max(0.14, Math.min(Number(profile.duration || 190) / 1000, 0.34));
    const sampleRate = audioContext.sampleRate || 48000;
    const length = Math.max(1, Math.round(sampleRate * duration));
    const buffer = audioContext.createBuffer(1, length, sampleRate);
    const samples = buffer.getChannelData(0);
    const pressure = Number(profile.pressure || 1);
    const roughness = Number(profile.roughness || 0.6);
    const squeakLevel = Number(profile.squeak || 0.025);
    const basePitch = Number(profile.pitch || 1450);
    let seed = Number(profile.seed || 173) + 1;
    let paperMemory = 0;

    for (let index = 0; index < length; index += 1) {
      const time = index / sampleRate;
      const progress = index / Math.max(1, length - 1);
      seed = (seed * 16807) % 2147483647;
      const white = (seed / 2147483647) * 2 - 1;
      paperMemory = white * (0.72 + roughness * 0.12) + paperMemory * (0.28 - roughness * 0.12);
      const handPressure = 0.82
        + Math.sin(progress * Math.PI * (5.5 + roughness)) * 0.08
        + Math.sin(progress * Math.PI * 19 + profile.seed) * 0.035;
      const attack = Math.min(1, progress / 0.055);
      const release = Math.min(1, (1 - progress) / 0.075);
      const envelope = Math.max(0, attack * release) * handPressure * pressure;
      const pitch = basePitch + Math.sin(progress * Math.PI * 3.2) * 120;
      const nibSqueak = Math.sin(2 * Math.PI * pitch * time) * squeakLevel;
      const contact = progress < 0.035
        ? white * (1 - progress / 0.035) * 0.22
        : progress > 0.965
          ? white * ((progress - 0.965) / 0.035) * 0.12
          : 0;
      samples[index] = (paperMemory * 0.72 + nibSqueak) * envelope + contact;
    }

    const startsAt = audioContext.currentTime + 0.008;
    const source = audioContext.createBufferSource();
    const highpass = audioContext.createBiquadFilter();
    const lowpass = audioContext.createBiquadFilter();
    const envelope = audioContext.createGain();
    source.buffer = buffer;
    highpass.type = "highpass";
    highpass.frequency.setValueAtTime(420 + roughness * 120, startsAt);
    highpass.Q.setValueAtTime(0.45, startsAt);
    lowpass.type = "lowpass";
    lowpass.frequency.setValueAtTime(5200 + pressure * 650, startsAt);
    lowpass.Q.setValueAtTime(0.38, startsAt);
    envelope.gain.setValueAtTime(Math.max(0.12, Math.min(Number(profile.level || 0.2), 0.28)), startsAt);
    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(envelope);
    envelope.connect(masterGain);
    source.start(startsAt);
    source.stop(startsAt + duration + 0.01);
  };

  const highlighterProfiles = [
    { seed: 19, angle: -0.8, start: -6, end: -4, y: -1, thickness: 1.03, duration: 186, speed: 0.98, pressure: 1.02, roughness: 0.63, pitch: 1370, squeak: 0.026, level: 0.22 },
    { seed: 37, angle: 0.5, start: -4, end: -7, y: 1, thickness: 0.95, duration: 204, speed: 1.07, pressure: 0.94, roughness: 0.55, pitch: 1540, squeak: 0.02, level: 0.205 },
    { seed: 53, angle: -1.15, start: -8, end: -3, y: 0, thickness: 1.09, duration: 172, speed: 0.9, pressure: 1.08, roughness: 0.72, pitch: 1260, squeak: 0.031, level: 0.225 },
    { seed: 71, angle: 0.9, start: -3, end: -8, y: -1, thickness: 0.91, duration: 218, speed: 1.12, pressure: 0.91, roughness: 0.49, pitch: 1660, squeak: 0.018, level: 0.2 },
    { seed: 89, angle: -0.3, start: -7, end: -6, y: 2, thickness: 1.13, duration: 192, speed: 1.01, pressure: 1.1, roughness: 0.77, pitch: 1190, squeak: 0.034, level: 0.23 },
    { seed: 107, angle: 1.25, start: -5, end: -4, y: 0, thickness: 0.97, duration: 178, speed: 0.94, pressure: 0.98, roughness: 0.6, pitch: 1480, squeak: 0.024, level: 0.215 },
    { seed: 131, angle: -0.6, start: -3, end: -9, y: -2, thickness: 1.06, duration: 210, speed: 1.1, pressure: 1.03, roughness: 0.68, pitch: 1320, squeak: 0.029, level: 0.215 },
    { seed: 149, angle: 0.2, start: -9, end: -5, y: 1, thickness: 0.93, duration: 181, speed: 0.96, pressure: 0.95, roughness: 0.57, pitch: 1435, squeak: 0.022, level: 0.21 },
    { seed: 167, angle: -1.35, start: -6, end: -7, y: 2, thickness: 1.11, duration: 226, speed: 1.15, pressure: 1.06, roughness: 0.74, pitch: 1570, squeak: 0.028, level: 0.22 },
    { seed: 191, angle: 0.7, start: -8, end: -3, y: -1, thickness: 0.99, duration: 196, speed: 1.03, pressure: 1, roughness: 0.65, pitch: 1290, squeak: 0.027, level: 0.22 },
  ];

  const renderInterfaceSound = (kind, options = {}) => {
    if (kind === "highlighter") {
      const profile = highlighterProfiles[Number(options.variant) % highlighterProfiles.length]
        || highlighterProfiles[0];
      scheduleMarkerFoley({
        ...profile,
        duration: Number(options.duration) || profile.duration,
      });
      return;
    }

    if (kind === "hover") {
      scheduleTone({ frequency: 610, endFrequency: 690, duration: 0.052, level: 0.105, type: "triangle" });
      return;
    }

    if (kind === "press") {
      scheduleNoise({ duration: 0.055, level: 0.055 });
      scheduleTone({ frequency: 246.94, endFrequency: 196, duration: 0.075, level: 0.14, type: "triangle", filterFrequency: 1800 });
      return;
    }

    if (kind === "open") {
      scheduleTone({ frequency: 293.66, endFrequency: 349.23, duration: 0.105, level: 0.135, type: "sine" });
      scheduleTone({ frequency: 440, endFrequency: 466.16, offset: 0.042, duration: 0.13, level: 0.105, type: "sine" });
      return;
    }

    if (kind === "close") {
      scheduleTone({ frequency: 392, endFrequency: 293.66, duration: 0.115, level: 0.13, type: "sine" });
      scheduleNoise({ offset: 0.025, duration: 0.07, level: 0.04 });
      return;
    }

    if (kind === "navigate") {
      scheduleTone({ frequency: 329.63, endFrequency: 392, duration: 0.08, level: 0.125, type: "triangle" });
      scheduleTone({ frequency: 493.88, endFrequency: 523.25, offset: 0.055, duration: 0.12, level: 0.095, type: "sine" });
      return;
    }

    if (kind === "page") {
      scheduleNoise({ duration: 0.13, level: 0.085 });
      scheduleTone({ frequency: 220, endFrequency: 277.18, offset: 0.018, duration: 0.105, level: 0.085, type: "triangle", filterFrequency: 1500 });
      return;
    }

    if (kind === "confirm") {
      scheduleTone({ frequency: 440, endFrequency: 466.16, duration: 0.085, level: 0.13, type: "sine" });
      scheduleTone({ frequency: 659.25, endFrequency: 698.46, offset: 0.062, duration: 0.14, level: 0.105, type: "sine" });
      return;
    }

    if (kind === "book") {
      const notes = Array.isArray(options.notes) && options.notes.length
        ? options.notes
        : [392, 493.88, 587.33];
      notes.slice(0, 3).forEach((note, index) => {
        scheduleTone({
          frequency: Number(note),
          endFrequency: Number(note) * 1.012,
          offset: index * 0.072,
          duration: 0.145,
          level: 0.145 - index * 0.018,
          type: index === 1 ? "triangle" : "sine",
        });
      });
      return;
    }

    if (kind === "term-a") {
      scheduleTone({ frequency: 293.66, endFrequency: 329.63, duration: 0.09, level: 0.15, type: "sine" });
      scheduleTone({ frequency: 440, endFrequency: 466.16, offset: 0.034, duration: 0.13, level: 0.085, type: "triangle" });
      return;
    }

    if (kind === "term-b") {
      scheduleNoise({ duration: 0.075, level: 0.045 });
      scheduleTone({ frequency: 392, endFrequency: 440, duration: 0.11, level: 0.125, type: "sine", filterFrequency: 2200 });
      return;
    }

    if (kind === "term-c") {
      scheduleTone({ frequency: 523.25, endFrequency: 493.88, duration: 0.1, level: 0.12, type: "triangle", filterFrequency: 1900 });
      return;
    }

    if (kind === "study-open") {
      scheduleNoise({ duration: 0.14, level: 0.055 });
      scheduleTone({ frequency: 261.63, endFrequency: 329.63, duration: 0.14, level: 0.14, type: "sine" });
      scheduleTone({ frequency: 392, endFrequency: 440, offset: 0.07, duration: 0.17, level: 0.105, type: "sine" });
      return;
    }

    if (kind === "question-shift") {
      scheduleNoise({ duration: 0.18, level: 0.042 });
      scheduleTone({ frequency: 246.94, endFrequency: 349.23, duration: 0.2, level: 0.095, type: "sine", filterFrequency: 1800 });
      scheduleTone({ frequency: 392, endFrequency: 493.88, offset: 0.075, duration: 0.2, level: 0.072, type: "sine" });
      return;
    }

    if (kind === "coherence-shift") {
      scheduleNoise({ duration: 0.13, level: 0.035 });
      scheduleTone({ frequency: 329.63, endFrequency: 392, duration: 0.13, level: 0.085, type: "triangle", filterFrequency: 1700 });
      return;
    }

    if (kind === "study-close") {
      scheduleTone({ frequency: 440, endFrequency: 329.63, duration: 0.13, level: 0.13, type: "sine" });
      scheduleNoise({ offset: 0.025, duration: 0.09, level: 0.045 });
    }
  };

  const soundCooldowns = {
    hover: 78,
    press: 52,
    open: 90,
    close: 90,
    navigate: 100,
    page: 110,
    confirm: 160,
    book: 430,
    "term-a": 92,
    "term-b": 92,
    "term-c": 92,
    "study-open": 180,
    "study-close": 180,
    "question-shift": 420,
    "coherence-shift": 260,
    highlighter: 96,
  };

  const playInterfaceSound = (kind, options = {}) => {
    if (!audioUnlocked || !AudioEngine) return;
    const now = window.performance?.now?.() ?? Date.now();
    const lastPlayed = lastSoundAt.get(kind) ?? -Infinity;
    if (!options.force && now - lastPlayed < (soundCooldowns[kind] ?? 60)) return;
    lastSoundAt.set(kind, now);
    void getAudioReady().then((ready) => {
      if (ready) renderInterfaceSound(kind, options);
    });
  };

  const interactiveSelector = [
    "a[href]",
    "button:not(:disabled)",
    "summary",
    "[role='button']",
  ].join(",");

  const closestInteractive = (target) => target?.closest?.(interactiveSelector) || null;

  const activationSoundFor = (control) => {
    if (!control || control.matches("[data-book-select]")) return null;
    if (control.matches("[data-contact-open], [data-contact-close], [data-copy-email]")) return null;
    if (control.matches("[data-hero-question-prev], [data-hero-question-next], [data-coherence-prev], [data-coherence-next]")) return null;
    if (control.matches("[data-term-hotspot], [data-term-select], [data-study-open], [data-study-close]")) {
      return null;
    }
    if (control.matches("[data-excerpt-page]")) return null;
    if (control.matches("[data-excerpt-prev], [data-excerpt-next]")) {
      return "page";
    }
    if (control.matches("[data-study-prev], [data-study-next]")) return "page";
    if (control.matches("[data-analysis-close]")) return "close";
    if (control.matches("[data-nav-toggle]")) {
      return control.getAttribute("aria-expanded") === "true" ? "close" : "open";
    }
    if (control.matches("summary")) {
      return control.parentElement?.open ? "close" : "open";
    }
    if (control.matches("[data-share-page]")) return "press";
    if (control.matches("a[download]")) return "page";
    if (control.matches("a[href]")) return "navigate";
    return "press";
  };

  document.addEventListener(
    "pointerdown",
    () => {
      inputMode = "pointer";
      unlockAudio();
    },
    { capture: true },
  );

  document.addEventListener(
    "keydown",
    () => {
      inputMode = "keyboard";
      unlockAudio();
    },
    { capture: true },
  );

  document.addEventListener(
    "click",
    (event) => {
      unlockAudio();
      const control = closestInteractive(event.target);
      const kind = activationSoundFor(control);
      if (kind) playInterfaceSound(kind);
    },
    { capture: true },
  );

  document.addEventListener("pointerover", (event) => {
    if (!audioUnlocked || event.pointerType === "touch") return;
    const control = closestInteractive(event.target);
    if (!control || control.matches("[data-book-select], [data-term-hotspot], [data-term-select], [data-excerpt-page]")) return;
    if (event.relatedTarget && control.contains(event.relatedTarget)) return;
    playInterfaceSound("hover");
  });

  document.addEventListener("focusin", (event) => {
    if (!audioUnlocked || inputMode !== "keyboard") return;
    const control = closestInteractive(event.target);
    if (!control || control.matches("[data-book-select], [data-term-hotspot], [data-term-select], [data-excerpt-page]")) return;
    playInterfaceSound("hover");
  });

  /* Editorial questions: one quiet automatic change per minute. */

  const siteData = window.PNI_SITE_DATA || {};
  const heroQuestions = Array.isArray(siteData.questions) ? siteData.questions : [];
  const heroQuestion = document.querySelector("[data-hero-question]");
  const heroQuestionLink = document.querySelector("[data-hero-question-link]");
  const heroQuestionText = document.querySelector("[data-hero-question-text]");
  const heroQuestionEmphasis = document.querySelector("[data-hero-question-emphasis]");
  const heroQuestionLead = document.querySelector("[data-hero-question-lead]");
  let heroQuestionIndex = 0;
  let heroQuestionTimer = null;
  let heroRotationPaused = reducedMotion;

  const renderHeroQuestion = (index) => {
    if (!heroQuestions.length || !heroQuestion) return;
    heroQuestionIndex = (index + heroQuestions.length) % heroQuestions.length;
    const item = heroQuestions[heroQuestionIndex];
    heroQuestion.classList.remove("is-changing");
    heroQuestion.classList.toggle("is-long", item.question.length > 58);
    heroQuestion.classList.toggle("is-very-long", item.question.length > 72);
    void heroQuestion.offsetWidth;
    if (!reducedMotion) heroQuestion.classList.add("is-changing");
    if (heroQuestionText) heroQuestionText.textContent = item.stem || item.question;
    if (heroQuestionEmphasis) heroQuestionEmphasis.textContent = item.emphasis || "";
    if (heroQuestionLead) heroQuestionLead.textContent = item.lead;
    if (heroQuestionLink) {
      heroQuestionLink.href = item.href || `questions/#${item.id}`;
      heroQuestionLink.setAttribute("aria-label", `Lire la réponse développée : ${item.question}`);
    }
  };

  const restartHeroQuestionTimer = () => {
    if (heroQuestionTimer !== null) window.clearInterval(heroQuestionTimer);
    if (heroQuestions.length < 2 || heroRotationPaused) return;
    heroQuestionTimer = window.setInterval(() => {
      if (!document.hidden) renderHeroQuestion(heroQuestionIndex + 1);
    }, 60000);
  };

  heroQuestion?.addEventListener("pointerenter", () => {
    if (heroQuestionTimer !== null) window.clearInterval(heroQuestionTimer);
  });
  heroQuestion?.addEventListener("pointerleave", restartHeroQuestionTimer);
  renderHeroQuestion(0);
  restartHeroQuestionTimer();

  /* Concrete configurations: two coherent descriptions of one situation. */

  const coherenceCases = Array.isArray(siteData.coherenceCases) ? siteData.coherenceCases : [];
  const coherenceCase = document.querySelector("[data-coherence-case]");
  const coherenceFields = {
    label: document.querySelector("[data-coherence-label]"),
    position: document.querySelector("[data-coherence-position]"),
    situation: document.querySelector("[data-coherence-situation]"),
    leftTitle: document.querySelector("[data-coherence-left-title]"),
    leftText: document.querySelector("[data-coherence-left-text]"),
    rightTitle: document.querySelector("[data-coherence-right-title]"),
    rightText: document.querySelector("[data-coherence-right-text]"),
    relation: document.querySelector("[data-coherence-relation]"),
  };
  const coherencePrevious = document.querySelector("[data-coherence-prev]");
  const coherenceNext = document.querySelector("[data-coherence-next]");
  let coherenceIndex = 0;

  const renderCoherenceCase = (index, { withSound = false } = {}) => {
    if (!coherenceCases.length || !coherenceCase) return;
    coherenceIndex = (index + coherenceCases.length) % coherenceCases.length;
    const item = coherenceCases[coherenceIndex];
    coherenceCase.classList.remove("is-changing");
    void coherenceCase.offsetWidth;
    if (!reducedMotion) coherenceCase.classList.add("is-changing");
    Object.entries(coherenceFields).forEach(([key, element]) => {
      if (!element) return;
      element.textContent = key === "position"
        ? `${coherenceIndex + 1} / ${coherenceCases.length}`
        : item[key];
    });
    if (withSound) playInterfaceSound("coherence-shift");
  };

  coherencePrevious?.addEventListener("click", () => {
    renderCoherenceCase(coherenceIndex - 1, { withSound: true });
  });
  coherenceNext?.addEventListener("click", () => {
    renderCoherenceCase(coherenceIndex + 1, { withSound: true });
  });
  renderCoherenceCase(0);

  /* Collection shelf: one source of truth for this volume and those to come. */

  const collection = window.VIXTA_COLLECTION || {};
  const shelfRow = document.querySelector("[data-book-row]");
  const shelfCaption = document.querySelector("[data-shelf-caption]");
  const bookStatus = document.querySelector("[data-book-status]");
  const publishedBooks = Array.isArray(collection.books)
    ? collection.books.filter((item) => item && item.published !== false)
    : [];

  const createImageSurface = (className, source, width, height) => {
    const surface = document.createElement("span");
    surface.className = `volume-surface ${className}`;
    const image = document.createElement("img");
    image.src = source;
    image.width = width;
    image.height = height;
    image.alt = "";
    image.decoding = "async";
    image.draggable = false;
    surface.append(image);
    return surface;
  };

  const createVolume = (item) => {
    const volume = document.createElement("li");
    volume.className = "shelf-volume";
    if (item.id === collection.featuredBook) volume.classList.add("is-featured");
    volume.dataset.bookId = item.id;
    volume.dataset.bookTitle = item.title;
    volume.dataset.bookNotes = (item.soundProfile || []).join(",");

    const wallShadow = document.createElement("span");
    wallShadow.className = "volume-wall-shadow";
    wallShadow.setAttribute("aria-hidden", "true");
    const contactShadow = document.createElement("span");
    contactShadow.className = "volume-contact-shadow";
    contactShadow.setAttribute("aria-hidden", "true");

    const link = document.createElement("a");
    link.className = "volume-select";
    link.href = item.href || "#edition";
    link.dataset.bookSelect = "";
    link.setAttribute("aria-label", `Voir l’édition du livre ${item.title}`);

    const object = document.createElement("span");
    object.className = "volume-object";
    object.dataset.bookObject = "";
    if (item.render) {
      object.classList.add("volume-object--render");
      const image = document.createElement("img");
      image.className = "volume-render";
      image.src = item.render;
      image.width = item.renderWidth || 740;
      image.height = item.renderHeight || 1221;
      image.alt = "";
      image.decoding = "async";
      image.draggable = false;
      if (item.id === collection.featuredBook) image.setAttribute("fetchpriority", "high");
      object.append(image);
    } else {
      const front = createImageSurface(
        "volume-front",
        item.front,
        item.frontWidth || 1624,
        item.frontHeight || 2500,
      );
      if (item.id === collection.featuredBook) {
        front.querySelector("img")?.setAttribute("fetchpriority", "high");
      }
      object.append(
        front,
        createImageSurface(
          "volume-back",
          item.back,
          item.frontWidth || 1624,
          item.frontHeight || 2500,
        ),
        createImageSurface(
          "volume-spine",
          item.spine,
          item.spineWidth || 120,
          item.frontHeight || 2500,
        ),
      );
      ["volume-fore-edge", "volume-top-edge", "volume-bottom-edge"].forEach((className) => {
        const edge = document.createElement("span");
        edge.className = `volume-surface ${className}`;
        edge.setAttribute("aria-hidden", "true");
        object.append(edge);
      });
    }
    link.append(object);
    volume.append(wallShadow, contactShadow, link);
    return volume;
  };

  if (shelfRow && publishedBooks.length) {
    const fragment = document.createDocumentFragment();
    publishedBooks.forEach((item) => fragment.append(createVolume(item)));
    shelfRow.replaceChildren(fragment);
  }

  const shelfVolumes = shelfRow ? [...shelfRow.querySelectorAll("[data-book-id]")] : [];
  if (shelfRow) shelfRow.dataset.bookCount = String(Math.max(shelfVolumes.length, 1));

  const featuredVolume = shelfVolumes.find(
    (volume) => volume.dataset.bookId === collection.featuredBook,
  ) || shelfVolumes[0];
  const featuredTitle = featuredVolume?.dataset.bookTitle || "Le Point Noir Intersystémique";

  const clearVolumePreview = () => {
    shelfVolumes.forEach((volume) => {
      volume.classList.remove("is-previewed", "is-neighbor-left", "is-neighbor-right");
    });
    if (shelfCaption) shelfCaption.textContent = featuredTitle;
  };

  const previewVolume = (volume, { announce = false } = {}) => {
    const index = shelfVolumes.indexOf(volume);
    if (index < 0) return;
    clearVolumePreview();
    volume.classList.add("is-previewed");
    shelfVolumes[index - 1]?.classList.add("is-neighbor-left");
    shelfVolumes[index + 1]?.classList.add("is-neighbor-right");
    const title = volume.dataset.bookTitle || featuredTitle;
    if (shelfCaption) shelfCaption.textContent = title;
    if (announce && bookStatus) bookStatus.textContent = `${title}, volume sélectionné.`;
  };

  shelfVolumes.forEach((volume) => {
    volume.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "touch") return;
      previewVolume(volume);
      const notes = (volume.dataset.bookNotes || "")
        .split(",")
        .map(Number)
        .filter(Number.isFinite);
      playInterfaceSound("book", { notes });
    });
    volume.addEventListener("pointerleave", () => {
      if (!volume.contains(document.activeElement)) clearVolumePreview();
    });
    volume.addEventListener("focusin", () => {
      previewVolume(volume, { announce: true });
      if (inputMode === "keyboard") {
        const notes = (volume.dataset.bookNotes || "")
          .split(",")
          .map(Number)
          .filter(Number.isFinite);
        playInterfaceSound("book", { notes });
      }
    });
    volume.addEventListener("focusout", (event) => {
      if (!volume.contains(event.relatedTarget)) clearVolumePreview();
    });
    volume.querySelector("[data-book-select]")?.addEventListener("click", () => {
      previewVolume(volume, { announce: true });
    });
  });

  /* Pages 13–19: page image, operative entries and local occurrences. */

  const excerptStudy = window.PNI_EXCERPT_STUDY || { terms: {}, pages: {} };
  const excerptContexts = window.PNI_EXCERPT_CONTEXTS || { pages: {} };
  const viewer = document.querySelector("[data-excerpt-viewer]");
  const excerptImage = document.querySelector("[data-excerpt-image]");
  const excerptLabel = document.querySelector("[data-excerpt-label]");
  const excerptCurrent = document.querySelector("[data-excerpt-current]");
  const excerptPosition = document.querySelector("[data-excerpt-position]");
  const previousButton = document.querySelector("[data-excerpt-prev]");
  const nextButton = document.querySelector("[data-excerpt-next]");
  const pageButtons = [...document.querySelectorAll("[data-excerpt-page]")];
  const excerptPages = Array.from({ length: 7 }, (_, index) => index + 13);
  const excerptWorkbench = document.querySelector("[data-excerpt-workbench]");
  const desktopHotspots = document.querySelector("[data-term-hotspots]");
  const operativePanels = [...document.querySelectorAll("[data-operative-panel]")];
  const desktopPanel = excerptWorkbench?.querySelector("[data-operative-panel]");
  const studyOpenButton = document.querySelector("[data-study-open]");
  const studyOpenLabel = document.querySelector("[data-study-open-label]");
  const viewerHelp = document.querySelector("#excerpt-help");
  const operativeCue = document.querySelector("[data-operative-cue]");
  const studyDialog = document.querySelector("[data-study-dialog]");
  const studyCloseButton = document.querySelector("[data-study-close]");
  const studyPreviousButton = document.querySelector("[data-study-prev]");
  const studyNextButton = document.querySelector("[data-study-next]");
  const studyPageNumber = document.querySelector("[data-study-page-number]");
  const studyImage = document.querySelector("[data-study-image]");
  const studyHotspots = document.querySelector("[data-study-hotspots]");
  const studyPageScroll = document.querySelector(".study-page-scroll");
  const studySheet = document.querySelector("[data-study-sheet]");
  const studySheetToggle = document.querySelector("[data-study-sheet-toggle]");
  const studySheetLabel = studySheetToggle?.querySelector("span:first-child");
  const threadDialog = document.querySelector("[data-thread-dialog]");
  const threadCloseButton = document.querySelector("[data-thread-close]");
  const threadTermSelect = document.querySelector("[data-thread-term-select]");
  const threadBody = document.querySelector("[data-thread-body]");
  const selectionByPage = new Map();
  let currentPageIndex = 0;
  let threadReturnToStudy = false;
  let lastThreadTrigger = null;

  const escapeMarkup = (value = "") => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const categoryLabel = (category) => {
    if (category === "A") return "Catégorie A · terme opératif stabilisé";
    if (category === "B") return "Catégorie B · terme opératif subordonné";
    return "Catégorie C · terme non opératif";
  };

  const categoryExplanation = (category) => {
    if (category === "A") return "A réunit les termes opératifs stabilisés : ce sont les repères structurants dont le déplacement modifierait la cohérence du mouvement.";
    if (category === "B") return "B réunit les termes opératifs subordonnés : leur usage reste précis, mais il s’ajuste au cadre porté par les termes de la catégorie A.";
    return "C réunit les termes non opératifs : ils appartiennent au langage commun, restent ouverts et peuvent apparaître sans porter l’architecture du texte.";
  };

  const pageDataFor = (page) => excerptStudy.pages?.[String(page)] || null;
  const termDataFor = (term) => excerptStudy.terms?.[term] || null;
  const paragraphContextFor = (page, paragraphIndex) => (
    excerptContexts.pages?.[String(page)]?.paragraphs?.[String(paragraphIndex)]
    || excerptContexts.pages?.[page]?.paragraphs?.[paragraphIndex]
    || null
  );
  const hotspotContextFor = (page, hotspotIndex) => (
    excerptContexts.pages?.[String(page)]?.hotspots?.[String(hotspotIndex)]
    || excerptContexts.pages?.[page]?.hotspots?.[hotspotIndex]
    || null
  );

  const renderConstraintList = (items) => items
    .map((item) => `<li>${escapeMarkup(item)}</li>`)
    .join("");

  const renderOperativePanel = (panel, pageNumber, termName, hotspotIndex) => {
    const pageData = pageDataFor(pageNumber);
    const termData = termDataFor(termName);
    if (!panel || !pageData || !termData) return;

    const hotspot = pageData.hotspots?.[hotspotIndex]
      || pageData.hotspots?.find((item) => item.term === termName)
      || null;
    const paragraph = hotspot
      ? pageData.paragraphs?.[hotspot.paragraph] || ""
      : "";
    const paragraphContext = hotspot
      ? paragraphContextFor(pageNumber, hotspot.paragraph)
      : null;
    const resolvedHotspotIndex = hotspot ? pageData.hotspots.indexOf(hotspot) : -1;
    const hotspotContext = resolvedHotspotIndex >= 0
      ? hotspotContextFor(pageNumber, resolvedHotspotIndex)
      : null;
    const occurrenceRole = hotspotContext?.role
      || paragraphContext?.roles?.[termName]
      || termData.function
      || "Cette occurrence conserve le sens local défini par la page et par le régime auquel le terme appartient.";
    const limitsWereOpen = panel.querySelector(".operative-limits")?.open || false;
    const category = termData.category || "C";
    const source = category === "C"
      ? "Statut dans le dictionnaire opératif"
      : `Dictionnaire opératif · Entrée ${termData.entry} · Catégorie ${category}`;
    const definitionLabel = category === "C"
      ? "Position hors du champ opératif"
      : "Définition structurelle stricte";
    const options = pageData.terms
      .map((term) => {
        const data = termDataFor(term);
        const selected = term === termName ? " selected" : "";
        return `<option value="${escapeMarkup(term)}"${selected}>${escapeMarkup(data?.category || "C")} · ${escapeMarkup(term)}</option>`;
      })
      .join("");
    const constraints = category === "C"
      ? `<p class="operative-category-note">«&nbsp;${escapeMarkup(termName)}&nbsp;» relève ici de la catégorie C : son sens demeure ouvert dans le langage commun et ne reçoit pas la fonction structurante d’une entrée opérative.</p>`
      : `
        <details class="operative-limits"${limitsWereOpen ? " open" : ""}>
          <summary>
            <span>Incompatibilités et projections à neutraliser</span>
            <i aria-hidden="true">+</i>
          </summary>
          <div class="operative-constraint-grid">
            <div>
              <h4>Incompatibilités</h4>
              <ul>${renderConstraintList(termData.incompatibilities || [])}</ul>
            </div>
            <div>
              <h4>Projections courantes</h4>
              <ul>${renderConstraintList(termData.projections || [])}</ul>
            </div>
          </div>
          <p class="operative-category-note">Chaque terme apparaît dans un régime précis. Il ne traverse pas les régimes sans déplacement explicite. Si le régime change, le terme se transforme ou disparaît.</p>
        </details>`;

    panel.dataset.category = category.toLowerCase();
    panel.innerHTML = `
      <div class="operative-panel-head">
        <div>
          <p class="operative-panel-mode">Page ${pageNumber} · ${pageData.terms.length} termes repérés</p>
          <label>
            Choisir un terme
            <select data-term-select aria-label="Choisir un terme repéré sur la page ${pageNumber}">
              ${options}
            </select>
          </label>
        </div>
        <span class="operative-page-badge">P. ${pageNumber}</span>
      </div>
      <div class="operative-panel-body">
        <p class="operative-source">${escapeMarkup(source)}</p>
        <h3 class="operative-term">${escapeMarkup(termName)}</h3>
        <section class="operative-reading">
          <p class="operative-section-label">${escapeMarkup(definitionLabel)}</p>
          <p class="operative-definition">${escapeMarkup(termData.definition)}</p>
        </section>
        <section class="operative-occurrence">
          <p class="operative-section-label">Occurrence dans la page</p>
          <blockquote>«&nbsp;${escapeMarkup(paragraph)}&nbsp;»</blockquote>
        </section>
        <section class="operative-context">
          <p class="operative-section-label">Fonction dans cette occurrence</p>
          <p>${escapeMarkup(occurrenceRole)}</p>
        </section>
        <section class="operative-paragraph-scope">
          <p class="operative-section-label">Mouvement du paragraphe</p>
          <p>${escapeMarkup(paragraphContext?.scope || pageData.overview)}</p>
        </section>
        <section class="operative-reading">
          <p class="operative-section-label">Contrainte d’usage locale</p>
          <p>${escapeMarkup(termData.function)}</p>
        </section>
        <section class="operative-page-scope">
          <p class="operative-section-label">Rapport à l’ensemble de la page</p>
          <p>${escapeMarkup(pageData.overview)}</p>
        </section>
        ${constraints}
        <div class="operative-legend" aria-label="Sections A, B et C">
          <span><i></i><b>A</b> · termes opératifs stabilisés</span>
          <span><i></i><b>B</b> · termes opératifs subordonnés</span>
          <span><i></i><b>C</b> · termes non opératifs</span>
        </div>
        <p class="operative-category-explanation">${escapeMarkup(categoryExplanation(category))}</p>
        <button class="term-thread-open" type="button" data-term-thread-open data-term="${escapeMarkup(termName)}">
          <span>Suivre «&nbsp;${escapeMarkup(termName)}&nbsp;» dans les sept pages</span>
          <span aria-hidden="true">↗</span>
        </button>
      </div>`;
  };

  const allExcerptTerms = () => Object.keys(excerptStudy.terms || {}).sort((left, right) => {
    const leftData = termDataFor(left) || {};
    const rightData = termDataFor(right) || {};
    const categoryOrder = { A: 0, B: 1, C: 2 };
    const categoryDifference = (categoryOrder[leftData.category] ?? 3) - (categoryOrder[rightData.category] ?? 3);
    if (categoryDifference) return categoryDifference;
    const entryDifference = Number(leftData.entry || 999) - Number(rightData.entry || 999);
    return entryDifference || left.localeCompare(right, "fr");
  });

  const pageOccurrencesForTerm = (termName) => excerptPages
    .map((pageNumber) => {
      const pageData = pageDataFor(pageNumber);
      const indexedHotspots = (pageData?.hotspots || [])
        .map((hotspot, hotspotIndex) => ({ hotspot, hotspotIndex }))
        .filter(({ hotspot }) => hotspot.term === termName);
      if (!indexedHotspots.length) return null;

      const occurrenceGroups = new Map();
      indexedHotspots.forEach(({ hotspot, hotspotIndex }) => {
        const specificContext = hotspotContextFor(pageNumber, hotspotIndex);
        const occurrenceId = specificContext?.occurrenceId || `hotspot-${hotspotIndex}`;
        if (!occurrenceGroups.has(occurrenceId)) {
          occurrenceGroups.set(occurrenceId, { hotspot, hotspotIndex, specificContext });
        }
      });

      const occurrences = [...occurrenceGroups.values()].map(({ hotspot, specificContext }) => {
        const paragraphIndex = hotspot.paragraph;
        const paragraphContext = paragraphContextFor(pageNumber, paragraphIndex);
        const relatedTerms = [...new Set(
          (pageData.hotspots || [])
            .filter((candidate) => candidate.paragraph === paragraphIndex && candidate.term !== termName)
            .map((candidate) => candidate.term),
        )];
        return {
          paragraph: pageData.paragraphs?.[paragraphIndex] || "",
          scope: paragraphContext?.scope || "",
          role: specificContext?.role
            || paragraphContext?.roles?.[termName]
            || termDataFor(termName)?.function
            || "",
          relatedTerms,
        };
      });

      return {
        pageNumber,
        overview: pageData.overview || "",
        count: occurrences.length,
        occurrences,
      };
    })
    .filter(Boolean);

  const renderTermThread = (termName) => {
    if (!threadBody || !threadTermSelect) return;
    const termData = termDataFor(termName);
    if (!termData) return;
    const terms = allExcerptTerms();
    if (!threadTermSelect.options.length) {
      threadTermSelect.innerHTML = terms
        .map((term) => {
          const data = termDataFor(term) || {};
          return `<option value="${escapeMarkup(term)}">${escapeMarkup(data.category || "C")} · ${escapeMarkup(term)}</option>`;
        })
        .join("");
    }
    threadTermSelect.value = termName;
    const pages = pageOccurrencesForTerm(termName);
    const occurrenceCount = pages.reduce((total, page) => total + page.count, 0);
    const category = termData.category || "C";
    const pageMap = excerptPages.map((pageNumber) => {
      const present = pages.some((page) => page.pageNumber === pageNumber);
      return present
        ? `<button type="button" data-thread-open-page="${pageNumber}" aria-label="Ouvrir la page ${pageNumber}"><strong>${pageNumber}</strong><span>présent</span></button>`
        : `<span aria-label="Terme absent de la page ${pageNumber}"><strong>${pageNumber}</strong><span>—</span></span>`;
    }).join("");
    const pageCards = pages.map((page) => {
      const passages = page.occurrences.map((occurrence) => {
        const related = occurrence.relatedTerms.length
          ? occurrence.relatedTerms.map((relatedTerm) => {
            const relatedData = termDataFor(relatedTerm) || {};
            return `<span data-category="${escapeMarkup((relatedData.category || "C").toLowerCase())}">${escapeMarkup(relatedData.category || "C")} · ${escapeMarkup(relatedTerm)}</span>`;
          }).join("")
          : `<em>Aucun autre terme repéré dans ce paragraphe.</em>`;
        return `
          <div class="thread-passage">
            <blockquote>«&nbsp;${escapeMarkup(occurrence.paragraph)}&nbsp;»</blockquote>
            <div class="thread-occurrence-reading">
              <p>Fonction dans cette occurrence</p>
              <strong>${escapeMarkup(occurrence.role)}</strong>
              <span>${escapeMarkup(occurrence.scope)}</span>
            </div>
            <div class="thread-related">
              <p>Termes présents dans le même paragraphe</p>
              <div>${related}</div>
            </div>
          </div>`;
      }).join("");
      return `
        <article class="thread-page-card">
          <header>
            <span>P. ${page.pageNumber}</span>
            <p>${page.count} occurrence${page.count > 1 ? "s" : ""}</p>
            <button type="button" data-thread-open-page="${page.pageNumber}">Ouvrir cette page →</button>
          </header>
          <div class="thread-page-context">
            <p>Contexte de la page</p>
            <strong>${escapeMarkup(page.overview)}</strong>
          </div>
          ${passages}
        </article>`;
    }).join("");

    threadBody.dataset.category = category.toLowerCase();
    threadBody.innerHTML = `
      <section class="thread-summary">
        <div>
          <p class="thread-category">${escapeMarkup(categoryLabel(category))}</p>
          <h3>${escapeMarkup(termName)}</h3>
          <p class="thread-definition">${escapeMarkup(termData.definition)}</p>
        </div>
        <dl>
          <div><dt>Pages</dt><dd>${pages.length} / ${excerptPages.length}</dd></div>
          <div><dt>Occurrences</dt><dd>${occurrenceCount}</dd></div>
          <div><dt>Section</dt><dd>${escapeMarkup(category)}</dd></div>
        </dl>
      </section>
      <p class="thread-function"><strong>Condition conservée.</strong> ${escapeMarkup(termData.function)}</p>
      <div class="thread-page-map" aria-label="Présence du terme dans les sept pages">${pageMap}</div>
      <div class="thread-pages">${pageCards}</div>`;
  };

  const openTermThread = (termName, trigger) => {
    if (!threadDialog || !termDataFor(termName)) return;
    lastThreadTrigger = trigger || null;
    threadReturnToStudy = Boolean(studyDialog?.open);
    if (threadReturnToStudy) closeStudyDialog({ restoreFocus: false, withSound: false });
    renderTermThread(termName);
    if (typeof threadDialog.showModal === "function") threadDialog.showModal();
    else threadDialog.setAttribute("open", "");
    document.body.classList.add("thread-dialog-open");
    playInterfaceSound("open", { force: true });
    window.requestAnimationFrame(() => threadCloseButton?.focus({ preventScroll: true }));
  };

  const closeTermThread = ({ restoreFocus = true, withSound = true } = {}) => {
    if (!threadDialog) return;
    if (typeof threadDialog.close === "function" && threadDialog.open) threadDialog.close();
    else threadDialog.removeAttribute("open");
    document.body.classList.remove("thread-dialog-open");
    if (withSound) playInterfaceSound("close", { force: true });
    const shouldReturnToStudy = threadReturnToStudy;
    threadReturnToStudy = false;
    if (shouldReturnToStudy) {
      window.setTimeout(() => openStudyDialog({ withSound: false }), 0);
    } else if (restoreFocus) {
      lastThreadTrigger?.focus?.({ preventScroll: true });
    }
  };

  const renderHotspots = (container, pageNumber) => {
    const pageData = pageDataFor(pageNumber);
    if (!container || !pageData) return;
    const fragment = document.createDocumentFragment();
    pageData.hotspots.forEach((hotspot, index) => {
      const termData = termDataFor(hotspot.term);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "term-hotspot";
      button.dataset.termHotspot = "";
      button.dataset.term = hotspot.term;
      button.dataset.category = (termData?.category || "C").toLowerCase();
      button.dataset.hotspotIndex = String(index);
      button.style.left = `${hotspot.x}%`;
      button.style.top = `${hotspot.y}%`;
      button.style.width = `${hotspot.w}%`;
      button.style.height = `${hotspot.h}%`;
      button.setAttribute(
        "aria-label",
        `${hotspot.label} — ${categoryLabel(termData?.category || "C").toLowerCase()}. Afficher la fiche.`,
      );
      button.setAttribute("aria-pressed", "false");
      fragment.append(button);
    });
    container.replaceChildren(fragment);
  };

  const updateHotspotState = (container, selection) => {
    if (!container || !selection) return;
    container.querySelectorAll("[data-term-hotspot]").forEach((button) => {
      const sameTerm = button.dataset.term === selection.term;
      const active = Number(button.dataset.hotspotIndex) === selection.hotspotIndex;
      button.classList.toggle("is-same-term", sameTerm);
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  };

  const selectExcerptTerm = (termName, options = {}) => {
    const pageNumber = excerptPages[currentPageIndex];
    const pageData = pageDataFor(pageNumber);
    const termData = termDataFor(termName);
    if (!pageData || !termData || !pageData.terms.includes(termName)) return;
    const requestedIndex = Number(options.hotspotIndex);
    const hotspotIndex = Number.isInteger(requestedIndex)
      && pageData.hotspots?.[requestedIndex]?.term === termName
      ? requestedIndex
      : pageData.hotspots.findIndex((item) => item.term === termName);
    const selection = { term: termName, hotspotIndex: Math.max(hotspotIndex, 0) };
    selectionByPage.set(pageNumber, selection);
    excerptWorkbench?.setAttribute("data-active-category", termData.category.toLowerCase());
    operativePanels.forEach((panel) => {
      renderOperativePanel(panel, pageNumber, termName, selection.hotspotIndex);
    });
    if (studySheetLabel) studySheetLabel.textContent = `Fiche · ${termName}`;
    updateHotspotState(desktopHotspots, selection);
    updateHotspotState(studyHotspots, selection);
    if (options.revealSheet && studySheet) {
      studySheet.classList.remove("is-collapsed");
      studySheetToggle?.setAttribute("aria-expanded", "true");
      const arrow = studySheetToggle?.querySelector("span:last-child");
      if (arrow) arrow.textContent = "↓";
    }
  };

  let lastHighlighterVariant = -1;
  const nextHighlighterVariant = () => {
    if (highlighterProfiles.length < 2) return 0;
    let variant = Math.floor(Math.random() * highlighterProfiles.length);
    if (variant === lastHighlighterVariant) variant = (variant + 1) % highlighterProfiles.length;
    lastHighlighterVariant = variant;
    return variant;
  };

  const sweepHighlighter = (button, { sound = true } = {}) => {
    if (!button || reducedMotion) return;
    const now = window.performance?.now?.() ?? Date.now();
    const previous = Number(button.dataset.lastHighlighterAt || 0);
    if (now - previous < 140) return;
    button.dataset.lastHighlighterAt = String(now);
    const variant = nextHighlighterVariant();
    const profile = highlighterProfiles[variant];
    const visualWidth = button.getBoundingClientRect?.().width || 64;
    const duration = Math.round(
      Math.max(150, Math.min(285, (112 + visualWidth * 1.35) * (profile.speed || 1))),
    );
    button.style.setProperty("--stroke-angle", `${profile.angle}deg`);
    button.style.setProperty("--stroke-start", `${profile.start}px`);
    button.style.setProperty("--stroke-end", `${profile.end}px`);
    button.style.setProperty("--stroke-y", `${profile.y}px`);
    button.style.setProperty("--stroke-thickness", String(profile.thickness));
    button.style.setProperty("--stroke-duration", `${duration}ms`);
    button.classList.remove("is-highlight-sweeping");
    void button.offsetWidth;
    button.classList.add("is-highlight-sweeping");
    if (sound) playInterfaceSound("highlighter", { variant, duration });
  };

  const attachHotspotEvents = (container) => {
    if (!container) return;
    container.addEventListener("pointerover", (event) => {
      if (event.pointerType === "touch") return;
      const button = event.target.closest("[data-term-hotspot]");
      if (!button || !container.contains(button)) return;
      if (event.relatedTarget && button.contains(event.relatedTarget)) return;
      selectExcerptTerm(button.dataset.term, {
        hotspotIndex: Number(button.dataset.hotspotIndex),
        revealSheet: true,
      });
      sweepHighlighter(button);
    });
    container.addEventListener("pointerout", (event) => {
      if (event.pointerType === "touch") return;
      const button = event.target.closest("[data-term-hotspot]");
      if (!button || !container.contains(button)) return;
      if (event.relatedTarget && button.contains(event.relatedTarget)) return;
      button.classList.remove("is-highlight-sweeping");
    });
    container.addEventListener("focusin", (event) => {
      const button = event.target.closest("[data-term-hotspot]");
      if (!button || !container.contains(button)) return;
      selectExcerptTerm(button.dataset.term, {
        hotspotIndex: Number(button.dataset.hotspotIndex),
        revealSheet: true,
      });
    });
    container.addEventListener("click", (event) => {
      const button = event.target.closest("[data-term-hotspot]");
      if (!button || !container.contains(button)) return;
      selectExcerptTerm(button.dataset.term, {
        hotspotIndex: Number(button.dataset.hotspotIndex),
        revealSheet: true,
      });
    });
  };

  operativePanels.forEach((panel) => {
    panel.addEventListener("change", (event) => {
      const select = event.target.closest("[data-term-select]");
      if (!select || !panel.contains(select)) return;
      selectExcerptTerm(select.value, { revealSheet: true });
    });
    panel.addEventListener("click", (event) => {
      const button = event.target.closest("[data-term-thread-open]");
      if (!button || !panel.contains(button)) return;
      openTermThread(button.dataset.term, button);
    });
  });
  attachHotspotEvents(desktopHotspots);
  attachHotspotEvents(studyHotspots);

  const readSavedExcerptPage = () => {
    try {
      return Number(window.sessionStorage.getItem("point-noir-excerpt-page"));
    } catch {
      return 0;
    }
  };

  const preloadExcerptPage = (page) => {
    if (!excerptPages.includes(page)) return;
    const image = new Image();
    image.src = `assets/extrait-page-${page}.webp`;
  };

  const showExcerptPage = (index) => {
    const boundedIndex = Math.max(0, Math.min(index, excerptPages.length - 1));
    const page = excerptPages[boundedIndex];
    const pageData = pageDataFor(page);
    currentPageIndex = boundedIndex;

    if (excerptImage) {
      excerptImage.src = `assets/extrait-page-${page}.webp`;
      excerptImage.alt = `Page ${page} du livre Le Point Noir Intersystémique`;
    }
    if (studyImage) {
      studyImage.src = `assets/extrait-page-${page}.webp`;
      studyImage.alt = `Page ${page} du livre Le Point Noir Intersystémique, mode d’étude`;
    }
    if (excerptLabel) excerptLabel.textContent = `EXTRAIT · P. ${page}`;
    if (excerptCurrent) excerptCurrent.textContent = String(page);
    if (excerptPosition) excerptPosition.textContent = `${boundedIndex + 1} / ${excerptPages.length}`;
    if (studyPageNumber) studyPageNumber.textContent = String(page);
    if (previousButton) previousButton.disabled = boundedIndex === 0;
    if (nextButton) nextButton.disabled = boundedIndex === excerptPages.length - 1;
    if (studyPreviousButton) studyPreviousButton.disabled = boundedIndex === 0;
    if (studyNextButton) studyNextButton.disabled = boundedIndex === excerptPages.length - 1;

    pageButtons.forEach((button) => {
      const active = Number(button.dataset.excerptPage) === page;
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });

    renderHotspots(desktopHotspots, page);
    renderHotspots(studyHotspots, page);
    const remembered = selectionByPage.get(page);
    const defaultTerm = remembered?.term && pageData?.terms.includes(remembered.term)
      ? remembered.term
      : pageData?.terms?.[0];
    if (defaultTerm) {
      selectExcerptTerm(defaultTerm, {
        hotspotIndex: remembered?.hotspotIndex,
      });
    }

    try {
      window.sessionStorage.setItem("point-noir-excerpt-page", String(page));
    } catch {
      // The excerpt remains usable when session storage is unavailable.
    }

    preloadExcerptPage(excerptPages[boundedIndex - 1]);
    preloadExcerptPage(excerptPages[boundedIndex + 1]);
  };

  const studyDesktopQuery = window.matchMedia?.("(min-width: 941px)");

  const setDesktopStudyMode = (active) => {
    if (!excerptWorkbench || !studyOpenButton) return;
    excerptWorkbench.classList.toggle("is-study-active", active);
    studyOpenButton.setAttribute("aria-pressed", String(active));
    desktopPanel?.setAttribute("aria-hidden", String(!active));
    if (studyOpenLabel) studyOpenLabel.textContent = active
      ? "Refermer la lecture opérative"
      : "Activer la lecture opérative";
    if (operativeCue) operativeCue.hidden = !active;
    if (viewerHelp) viewerHelp.textContent = active
      ? "Les traits fins signalent les termes étudiés. Les flèches gauche et droite changent de page."
      : "Les flèches gauche et droite changent de page. La lecture opérative reste désactivée tant que vous ne l’ouvrez pas.";
    if (active) {
      playInterfaceSound("study-open", { force: true });
    } else {
      playInterfaceSound("study-close", { force: true });
    }
  };

  const setStudySheetCollapsed = (collapsed) => {
    if (!studySheet || !studySheetToggle) return;
    studySheet.classList.toggle("is-collapsed", collapsed);
    studySheetToggle.setAttribute("aria-expanded", String(!collapsed));
    const arrow = studySheetToggle.querySelector("span:last-child");
    if (arrow) arrow.textContent = collapsed ? "↑" : "↓";
  };

  const openStudyDialog = ({ withSound = true } = {}) => {
    if (!studyDialog) return;
    if (typeof studyDialog.showModal === "function") studyDialog.showModal();
    else studyDialog.setAttribute("open", "");
    document.body.classList.add("study-dialog-open");
    setStudySheetCollapsed(true);
    studyOpenButton?.setAttribute("aria-pressed", "true");
    if (studyOpenLabel) studyOpenLabel.textContent = "Lecture opérative ouverte";
    if (withSound) playInterfaceSound("study-open", { force: true });
    window.requestAnimationFrame(() => {
      if (studyPageScroll) {
        studyPageScroll.scrollTop = 0;
        studyPageScroll.scrollLeft = 0;
      }
      studyCloseButton?.focus({ preventScroll: true });
    });
  };

  const closeStudyDialog = ({ restoreFocus = true, withSound = true } = {}) => {
    if (!studyDialog) return;
    if (typeof studyDialog.close === "function" && studyDialog.open) studyDialog.close();
    else studyDialog.removeAttribute("open");
    document.body.classList.remove("study-dialog-open");
    studyOpenButton?.setAttribute("aria-pressed", "false");
    if (studyOpenLabel) studyOpenLabel.textContent = studyDesktopQuery?.matches
      ? "Activer la lecture opérative"
      : "Ouvrir la lecture opérative";
    if (withSound) playInterfaceSound("study-close", { force: true });
    if (restoreFocus) studyOpenButton?.focus({ preventScroll: true });
  };

  studyOpenButton?.addEventListener("click", () => {
    if (studyDesktopQuery?.matches) {
      setDesktopStudyMode(!excerptWorkbench?.classList.contains("is-study-active"));
    } else {
      openStudyDialog();
    }
  });
  studyCloseButton?.addEventListener("click", () => closeStudyDialog());
  studySheetToggle?.addEventListener("click", () => {
    setStudySheetCollapsed(!studySheet?.classList.contains("is-collapsed"));
  });
  studyPreviousButton?.addEventListener("click", () => showExcerptPage(currentPageIndex - 1));
  studyNextButton?.addEventListener("click", () => showExcerptPage(currentPageIndex + 1));
  studyDialog?.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeStudyDialog();
  });
  studyDialog?.addEventListener("click", (event) => {
    if (event.target === studyDialog) closeStudyDialog();
  });
  studyDialog?.addEventListener("close", () => {
    document.body.classList.remove("study-dialog-open");
  });

  const handleStudyViewportChange = () => {
    if (studyDialog?.open) closeStudyDialog({ restoreFocus: false, withSound: false });
    setDesktopStudyMode(false);
    if (studyOpenLabel && !studyDesktopQuery?.matches) studyOpenLabel.textContent = "Ouvrir la lecture opérative";
  };
  studyDesktopQuery?.addEventListener?.("change", handleStudyViewportChange);
  setDesktopStudyMode(false);
  if (studyOpenLabel && !studyDesktopQuery?.matches) studyOpenLabel.textContent = "Ouvrir la lecture opérative";

  threadCloseButton?.addEventListener("click", () => closeTermThread());
  threadTermSelect?.addEventListener("change", () => {
    renderTermThread(threadTermSelect.value);
    playInterfaceSound(`term-${(termDataFor(threadTermSelect.value)?.category || "C").toLowerCase()}`);
  });
  threadBody?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-thread-open-page]");
    if (!button || !threadBody.contains(button)) return;
    const pageNumber = Number(button.dataset.threadOpenPage);
    const pageIndex = excerptPages.indexOf(pageNumber);
    if (pageIndex < 0) return;
    const returnsToStudy = threadReturnToStudy;
    showExcerptPage(pageIndex);
    closeTermThread({ restoreFocus: false });
    if (!returnsToStudy) {
      window.setTimeout(() => excerptWorkbench?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" }), 0);
    }
  });
  threadDialog?.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeTermThread();
  });
  threadDialog?.addEventListener("click", (event) => {
    if (event.target === threadDialog) closeTermThread();
  });
  threadDialog?.addEventListener("close", () => {
    document.body.classList.remove("thread-dialog-open");
  });

  previousButton?.addEventListener("click", () => showExcerptPage(currentPageIndex - 1));
  nextButton?.addEventListener("click", () => showExcerptPage(currentPageIndex + 1));
  pageButtons.forEach((button) => {
    button.addEventListener("click", () => {
      showExcerptPage(excerptPages.indexOf(Number(button.dataset.excerptPage)));
    });
  });

  viewer?.addEventListener("keydown", (event) => {
    if (event.target !== viewer) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      playInterfaceSound("page");
      showExcerptPage(currentPageIndex - 1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      playInterfaceSound("page");
      showExcerptPage(currentPageIndex + 1);
    }
  });

  if (viewer) {
    viewer.tabIndex = 0;
    viewer.setAttribute("aria-describedby", "excerpt-help");
    const savedPage = readSavedExcerptPage();
    const savedIndex = excerptPages.indexOf(savedPage);
    showExcerptPage(savedIndex >= 0 ? savedIndex : 0);
  }

  const copyText = async (value) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }

    const field = document.createElement("textarea");
    field.value = value;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.append(field);
    field.select();
    document.execCommand("copy");
    field.remove();
  };

  const emailAddress = document.querySelector("[data-email-address]")?.textContent?.trim()
    || "sekaii.philo@gmail.com";
  const emailCopyButtons = [...document.querySelectorAll("[data-copy-email]")];
  const emailCopyStatus = document.querySelector("[data-email-copy-status]");
  let emailCopyStatusTimer = null;

  emailCopyButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await copyText(emailAddress);
        if (emailCopyStatus) emailCopyStatus.textContent = `Adresse copiée : ${emailAddress}`;
        playInterfaceSound("confirm", { force: true });
      } catch {
        if (emailCopyStatus) {
          emailCopyStatus.textContent = `Copie impossible. Sélectionnez directement : ${emailAddress}`;
        }
      }
      window.clearTimeout(emailCopyStatusTimer);
      emailCopyStatusTimer = window.setTimeout(() => {
        if (emailCopyStatus) emailCopyStatus.textContent = "";
      }, 5000);
    });
  });

  const status = document.querySelector("[data-action-status]");
  let statusTimer = null;
  const setStatus = (message) => {
    if (!status) return;
    status.textContent = message;
    window.clearTimeout(statusTimer);
    statusTimer = window.setTimeout(() => {
      status.textContent = "";
    }, 4500);
  };

  const shareButton = document.querySelector("[data-share-page]");
  if (shareButton) {
    shareButton.hidden = false;
    shareButton.addEventListener("click", async () => {
      const canonicalUrl = document.querySelector('link[rel="canonical"]')?.href;
      const shareData = {
        title: "Le Point Noir Intersystémique — Vixta",
        text: "Le dialogue doit-il nécessairement produire un accord ?",
        url: canonicalUrl || window.location.href.split("#")[0],
      };

      try {
        if (navigator.share) {
          await navigator.share(shareData);
          setStatus("Page partagée.");
          playInterfaceSound("confirm");
        } else {
          await copyText(shareData.url);
          setStatus("Lien de la page copié.");
          playInterfaceSound("confirm");
        }
      } catch (error) {
        if (error?.name === "AbortError") return;
        try {
          await copyText(shareData.url);
          setStatus("Le partage n’a pas pu s’ouvrir ; le lien a été copié.");
          playInterfaceSound("confirm");
        } catch {
          setStatus("Le partage n’a pas pu être ouvert.");
        }
      }
    });
  }

  const contactDialog = document.querySelector("[data-contact-dialog]");
  const contactOpenButtons = [...document.querySelectorAll("[data-contact-open]")];
  const contactCloseButton = document.querySelector("[data-contact-close]");
  const contactForm = document.querySelector("[data-contact-form]");
  const contactSubmit = document.querySelector("[data-contact-submit]");
  const contactStatus = document.querySelector("[data-contact-status]");
  let lastContactTrigger = null;

  const setContactStatus = (message, state = "") => {
    if (!contactStatus) return;
    contactStatus.textContent = message;
    contactStatus.dataset.state = state;
  };

  const openContactDialog = (trigger) => {
    if (!contactDialog) return;
    lastContactTrigger = trigger || null;
    setContactStatus("");
    if (typeof contactDialog.showModal === "function") contactDialog.showModal();
    else contactDialog.setAttribute("open", "");
    document.body.classList.add("contact-dialog-open");
    playInterfaceSound("open", { force: true });
    window.requestAnimationFrame(() => contactDialog.querySelector("input:not([type='hidden'])")?.focus({ preventScroll: true }));
  };

  const closeContactDialog = ({ restoreFocus = true, withSound = true } = {}) => {
    if (!contactDialog) return;
    if (typeof contactDialog.close === "function" && contactDialog.open) contactDialog.close();
    else contactDialog.removeAttribute("open");
    document.body.classList.remove("contact-dialog-open");
    if (withSound) playInterfaceSound("close", { force: true });
    if (restoreFocus) lastContactTrigger?.focus?.({ preventScroll: true });
  };

  contactOpenButtons.forEach((button) => {
    button.addEventListener("click", () => openContactDialog(button));
  });
  contactCloseButton?.addEventListener("click", () => closeContactDialog());
  contactDialog?.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeContactDialog();
  });
  contactDialog?.addEventListener("click", (event) => {
    if (event.target === contactDialog) closeContactDialog();
  });
  contactDialog?.addEventListener("close", () => {
    document.body.classList.remove("contact-dialog-open");
  });

  contactForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!contactForm.checkValidity()) {
      contactForm.reportValidity();
      setContactStatus("Vérifiez les champs requis avant l’envoi.", "error");
      return;
    }

    const initialLabel = contactSubmit?.innerHTML;
    if (contactSubmit) {
      contactSubmit.disabled = true;
      contactSubmit.textContent = "Envoi en cours…";
    }
    setContactStatus("Transmission du message…", "pending");

    try {
      const response = await fetch(contactForm.action, {
        method: "POST",
        body: new FormData(contactForm),
        headers: { Accept: "application/json" },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false) throw new Error("form_delivery_failed");
      contactForm.reset();
      setContactStatus("Votre message a bien été transmis à Vixta.", "success");
      playInterfaceSound("confirm", { force: true });
    } catch {
      setContactStatus(
        "Le message n’a pas pu être transmis. Vous pouvez réessayer dans quelques instants ou écrire à sekaii.philo@gmail.com.",
        "error",
      );
    } finally {
      if (contactSubmit) {
        contactSubmit.disabled = false;
        contactSubmit.innerHTML = initialLabel || "Envoyer le message <span aria-hidden='true'>→</span>";
      }
    }
  });

  const analysisDisclosure = document.querySelector("[data-analysis-disclosure]");
  const analysisSummary = analysisDisclosure?.querySelector(":scope > summary");
  const analysisClose = document.querySelector("[data-analysis-close]");

  if (analysisClose) {
    analysisClose.hidden = false;
    analysisClose.addEventListener("click", () => {
      if (!analysisDisclosure) return;
      analysisDisclosure.open = false;
      analysisSummary?.focus({ preventScroll: true });
      analysisDisclosure.scrollIntoView?.({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
    });
  }
})();
