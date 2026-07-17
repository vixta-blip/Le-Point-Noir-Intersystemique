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
    if (event.key === "Escape") setMenuOpen(false);
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

  const viewport = document.querySelector("[data-book-viewport]");
  const book = document.querySelector("[data-book-object]");
  const spinButton = document.querySelector("[data-book-spin]");
  const spinLabel = document.querySelector("[data-book-spin-label]");
  const resetButton = document.querySelector("[data-book-reset]");
  const bookStatus = document.querySelector("[data-book-status]");
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

  if (viewport && book) {
    const initialRotation = { x: -4, y: -18 };
    let rotationX = initialRotation.x;
    let rotationY = initialRotation.y;
    let pointerId = null;
    let previousPointerX = 0;
    let previousPointerY = 0;
    let previousPointerTime = 0;
    let velocityX = 0;
    let velocityY = 0;
    let motionFrame = null;
    let motionMode = "idle";
    let previousFrameTime = 0;

    const clampTilt = (value) => Math.max(-34, Math.min(34, value));

    const renderBook = () => {
      book.style.transform = `rotateX(${rotationX.toFixed(2)}deg) rotateY(${rotationY.toFixed(2)}deg)`;
    };

    const announceBook = (message) => {
      if (bookStatus) bookStatus.textContent = message;
    };

    const setSpinButton = (spinning) => {
      if (!spinButton) return;
      spinButton.setAttribute("aria-pressed", String(spinning));
      if (spinLabel) spinLabel.textContent = spinning ? "Arrêter" : "Faire tourner";
    };

    const stopMotion = () => {
      if (motionFrame !== null) window.cancelAnimationFrame(motionFrame);
      motionFrame = null;
      motionMode = "idle";
      previousFrameTime = 0;
      book.classList.remove("is-spinning");
      setSpinButton(false);
    };

    const startAutomaticRotation = () => {
      stopMotion();
      if (reducedMotion) {
        announceBook("La rotation automatique est désactivée lorsque les animations sont réduites.");
        return;
      }

      motionMode = "automatic";
      book.classList.add("is-spinning");
      setSpinButton(true);
      announceBook("Rotation automatique en cours.");

      const rotate = (time) => {
        if (motionMode !== "automatic") return;
        if (previousFrameTime === 0) previousFrameTime = time;
        const elapsed = Math.min(time - previousFrameTime, 34);
        previousFrameTime = time;
        rotationY += elapsed * 0.025;
        renderBook();
        motionFrame = window.requestAnimationFrame(rotate);
      };

      motionFrame = window.requestAnimationFrame(rotate);
    };

    const startInertia = () => {
      if (reducedMotion || Math.hypot(velocityX, velocityY) < 0.025) return;
      stopMotion();
      motionMode = "inertia";
      book.classList.add("is-spinning");

      const glide = (time) => {
        if (motionMode !== "inertia") return;
        if (previousFrameTime === 0) previousFrameTime = time;
        const elapsed = Math.min(time - previousFrameTime, 34);
        previousFrameTime = time;
        rotationY += velocityX * elapsed;
        rotationX = clampTilt(rotationX + velocityY * elapsed);
        const damping = Math.pow(0.91, elapsed / 16.67);
        velocityX *= damping;
        velocityY *= damping;
        renderBook();

        if (Math.hypot(velocityX, velocityY) < 0.005) {
          stopMotion();
          return;
        }
        motionFrame = window.requestAnimationFrame(glide);
      };

      motionFrame = window.requestAnimationFrame(glide);
    };

    const resetBook = (announce = true) => {
      stopMotion();
      rotationX = initialRotation.x;
      rotationY = initialRotation.y;
      renderBook();
      if (announce) announceBook("Livre recentré sur la première de couverture.");
    };

    viewport.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || pointerId !== null) return;
      stopMotion();
      pointerId = event.pointerId;
      previousPointerX = event.clientX;
      previousPointerY = event.clientY;
      previousPointerTime = event.timeStamp;
      velocityX = 0;
      velocityY = 0;
      viewport.setPointerCapture?.(event.pointerId);
      viewport.classList.add("is-dragging");
    });

    viewport.addEventListener("pointermove", (event) => {
      if (event.pointerId !== pointerId) return;
      const elapsed = Math.max(event.timeStamp - previousPointerTime, 8);
      const deltaX = event.clientX - previousPointerX;
      const deltaY = event.clientY - previousPointerY;
      const rotationDeltaX = deltaX * 0.42;
      const rotationDeltaY = -deltaY * 0.28;

      rotationY += rotationDeltaX;
      rotationX = clampTilt(rotationX + rotationDeltaY);
      velocityX = rotationDeltaX / elapsed;
      velocityY = rotationDeltaY / elapsed;
      previousPointerX = event.clientX;
      previousPointerY = event.clientY;
      previousPointerTime = event.timeStamp;
      renderBook();
    });

    const releasePointer = (event) => {
      if (event.pointerId !== pointerId) return;
      viewport.releasePointerCapture?.(event.pointerId);
      pointerId = null;
      viewport.classList.remove("is-dragging");
      startInertia();
    };

    viewport.addEventListener("pointerup", releasePointer);
    viewport.addEventListener("pointercancel", releasePointer);

    viewport.addEventListener("keydown", (event) => {
      const step = event.shiftKey ? 24 : 12;
      let handled = true;
      stopMotion();

      if (event.key === "ArrowLeft") rotationY -= step;
      else if (event.key === "ArrowRight") rotationY += step;
      else if (event.key === "ArrowUp") rotationX = clampTilt(rotationX - step);
      else if (event.key === "ArrowDown") rotationX = clampTilt(rotationX + step);
      else if (event.key === "Home") resetBook(false);
      else if (event.key === " " && !reducedMotion) startAutomaticRotation();
      else handled = false;

      if (!handled) return;
      event.preventDefault();
      renderBook();
      announceBook(`Orientation du livre : inclinaison ${Math.round(rotationX)} degrés, rotation ${Math.round(rotationY)} degrés.`);
    });

    spinButton?.addEventListener("click", () => {
      if (motionMode === "automatic") {
        stopMotion();
        announceBook("Rotation arrêtée.");
      } else {
        startAutomaticRotation();
      }
    });

    resetButton?.addEventListener("click", () => resetBook());

    if (reducedMotion && spinButton) spinButton.hidden = true;
    renderBook();
  }

  const viewer = document.querySelector("[data-excerpt-viewer]");
  const excerptImage = document.querySelector("[data-excerpt-image]");
  const excerptLabel = document.querySelector("[data-excerpt-label]");
  const excerptCurrent = document.querySelector("[data-excerpt-current]");
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
      showExcerptPage(currentPageIndex - 1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      showExcerptPage(currentPageIndex + 1);
    }
  });

  if (viewer) {
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
      const shareData = {
        title: "Le Point Noir Intersystémique — Vixta",
        text: "Le dialogue doit-il nécessairement produire un accord ?",
        url: window.location.href.split("#")[0],
      };

      try {
        if (navigator.share) {
          await navigator.share(shareData);
          setStatus("Page partagée.");
        } else {
          await copyText(shareData.url);
          setStatus("Lien de la page copié.");
        }
      } catch (error) {
        if (error?.name === "AbortError") return;
        try {
          await copyText(shareData.url);
          setStatus("Le partage n’a pas pu s’ouvrir ; le lien a été copié.");
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
