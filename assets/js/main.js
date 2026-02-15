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
        cards.slice(middleStart, middleEnd).reduce((sum, el) => {
          const cs = window.getComputedStyle(el);
          const ml = parseFloat(cs.marginLeft) || 0;
          const mr = parseFloat(cs.marginRight) || 0;
          return sum + el.offsetWidth + ml + mr;
        }, 0);
  
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

    /* Active tile handling (single centered tile only) */
    let activeIndex = -1;
    let scrollEndTimer = 0;
    let wheelLock = false;

    const getNearestIndex = () => {
    const rect = scroller.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;

    let best = 0;
    let bestDist = Infinity;

    for (let i = 0; i < cards.length; i++) {
        const r = cards[i].getBoundingClientRect();
        const c = r.left + r.width / 2;
        const d = Math.abs(centerX - c);
        if (d < bestDist) {
        bestDist = d;
        best = i;
        }
    }
    return best;
    };

    const setActiveByIndex = (idx) => {
    if (idx === activeIndex) return;
    if (activeIndex >= 0 && cards[activeIndex]) cards[activeIndex].classList.remove("is-active");
    activeIndex = idx;
    if (cards[activeIndex]) cards[activeIndex].classList.add("is-active");
    // Keep loop math correct when the active card changes its margins
    setWidth = measureSetWidth();
    };

    const settleAfterScroll = () => {
    window.clearTimeout(scrollEndTimer);
    scrollEndTimer = window.setTimeout(() => {
        normalizeLoop();
        const idx = getNearestIndex();
        setActiveByIndex(idx);
        wheelLock = false;
    }, 140);
    };
  
    let rafId = 0;
    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        normalizeLoop();
        settleAfterScroll();
      });
    };
  
    scroller.addEventListener("scroll", onScroll, { passive: true });

      /* Wheel -> horizontal scroll (only inside the carousel) */
  const wheelToPixels = (e) => {
    // deltaMode: 0=pixel, 1=line, 2=page
    if (e.deltaMode === 1) return e.deltaY * 16;
    if (e.deltaMode === 2) return e.deltaY * scroller.clientWidth;
    return e.deltaY;
  };

    /* Wheel -> one-tile step (snap) */
    scroller.addEventListener(
    "wheel",
    (e) => {
      if (e.ctrlKey) return;
      if (scroller.scrollWidth <= scroller.clientWidth) return;
  
      const dy = wheelToPixels(e);
      const dx = e.deltaX;
      const dominant = Math.abs(dx) > Math.abs(dy) ? dx : dy;
      if (dominant === 0) return;
  
      e.preventDefault();
  
      if (wheelLock) return;
      wheelLock = true;
  
      // Ensure we start from the current centered tile
      if (activeIndex < 0) setActiveByIndex(getNearestIndex());
  
      const dir = dominant > 0 ? 1 : -1;
      const next = clamp(activeIndex + dir, 0, cards.length - 1);
  
      setActiveByIndex(next);
      centerCard(cards[next], !prefersReduced.matches);
      settleAfterScroll();
    },
    { passive: false }
  );
  
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

      const idx = getNearestIndex();
      setActiveByIndex(idx);
      centerCard(cards[idx], !prefersReduced.matches);

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
  
      const rect = scroller.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      
      let bestIndex = 0;
      let bestDist = Infinity;
      
      for (let i = 0; i < cards.length; i++) {
        const cRect = cards[i].getBoundingClientRect();
        const cCenter = cRect.left + cRect.width / 2;
        const dist = Math.abs(centerX - cCenter);
        if (dist < bestDist) {
          bestDist = dist;
          bestIndex = i;
        }
      }
      
      const dir = e.key === "ArrowRight" ? 1 : -1;
      const next = clamp(bestIndex + dir, 0, cards.length - 1);
      
      centerCard(cards[next], !prefersReduced.matches);
      setActiveByIndex(next);
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
      setActiveByIndex(getNearestIndex());
    };
  
    window.addEventListener("resize", () => {
      window.requestAnimationFrame(init);
    });
  
    prefersReduced.addEventListener?.("change", onScroll);
  
    init();
  });
  