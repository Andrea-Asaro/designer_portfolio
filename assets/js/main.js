/* Carousel:
   - desktop: infinite loop + centered active card + smooth visual scaling driven by scroll
   - mobile: infinite loop + equal-width cards, no active scaling */
   document.addEventListener("DOMContentLoaded", () => {
    const scroller = document.getElementById("workScroller");
    if (!scroller) return;
  
    /* Desktop controls */
    const prevButton = document.getElementById("workPrevButton");
    const nextButton = document.getElementById("workNextButton");
  
    /* Motion and breakpoint queries */
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobileQuery = window.matchMedia("(max-width: 860px)");
  
    /* Original cards and initial target card */
    const originals = Array.from(scroller.querySelectorAll(".work-card"));
    const originalCount = originals.length;
    const initialIndex = originals.findIndex((card) => card.dataset.initial === "true");
  
    if (!originalCount) return;
  
    /* Build a seamless infinite loop by cloning the original set before and after */
    const buildCloneSet = () =>
      originals.map((card) => {
        const clone = card.cloneNode(true);
        clone.removeAttribute("data-initial");
        return clone;
      });
  
    const beforeFragment = document.createDocumentFragment();
    const afterFragment = document.createDocumentFragment();
  
    buildCloneSet().forEach((node) => beforeFragment.appendChild(node));
    buildCloneSet().forEach((node) => afterFragment.appendChild(node));
  
    scroller.prepend(beforeFragment);
    scroller.append(afterFragment);
  
    /* Cached card collections and loop boundaries */
    let cards = Array.from(scroller.querySelectorAll(".work-card"));
    const middleStart = originalCount;
    const middleEnd = originalCount * 2;
  
    /* Internal state */
    let activeIndex = -1;
    let setWidth = 0;
    let scrollEndTimer = 0;
    let rafId = 0;
    let resizeRafId = 0;
  
    /* Utility: current breakpoint */
    const isMobile = () => mobileQuery.matches;
  
    /* Utility: keep an index inside the virtual circular list */
    const getLoopedIndex = (index) => {
      const total = cards.length;
      return ((index % total) + total) % total;
    };
  
    /* Utility: center a card in the viewport */
    const centerCard = (card, smooth) => {
      if (!card) return;
  
      const left = card.offsetLeft + card.offsetWidth / 2 - scroller.clientWidth / 2;
  
      scroller.scrollTo({
        left,
        behavior: smooth ? "smooth" : "auto",
      });
    };
  
    /* Measure the width occupied by one full original set, including flex gap */
    const measureSetWidth = () => {
      const middleCards = cards.slice(middleStart, middleEnd);
      if (!middleCards.length) return 0;
  
      const firstCard = middleCards[0];
      const lastCard = middleCards[middleCards.length - 1];
  
      return lastCard.offsetLeft + lastCard.offsetWidth - firstCard.offsetLeft;
    };
  
    /* Keep scroll position inside the middle copy so the loop feels endless */
    const normalizeLoop = () => {
      if (!setWidth) return;
  
      const left = scroller.scrollLeft;
  
      if (left < setWidth * 0.5) {
        scroller.scrollLeft = left + setWidth;
      } else if (left > setWidth * 1.5) {
        scroller.scrollLeft = left - setWidth;
      }
    };
  
    /* Find the card whose center is closest to the scroller center */
    const getNearestIndex = () => {
      const scrollerCenter = scroller.scrollLeft + scroller.clientWidth / 2;
  
      let bestIndex = 0;
      let bestDistance = Infinity;
  
      for (let i = 0; i < cards.length; i += 1) {
        const cardCenter = cards[i].offsetLeft + cards[i].offsetWidth / 2;
        const distance = Math.abs(scrollerCenter - cardCenter);
  
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = i;
        }
      }
  
      return bestIndex;
    };
  
    /* Active state is kept only as a semantic/state marker on desktop */
    const clearActiveStates = () => {
      cards.forEach((card) => card.classList.remove("is-active"));
      activeIndex = -1;
    };
  
    /* Update the current desktop active card without triggering layout-based motion */
    const setActiveByIndex = (index) => {
      if (isMobile()) return;
      if (index === activeIndex) return;
  
      if (activeIndex >= 0 && cards[activeIndex]) {
        cards[activeIndex].classList.remove("is-active");
      }
  
      activeIndex = index;
  
      if (cards[activeIndex]) {
        cards[activeIndex].classList.add("is-active");
      }
    };
  
    /* Drive the visual scaling continuously based on distance from the center */
    const updateCardProgress = () => {
      if (!cards.length) return;
  
      if (isMobile()) {
        cards.forEach((card) => card.style.setProperty("--card-progress", "0"));
        return;
      }
  
      const scrollerCenter = scroller.scrollLeft + scroller.clientWidth / 2;
      const firstCardWidth = cards[0]?.offsetWidth || 0;
      const maxDistance = scroller.clientWidth / 2 + firstCardWidth / 2;
  
      cards.forEach((card) => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        const distance = Math.abs(scrollerCenter - cardCenter);
        const progress = Math.max(0, 1 - distance / maxDistance);
  
        card.style.setProperty("--card-progress", progress.toFixed(3));
      });
    };
  
    /* When scrolling settles, lock the semantic active card to the nearest centered one */
    const settleAfterScroll = () => {
      window.clearTimeout(scrollEndTimer);
  
      scrollEndTimer = window.setTimeout(() => {
        normalizeLoop();
  
        const nearestIndex = getNearestIndex();
  
        if (isMobile()) {
          clearActiveStates();
          updateCardProgress();
          return;
        }
  
        setActiveByIndex(nearestIndex);
        updateCardProgress();
      }, 80);
    };
  
    /* During scroll, keep the loop normalized and update scale smoothly in rAF */
    const onScroll = () => {
      if (rafId) return;
  
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        normalizeLoop();
        updateCardProgress();
        settleAfterScroll();
      });
    };
  
    scroller.addEventListener("scroll", onScroll, { passive: true });
  
    /* Step navigation moves exactly one card at a time */
    const stepCarousel = (direction) => {
      const currentIndex =
        !isMobile() && activeIndex >= 0 ? activeIndex : getNearestIndex();
  
      const nextIndex = getLoopedIndex(currentIndex + direction);
  
      if (!isMobile()) {
        setActiveByIndex(nextIndex);
      }
  
      centerCard(cards[nextIndex], !prefersReduced.matches);
    };
  
    /* Keyboard navigation for accessibility */
    scroller.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  
      stepCarousel(event.key === "ArrowRight" ? 1 : -1);
      event.preventDefault();
    });
  
    /* Button navigation */
    prevButton?.addEventListener("click", () => {
      stepCarousel(-1);
    });
  
    nextButton?.addEventListener("click", () => {
      stepCarousel(1);
    });
  
    /* Initial setup:
       - center the requested initial card inside the middle set
       - compute loop width
       - set active state on desktop
       - initialize scaling values */
    const init = () => {
      cards = Array.from(scroller.querySelectorAll(".work-card"));
      clearActiveStates();
      setWidth = measureSetWidth();
  
      const fallbackIndex = Math.floor(originalCount / 2);
      const targetIndex = middleStart + (initialIndex >= 0 ? initialIndex : fallbackIndex);
  
      scroller.scrollLeft = setWidth;
      centerCard(cards[targetIndex], false);
      normalizeLoop();
  
      if (!isMobile()) {
        setActiveByIndex(getNearestIndex());
      }
  
      updateCardProgress();
    };
  
    /* Resize handling is wrapped in rAF to avoid repeated heavy recalculations */
    const onResize = () => {
      if (resizeRafId) return;
  
      resizeRafId = window.requestAnimationFrame(() => {
        resizeRafId = 0;
        init();
      });
    };
  
    window.addEventListener("resize", onResize);
    mobileQuery.addEventListener?.("change", init);
    prefersReduced.addEventListener?.("change", updateCardProgress);
  
    init();
  });