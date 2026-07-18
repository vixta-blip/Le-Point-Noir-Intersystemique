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
      masterGain.gain.value = 0.18;

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
    const length = Math.max(1, Math.round(sampleRate * 0.16));
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

  const scheduleNoise = ({ offset = 0, duration = 0.11, level = 0.075 } = {}) => {
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
      setAudioParam(filter.frequency, "setValueAtTime", 1450, startsAt);
      setAudioParam(filter.frequency, "exponentialRampToValueAtTime", 760, startsAt + duration);
      setAudioParam(filter.Q, "setValueAtTime", 0.72, startsAt);
      source.connect(filter);
      filter.connect(envelope);
    } else {
      source.connect(envelope);
    }
    envelope.connect(masterGain);
    source.start(startsAt);
    source.stop(startsAt + duration + 0.015);
  };

  const renderInterfaceSound = (kind, options = {}) => {
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
    "[data-excerpt-viewer]",
    "[role='button']",
  ].join(",");

  const closestInteractive = (target) => target?.closest?.(interactiveSelector) || null;

  const activationSoundFor = (control) => {
    if (!control || control.matches("[data-book-select]")) return null;
    if (control.matches("[data-excerpt-prev], [data-excerpt-next], [data-excerpt-page]")) {
      return "page";
    }
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
    if (!control || control.matches("[data-book-select]")) return;
    if (event.relatedTarget && control.contains(event.relatedTarget)) return;
    playInterfaceSound("hover");
  });

  document.addEventListener("focusin", (event) => {
    if (!audioUnlocked || inputMode !== "keyboard") return;
    const control = closestInteractive(event.target);
    if (!control || control.matches("[data-book-select]")) return;
    playInterfaceSound("hover");
  });

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

  const previewVolume = (volume, { announce = false, withSound = false } = {}) => {
    const index = shelfVolumes.indexOf(volume);
    if (index < 0) return;
    clearVolumePreview();
    volume.classList.add("is-previewed");
    shelfVolumes[index - 1]?.classList.add("is-neighbor-left");
    shelfVolumes[index + 1]?.classList.add("is-neighbor-right");
    const title = volume.dataset.bookTitle || featuredTitle;
    if (shelfCaption) shelfCaption.textContent = title;
    if (announce && bookStatus) bookStatus.textContent = `${title}, volume sélectionné.`;
    if (withSound) {
      const notes = (volume.dataset.bookNotes || "")
        .split(",")
        .map(Number)
        .filter(Number.isFinite);
      playInterfaceSound("book", { notes });
    }
  };

  shelfVolumes.forEach((volume) => {
    volume.addEventListener("pointerenter", (event) => {
      previewVolume(volume, { withSound: event.pointerType !== "touch" });
    });
    volume.addEventListener("pointerleave", () => {
      if (!volume.contains(document.activeElement)) clearVolumePreview();
    });
    volume.addEventListener("focusin", () => {
      previewVolume(volume, { announce: true, withSound: true });
    });
    volume.addEventListener("focusout", (event) => {
      if (!volume.contains(event.relatedTarget)) clearVolumePreview();
    });
    volume.querySelector("[data-book-select]")?.addEventListener("click", () => {
      previewVolume(volume, { announce: true, withSound: true });
    });
  });

  const viewer = document.querySelector("[data-excerpt-viewer]");
  const excerptImage = document.querySelector("[data-excerpt-image]");
  const excerptLabel = document.querySelector("[data-excerpt-label]");
  const excerptCurrent = document.querySelector("[data-excerpt-current]");
  const excerptPosition = document.querySelector("[data-excerpt-position]");
  const previousButton = document.querySelector("[data-excerpt-prev]");
  const nextButton = document.querySelector("[data-excerpt-next]");
  const pageButtons = [...document.querySelectorAll("[data-excerpt-page]")];
  const excerptPages = Array.from({ length: 7 }, (_, index) => index + 13);
  let currentPageIndex = 0;

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
    currentPageIndex = boundedIndex;

    if (excerptImage) {
      excerptImage.src = `assets/extrait-page-${page}.webp`;
      excerptImage.alt = `Page ${page} du livre Le Point Noir Intersystémique`;
    }
    if (excerptLabel) excerptLabel.textContent = `EXTRAIT · P. ${page}`;
    if (excerptCurrent) excerptCurrent.textContent = String(page);
    if (excerptPosition) excerptPosition.textContent = `${boundedIndex + 1} / ${excerptPages.length}`;
    if (previousButton) previousButton.disabled = boundedIndex === 0;
    if (nextButton) nextButton.disabled = boundedIndex === excerptPages.length - 1;

    pageButtons.forEach((button) => {
      const active = Number(button.dataset.excerptPage) === page;
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });

    try {
      window.sessionStorage.setItem("point-noir-excerpt-page", String(page));
    } catch {
      // The excerpt remains usable when session storage is unavailable.
    }

    preloadExcerptPage(excerptPages[boundedIndex - 1]);
    preloadExcerptPage(excerptPages[boundedIndex + 1]);
  };

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
