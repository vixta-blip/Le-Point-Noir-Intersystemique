/* Raffinement du gabarit photographique : cadre éditorial, ombres courtes,
   alignements précis et mouvement sans simulation de volume. */

.book-stage {
  --photo-width: clamp(310px, 24.5vw, 370px);
}

.shelf-scene {
  --volume-width: var(--photo-width);
  min-height: 548px;
  perspective: none;
}

.shelf-scene::before {
  top: 48.6%;
  width: calc(var(--photo-width) - 2px);
  aspect-ratio: 3 / 4;
  border: 1px solid rgba(65, 47, 55, 0.42);
  border-radius: 5px;
  background: rgba(255, 250, 248, 0.06);
  box-shadow: none;
  transform: translate(-46%, -48%) rotate(2.15deg);
  opacity: 0.74;
}

.shelf-light {
  top: -8%;
  left: 57%;
  width: 72%;
  opacity: 0.74;
  filter: blur(22px);
}

.volume-select {
  border-radius: 6px;
  transform: translate3d(-2px, 0, 0) rotate(-0.72deg);
  transform-origin: 50% 66%;
  transition: transform 560ms cubic-bezier(0.16, 1, 0.3, 1), filter 560ms ease;
}

.volume-object--render {
  overflow: hidden;
  border: 5px solid rgba(255, 250, 248, 0.84);
  border-radius: 6px;
  background: #d5bec9;
  box-shadow:
    0 24px 42px rgba(45, 30, 36, 0.2),
    0 7px 15px rgba(45, 30, 36, 0.12),
    0 0 0 1px rgba(65, 47, 55, 0.08);
}

.volume-object--render::after {
  inset: 0;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 1px;
  background: linear-gradient(118deg, rgba(255, 255, 255, 0.08), transparent 30%, transparent 82%, rgba(38, 25, 31, 0.045));
}

.volume-render {
  border-radius: 1px;
  filter: saturate(0.96) contrast(1.025) brightness(1.015);
  transform: none;
  transition: transform 680ms cubic-bezier(0.16, 1, 0.3, 1), filter 680ms ease;
}

.shelf-volume:hover .volume-select,
.shelf-volume:focus-within .volume-select,
.shelf-volume.is-previewed .volume-select {
  filter: drop-shadow(0 13px 16px rgba(45, 30, 36, 0.09));
  transform: translate3d(0, -8px, 0) rotate(-0.18deg);
}

.shelf-volume:hover .volume-render,
.shelf-volume:focus-within .volume-render,
.shelf-volume.is-previewed .volume-render {
  filter: saturate(0.99) contrast(1.035) brightness(1.015);
  transform: scale(1.009);
}

.shelf-caption {
  position: relative;
  width: min(100%, 448px);
  max-width: none;
  margin-top: 0.35rem;
  padding-top: 0.85rem;
  border-color: rgba(65, 47, 55, 0.28);
}

.shelf-caption::before {
  position: absolute;
  top: -1px;
  left: 0;
  width: 54px;
  height: 1px;
  background: var(--plum-dark);
  content: "";
}

.shelf-caption p {
  line-height: 1.48;
}

.material-note {
  padding: 0;
  color: #5f4a55;
  background: transparent;
  border: 0;
  border-radius: 0;
  font-size: 0.64rem;
  letter-spacing: 0.045em;
}

.sound-toggle {
  min-width: 106px;
  min-height: 36px;
  padding: 0.45rem 0.66rem;
  color: #604d57;
  background: rgba(255, 250, 248, 0.52);
  border-color: rgba(65, 47, 55, 0.2);
  box-shadow: 0 4px 12px rgba(45, 30, 36, 0.04);
}

@media (max-width: 940px) {
  .book-stage {
    --photo-width: clamp(315px, 54vw, 365px);
  }

  .shelf-scene {
    min-height: 530px;
  }
}

@media (max-width: 680px) {
  .book-stage {
    --photo-width: min(84vw, 336px);
  }

  .shelf-scene {
    min-height: calc(var(--volume-height) + 47px);
  }

  .shelf-scene::before {
    transform: translate(-46%, -48%) rotate(1.65deg);
  }

  .volume-select {
    transform: translate3d(-1px, 0, 0) rotate(-0.48deg);
  }

  .shelf-caption {
    width: min(94%, 390px);
  }
}

@media (max-width: 390px) {
  .book-stage {
    --photo-width: min(82vw, 308px);
  }

  .shelf-caption {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .shelf-controls {
    justify-content: space-between;
  }
}

@media (prefers-reduced-motion: reduce) {
  .volume-select,
  .volume-render {
    transition: none;
  }
}
