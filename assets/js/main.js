/* Carousel: infinite loop + centered active card scaling */
document.addEventListener("DOMContentLoaded", () => {
    const scroller = document.getElementById("workScroller");
    if (!scroller) return;
  
    /* Motion preference is used only to decide whether centering animates smoothly */
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  
    /* Build a seamless loop by cloning the original card set before and after */
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
  
    /* Small utilities used by several interaction modes */
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  
    const centerCard = (card, smooth) => {
      const left = card.offsetLeft + card.offsetWidth / 2 - scroller.clientWidth / 2;
      scroller.scrollTo({ left, behavior: smooth ? "smooth" : "auto" });
    };
  
    /* Width is measured on the original middle set so loop normalization stays stable */
    let activeIndex = -1;
    let setWidth = 0;
  
    const measureSetWidth = () => {
      const previousActive = activeIndex;
  
      if (previousActive >= 0 && cards[previousActive]) {
        cards[previousActive].classList.remove("is-active");
      }
  
      const width = cards.slice(middleStart, middleEnd).reduce((sum, card) => {
        const styles = window.getComputedStyle(card);
        const marginLeft = parseFloat(styles.marginLeft) || 0;
        const marginRight = parseFloat(styles.marginRight) || 0;
        return sum + card.offsetWidth + marginLeft + marginRight;
      }, 0);
  
      if (previousActive >= 0 && cards[previousActive]) {
        cards[previousActive].classList.add("is-active");
      }
  
      return width;
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
  
    /* Active-card detection is based on the card nearest to the viewport center */
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
  
    const setActiveByIndex = (index) => {
      if (index === activeIndex) return;
  
      if (activeIndex >= 0 && cards[activeIndex]) {
        cards[activeIndex].classList.remove("is-active");
      }
  
      activeIndex = index;
  
      if (cards[activeIndex]) {
        cards[activeIndex].classList.add("is-active");
      }
    };
  
    /* Scroll settling waits briefly so smooth scroll, wheel, and drag all share one end-state */
    let scrollEndTimer = 0;
    let wheelLock = false;
  
    const settleAfterScroll = () => {
        window.clearTimeout(scrollEndTimer);
      
        scrollEndTimer = window.setTimeout(() => {
          normalizeLoop();
      
          const nearestIndex = getNearestIndex();
          setActiveByIndex(nearestIndex);
      
          /* La card attiva ora cambia dimensione reale nel layout:
             dopo l'assegnazione della classe la ricentriamo una seconda volta */
          window.requestAnimationFrame(() => {
            if (cards[nearestIndex]) {
              centerCard(cards[nearestIndex], false);
            }
          });
      
          wheelLock = false;
        }, 140);
      };
  
    /* Scroll work is throttled into rAF to avoid excessive layout reads */
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

    /* Quando la card attiva finisce di cambiare width/flex-basis,
   il suo centro geometrico può spostarsi: la ricentriamo */
    scroller.addEventListener("transitionend", (event) => {
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
  
    /* Convert vertical wheel intent into horizontal one-card stepping */
    const wheelToPixels = (event) => {
      if (event.deltaMode === 1) return event.deltaY * 16;
      if (event.deltaMode === 2) return event.deltaY * scroller.clientWidth;
      return event.deltaY;
    };
  
    scroller.addEventListener(
      "wheel",
      (event) => {
        if (event.ctrlKey) return;
        if (scroller.scrollWidth <= scroller.clientWidth) return;
  
        const deltaY = wheelToPixels(event);
        const deltaX = event.deltaX;
        const dominantDelta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
  
        if (dominantDelta === 0) return;
  
        event.preventDefault();
  
        if (wheelLock) return;
        wheelLock = true;
  
        if (activeIndex < 0) {
          setActiveByIndex(getNearestIndex());
        }
  
        const direction = dominantDelta > 0 ? 1 : -1;
        const nextIndex = clamp(activeIndex + direction, 0, cards.length - 1);
  
        setActiveByIndex(nextIndex);
        centerCard(cards[nextIndex], !prefersReduced.matches);
        settleAfterScroll();
      },
      { passive: false }
    );
  
    /* Pointer dragging preserves the existing desktop interaction without changing link behavior */
    let isPointerDown = false;
    let startX = 0;
    let startScrollLeft = 0;
    let moved = false;
  
    scroller.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
  
      isPointerDown = true;
      moved = false;
      startX = event.clientX;
      startScrollLeft = scroller.scrollLeft;
  
      scroller.classList.add("is-dragging");
      scroller.setPointerCapture(event.pointerId);
    });
  
    scroller.addEventListener("pointermove", (event) => {
      if (!isPointerDown) return;
  
      const deltaX = event.clientX - startX;
  
      if (Math.abs(deltaX) > 8) {
        moved = true;
      }
  
      scroller.scrollLeft = startScrollLeft - deltaX;
    });
  
    const endDrag = () => {
      if (!isPointerDown) return;
  
      isPointerDown = false;
      scroller.classList.remove("is-dragging");
  
      const nearestIndex = getNearestIndex();
      setActiveByIndex(nearestIndex);
      centerCard(cards[nearestIndex], !prefersReduced.matches);
  
      onScroll();
    };
  
    scroller.addEventListener("pointerup", endDrag);
    scroller.addEventListener("pointercancel", endDrag);
  
    scroller.addEventListener(
      "click",
      (event) => {
        if (!moved) return;
        event.preventDefault();
        event.stopPropagation();
      },
      true
    );
  
    /* Keyboard navigation still snaps one card at a time from the current centered item */
    scroller.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  
      const currentIndex = activeIndex >= 0 ? activeIndex : getNearestIndex();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = clamp(currentIndex + direction, 0, cards.length - 1);
  
      setActiveByIndex(nextIndex);
      centerCard(cards[nextIndex], !prefersReduced.matches);
      event.preventDefault();
    });
  
    /* Initial positioning centers the configured starting card inside the middle clone set */
    const init = () => {
      cards = Array.from(scroller.querySelectorAll(".work-card"));
      setWidth = measureSetWidth();
  
      const fallbackIndex = Math.floor(originalCount / 2);
      const targetIndex = middleStart + (initialIndex >= 0 ? initialIndex : fallbackIndex);
  
      scroller.scrollLeft = setWidth;
      centerCard(cards[targetIndex], false);
      normalizeLoop();
      setActiveByIndex(getNearestIndex());
    };
  
    window.addEventListener("resize", () => {
      window.requestAnimationFrame(init);
    });
  
    prefersReduced.addEventListener?.("change", onScroll);
  
    init();
  });