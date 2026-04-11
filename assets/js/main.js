/* Carousel:
   - desktop: infinite loop + active centered card that grows
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
  
    /* Build a seamless loop by cloning the original set before and after */
    const originals = Array.from(scroller.querySelectorAll(".work-card"));
    const originalCount = originals.length;
    const initialIndex = originals.findIndex((card) => card.dataset.initial === "true");
  
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
  
    let cards = Array.from(scroller.querySelectorAll(".work-card"));
    const middleStart = originalCount;
    const middleEnd = originalCount * 2;
  
    let activeIndex = -1;
    let setWidth = 0;
    let scrollEndTimer = 0;
    let rafId = 0;
  
    /* Helpers */
    const isMobile = () => mobileQuery.matches;
  
    const getLoopedIndex = (index) => {
      const total = cards.length;
      return ((index % total) + total) % total;
    };
  
    const centerCard = (card, smooth) => {
      const left = card.offsetLeft + card.offsetWidth / 2 - scroller.clientWidth / 2;
      scroller.scrollTo({ left, behavior: smooth ? "smooth" : "auto" });
    };
  
    const measureSetWidth = () => {
      return cards.slice(middleStart, middleEnd).reduce((sum, card) => {
        const styles = window.getComputedStyle(card);
        const marginLeft = parseFloat(styles.marginLeft) || 0;
        const marginRight = parseFloat(styles.marginRight) || 0;
        const gapCompensation = 0;
        return sum + card.offsetWidth + marginLeft + marginRight + gapCompensation;
      }, 0);
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
  
    const getNearestIndex = () => {
      const rect = scroller.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
  
      let bestIndex = 0;
      let bestDistance = Infinity;
  
      for (let i = 0; i < cards.length; i += 1) {
        const cardRect = cards[i].getBoundingClientRect();
        const cardCenter = cardRect.left + cardRect.width / 2;
        const distance = Math.abs(centerX - cardCenter);
  
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = i;
        }
      }
  
      return bestIndex;
    };
  
    /* Desktop-only active state */
    const clearActiveStates = () => {
      cards.forEach((card) => card.classList.remove("is-active"));
      activeIndex = -1;
    };
  
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
  
    /* Scroll settling:
       mobile only normalizes loop and lets snap do the visual work;
       desktop also maintains the active grown card */
    const settleAfterScroll = () => {
      window.clearTimeout(scrollEndTimer);
  
      scrollEndTimer = window.setTimeout(() => {
        normalizeLoop();
  
        const nearestIndex = getNearestIndex();
  
        if (isMobile()) {
          clearActiveStates();
          centerCard(cards[nearestIndex], false);
          return;
        }
  
        setActiveByIndex(nearestIndex);
  
        window.requestAnimationFrame(() => {
          if (cards[nearestIndex]) {
            centerCard(cards[nearestIndex], false);
          }
        });
      }, 120);
    };
  
    const onScroll = () => {
      if (rafId) return;
  
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        normalizeLoop();
        settleAfterScroll();
      });
    };
  
    scroller.addEventListener("scroll", onScroll, { passive: true });
  
    /* Desktop-only recenter after active width transition */
    scroller.addEventListener("transitionend", (event) => {
      if (isMobile()) return;
  
      if (
        !event.target.classList.contains("work-card") ||
        (event.propertyName !== "width" && event.propertyName !== "flex-basis")
      ) {
        return;
      }
  
      const currentIndex = activeIndex >= 0 ? activeIndex : getNearestIndex();
  
      if (cards[currentIndex]) {
        centerCard(cards[currentIndex], false);
      }
    });
  
    /* Step navigation:
       desktop changes the active card;
       mobile just moves one equal card at a time */
    const stepCarousel = (direction) => {
      const currentIndex =
        !isMobile() && activeIndex >= 0 ? activeIndex : getNearestIndex();
  
      const nextIndex = getLoopedIndex(currentIndex + direction);
  
      if (!isMobile()) {
        setActiveByIndex(nextIndex);
      }
  
      centerCard(cards[nextIndex], !prefersReduced.matches);
    };
  
    /* Keyboard navigation */
    scroller.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  
      stepCarousel(event.key === "ArrowRight" ? 1 : -1);
      event.preventDefault();
    });
  
    prevButton?.addEventListener("click", () => {
      stepCarousel(-1);
    });
  
    nextButton?.addEventListener("click", () => {
      stepCarousel(1);
    });
  
    /* Initial layout:
       mobile starts centered with equal cards;
       desktop starts centered with the configured active card */
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
    };
  
    window.addEventListener("resize", () => {
      window.requestAnimationFrame(init);
    });
  
    mobileQuery.addEventListener?.("change", init);
    prefersReduced.addEventListener?.("change", onScroll);
  
    init();
  });