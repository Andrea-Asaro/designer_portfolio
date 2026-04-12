/* Carousel:
   - desktop: loop infinito + card attiva centrata + scaling visivo guidato dallo scroll
   - mobile: loop infinito + card tutte uguali, senza ingrandimento della card attiva
   - fix: i bottoni avanzano verso la card fisicamente adiacente, e la normalizzazione del loop
     non interrompe più l'animazione quando si attraversa la giuntura */
     document.addEventListener("DOMContentLoaded", () => {
        const scroller = document.getElementById("workScroller");
        if (!scroller) return;
      
        /* Controlli desktop */
        const prevButton = document.getElementById("workPrevButton");
        const nextButton = document.getElementById("workNextButton");
      
        /* Media query per motion reduction e breakpoint mobile */
        const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
        const mobileQuery = window.matchMedia("(max-width: 860px)");
      
        /* Card originali e indice iniziale */
        const originals = Array.from(scroller.querySelectorAll(".work-card"));
        const originalCount = originals.length;
        const initialIndex = originals.findIndex((card) => card.dataset.initial === "true");
      
        if (!originalCount) return;
      
        /* Crea un set di cloni identico all'originale */
        const buildCloneSet = () =>
          originals.map((card) => {
            const clone = card.cloneNode(true);
            clone.removeAttribute("data-initial");
            return clone;
          });
      
        /* Inserisce un set clonato prima e uno dopo, per simulare il loop infinito */
        const beforeFragment = document.createDocumentFragment();
        const afterFragment = document.createDocumentFragment();
      
        buildCloneSet().forEach((node) => beforeFragment.appendChild(node));
        buildCloneSet().forEach((node) => afterFragment.appendChild(node));
      
        scroller.prepend(beforeFragment);
        scroller.append(afterFragment);
      
        /* Cache delle card complete e limiti del set centrale */
        let cards = Array.from(scroller.querySelectorAll(".work-card"));
        const middleStart = originalCount;
        const middleEnd = originalCount * 2;
      
        /* Stato interno del carosello */
        let activeIndex = -1;
        let setWidth = 0;
        let scrollEndTimer = 0;
        let rafId = 0;
        let resizeRafId = 0;
        let isProgrammaticScroll = false;
      
        /* Rileva il breakpoint mobile */
        const isMobile = () => mobileQuery.matches;
      
        /* Mantiene un indice dentro il range totale delle card clonate */
        const getLoopedIndex = (index) => {
          const total = cards.length;
          return ((index % total) + total) % total;
        };
      
        /* Rimappa qualunque indice sull'equivalente card del set centrale */
        const getMiddleIndex = (index) => {
          const logicalIndex = ((index - middleStart) % originalCount + originalCount) % originalCount;
          return middleStart + logicalIndex;
        };
      
        /* Centra una card nello scroller */
        const centerCard = (card, smooth) => {
          if (!card) return;
      
          const left = card.offsetLeft + card.offsetWidth / 2 - scroller.clientWidth / 2;
      
          scroller.scrollTo({
            left,
            behavior: smooth ? "smooth" : "auto",
          });
        };
      
        /* Misura la larghezza occupata da un intero set originale */
        const measureSetWidth = () => {
          const middleCards = cards.slice(middleStart, middleEnd);
          if (!middleCards.length) return 0;
      
          const firstCard = middleCards[0];
          const lastCard = middleCards[middleCards.length - 1];
      
          return lastCard.offsetLeft + lastCard.offsetWidth - firstCard.offsetLeft;
        };
      
        /* Riporta lo scroll nel set centrale, così il loop resta continuo */
        const normalizeLoop = () => {
          if (!setWidth) return;
      
          const left = scroller.scrollLeft;
      
          if (left < setWidth * 0.5) {
            scroller.scrollLeft = left + setWidth;
          } else if (left > setWidth * 1.5) {
            scroller.scrollLeft = left - setWidth;
          }
        };
      
        /* Trova la card il cui centro è più vicino al centro visibile dello scroller */
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
      
        /* Rimuove lo stato attivo da tutte le card */
        const clearActiveStates = () => {
          cards.forEach((card) => card.classList.remove("is-active"));
          activeIndex = -1;
        };
      
        /* Imposta la card attiva sempre sull'equivalente nel set centrale */
        const setActiveByIndex = (index) => {
          if (isMobile()) return;
      
          const normalizedIndex = getMiddleIndex(index);
          if (normalizedIndex === activeIndex) return;
      
          if (activeIndex >= 0 && cards[activeIndex]) {
            cards[activeIndex].classList.remove("is-active");
          }
      
          activeIndex = normalizedIndex;
      
          if (cards[activeIndex]) {
            cards[activeIndex].classList.add("is-active");
          }
        };
      
        /* Aggiorna lo scaling visivo di ogni card in base alla distanza dal centro */
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
      
        /* Quando lo scroll si assesta:
           - chiude eventuali scroll programmati
           - normalizza il loop
           - sincronizza lo stato attivo con la card più vicina al centro */
        const settleAfterScroll = () => {
          window.clearTimeout(scrollEndTimer);
      
          scrollEndTimer = window.setTimeout(() => {
            isProgrammaticScroll = false;
            normalizeLoop();
      
            const nearestIndex = getNearestIndex();
      
            if (isMobile()) {
              clearActiveStates();
              updateCardProgress();
              return;
            }
      
            setActiveByIndex(nearestIndex);
            updateCardProgress();
          }, 100);
        };
      
        /* Durante lo scroll:
           - aggiorna sempre lo scaling
           - normalizza il loop solo se non è uno scroll smooth lanciato dai bottoni */
        const onScroll = () => {
          if (rafId) return;
      
          rafId = window.requestAnimationFrame(() => {
            rafId = 0;
      
            if (!isProgrammaticScroll) {
              normalizeLoop();
            }
      
            updateCardProgress();
            settleAfterScroll();
          });
        };
      
        scroller.addEventListener("scroll", onScroll, { passive: true });
      
        /* Navigazione a step:
        - parte dalla card fisicamente più vicina
        - assegna subito lo stato attivo alla card di destinazione
        - così la card uscente perde immediatamente l'override di scala e non scatta più alla fine */
        const stepCarousel = (direction) => {
            const currentIndex = getNearestIndex();
            const nextIndex = getLoopedIndex(currentIndex + direction);
            const smooth = !prefersReduced.matches;
        
            if (!isMobile()) {
            setActiveByIndex(nextIndex);
            updateCardProgress();
            }
        
            isProgrammaticScroll = smooth;
            centerCard(cards[nextIndex], smooth);
        
            if (!smooth) {
            isProgrammaticScroll = false;
            normalizeLoop();
            setActiveByIndex(getNearestIndex());
            updateCardProgress();
            }
        };
      
        /* Navigazione da tastiera per accessibilità */
        scroller.addEventListener("keydown", (event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      
          stepCarousel(event.key === "ArrowRight" ? 1 : -1);
          event.preventDefault();
        });
      
        /* Navigazione con pulsanti */
        prevButton?.addEventListener("click", () => {
          stepCarousel(-1);
        });
      
        nextButton?.addEventListener("click", () => {
          stepCarousel(1);
        });
      
        /* Inizializzazione:
           - centra la card iniziale nel set centrale
           - misura il loop
           - imposta lo stato iniziale */
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
      
        /* Reinizializza tutto al resize, evitando ricalcoli ripetuti */
        const onResize = () => {
          if (resizeRafId) return;
      
          resizeRafId = window.requestAnimationFrame(() => {
            resizeRafId = 0;
            isProgrammaticScroll = false;
            init();
          });
        };
      
        window.addEventListener("resize", onResize);
        mobileQuery.addEventListener?.("change", init);
        prefersReduced.addEventListener?.("change", updateCardProgress);
      
        /* Avvio iniziale del carosello */
        init();
      });