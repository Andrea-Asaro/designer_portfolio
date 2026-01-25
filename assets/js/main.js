/* Carousel: infinite loop + center-weight scaling (progressive enhancement) */
document.addEventListener("DOMContentLoaded", () => {
    const scroller = document.getElementById("workScroller");
    if (!scroller) return;
  
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  
    /* Setup: clone items before + after to create a seamless loop */
    const originals = Array.from(scroller.querySelectorAll(".work-card"));
    const originalCount = originals.length;
    const initialIndex = originals.findIndex((el) => el.dataset.initial === "true");
  
    const cloneSet = () =>
      originals.map((el) => {
        const c = el.cloneNode(true);
        c.removeAttribute("data-initial");
        return c;
      });
  
    const fragBefore = document.createDocumentFragment();
    const fragAfter = document.createDocumentFragment();
  
    cloneSet().forEach((node) => fragBefore.appendChild(node));
    cloneSet().forEach((node) => fragAfter.appendChild(node));
  
    scroller.prepend(fragBefore);
    scroller.append(fragAfter);
  
    let cards = Array.from(scroller.querySelectorAll(".work-card"));
    const middleStart = originalCount;
    const middleEnd = originalCount * 2;
  
    const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  
    const measureSetWidth = () =>
      cards
        .slice(middleStart, middleEnd)
        .reduce((sum, el) => sum + el.offsetWidth, 0);
  
    let setWidth = 0;
  
    const centerCard = (card, smooth) => {
      const left = card.offsetLeft + card.offsetWidth / 2 - scroller.clientWidth / 2;
      scroller.scrollTo({ left, behavior: smooth ? "smooth" : "auto" });
    };
  
    const normalizeLoop = () => {
      if (!setWidth) return;
  
      const left = scroller.scrollLeft;
  
      if (left < setWidth * 0.5) {
        scroller.scrollLeft = left + setWidth;
      } else if (left > setWidth * 1.5) {
        scroller.scrollLeft = left - setWidth;
      }
    };
  
    const setActiveCard = () => {
      if (prefersReduced.matches) return;
  
      const rect = scroller.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
  
      let bestEl = null;
      let bestDist = Infinity;
  
      for (const card of cards) {
        const cRect = card.getBoundingClientRect();
        const cCenter = cRect.left + cRect.width / 2;
  
        const dist = Math.abs(centerX - cCenter);
        const norm = clamp(dist / (rect.width / 2), 0, 1);
  
        const intensity = (1 - norm) ** 2;
        const scale = 1 + 0.16 * intensity;
  
        card.style.setProperty("--scale", scale.toFixed(3));
  
        if (dist < bestDist) {
          bestDist = dist;
          bestEl = card;
        }
      }
  
      for (const card of cards) card.classList.remove("is-active");
      if (bestEl) bestEl.classList.add("is-active");
    };
  
    let rafId = 0;
    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        normalizeLoop();
        setActiveCard();
      });
    };
  
    scroller.addEventListener("scroll", onScroll, { passive: true });
  
    /* Drag-to-scroll: desktop quality-of-life */
    let isDown = false;
    let startX = 0;
    let startScrollLeft = 0;
    let moved = false;
  
    scroller.addEventListener("pointerdown", (e) => {
      isDown = true;
      moved = false;
      startX = e.clientX;
      startScrollLeft = scroller.scrollLeft;
      scroller.classList.add("is-dragging");
      scroller.setPointerCapture(e.pointerId);
    });
  
    scroller.addEventListener("pointermove", (e) => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 8) moved = true;
      scroller.scrollLeft = startScrollLeft - dx;
    });
  
    const endDrag = () => {
      if (!isDown) return;
      isDown = false;
      scroller.classList.remove("is-dragging");
      onScroll();
    };
  
    scroller.addEventListener("pointerup", endDrag);
    scroller.addEventListener("pointercancel", endDrag);
  
    scroller.addEventListener(
      "click",
      (e) => {
        if (moved) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
      true
    );
  
    /* Keyboard: snap-to-center with arrows */
    scroller.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  
      const activeIndex = Math.max(
        0,
        cards.findIndex((c) => c.classList.contains("is-active"))
      );
      const dir = e.key === "ArrowRight" ? 1 : -1;
  
      const next = clamp(activeIndex + dir, 0, cards.length - 1);
      centerCard(cards[next], !prefersReduced.matches);
      e.preventDefault();
    });
  
    /* Initial layout */
    const init = () => {
      cards = Array.from(scroller.querySelectorAll(".work-card"));
      setWidth = measureSetWidth();
  
      const fallbackIndex = Math.floor(originalCount / 2);
      const targetIndexInMiddle = middleStart + (initialIndex >= 0 ? initialIndex : fallbackIndex);
  
      scroller.scrollLeft = setWidth;
      centerCard(cards[targetIndexInMiddle], false);
  
      normalizeLoop();
      setActiveCard();
    };
  
    window.addEventListener("resize", () => {
      window.requestAnimationFrame(init);
    });
  
    prefersReduced.addEventListener?.("change", onScroll);
  
    init();
  });
  