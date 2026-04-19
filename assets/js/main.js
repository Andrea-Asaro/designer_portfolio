/* Carousel:
   - desktop: loop infinito + card attiva centrata + scaling visivo guidato dallo scroll
   - mobile: snap nativo + massimo una tile per swipe + riallineamento istantaneo nel set centrale
   - fix: evita il loop/glitch causato da smooth scroll + normalize sui cloni in mobile */
   document.addEventListener("DOMContentLoaded", () => {
	/* Riferimenti principali del carosello e controlli desktop */
	const scroller = document.getElementById("workScroller");
	if (!scroller) return;

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

	/* Clonazione di un set completo prima e dopo per simulare il loop infinito */
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

	/* Cache delle card complete e range del set centrale */
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

	/* Stato gesture mobile:
	   serve per limitare ogni swipe a una sola tile */
	let touchStartX = 0;
	let mobileGestureStartIndex = -1;
	let mobileSwipeDirection = 0;
	let isTouchDragging = false;

	/* Utility breakpoint */
	const isMobile = () => mobileQuery.matches;

	/* Mantiene un indice nel range totale delle card clonate */
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

	/* Desktop: riporta lo scroll nel set centrale per mantenere il loop continuo */
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

	/* Pulisce lo stato attivo desktop */
	const clearActiveStates = () => {
		cards.forEach((card) => card.classList.remove("is-active"));
		activeIndex = -1;
	};

	/* Reset dello stato gesture mobile */
	const resetMobileGesture = () => {
		touchStartX = 0;
		mobileGestureStartIndex = -1;
		mobileSwipeDirection = 0;
		isTouchDragging = false;
	};

	/* Desktop: imposta la card attiva sempre nel set centrale */
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

	/* Aggiorna lo scaling visivo desktop; su mobile lo annulla */
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

	/* Mobile: decide una sola tile target e la riallinea istantaneamente
	   sull'equivalente del set centrale, evitando smooth loop e salti ripetuti */
	const finalizeMobileSnap = () => {
		const nearestIndex = getNearestIndex();

		const fallbackTarget = getMiddleIndex(nearestIndex);
		const steppedTarget =
			mobileGestureStartIndex >= 0 && mobileSwipeDirection !== 0 ?
			getMiddleIndex(mobileGestureStartIndex + mobileSwipeDirection) :
			fallbackTarget;

		resetMobileGesture();
		centerCard(cards[steppedTarget], false);
		updateCardProgress();
	};

	/* Quando lo scroll si assesta:
	   - mobile: aspetta la fine del drag e poi corregge una sola volta
	   - desktop: mantiene la logica attuale con normalize + stato attivo */
	const settleAfterScroll = () => {
		window.clearTimeout(scrollEndTimer);

		scrollEndTimer = window.setTimeout(() => {
			if (isMobile()) {
				clearActiveStates();

				if (isTouchDragging) {
					updateCardProgress();
					return;
				}

				finalizeMobileSnap();
				return;
			}

			isProgrammaticScroll = false;
			normalizeLoop();

			const nearestIndex = getNearestIndex();
			setActiveByIndex(nearestIndex);
			updateCardProgress();
		}, 100);
	};

	/* Durante lo scroll:
	   - desktop continua a normalizzare live il loop
	   - mobile evita normalize live per non glitchare durante il drag */
	const onScroll = () => {
		if (rafId) return;

		rafId = window.requestAnimationFrame(() => {
			rafId = 0;

			if (!isProgrammaticScroll && !isMobile()) {
				normalizeLoop();
			}

			updateCardProgress();
			settleAfterScroll();
		});
	};

	scroller.addEventListener("scroll", onScroll, {
		passive: true
	});

	/* Gesture mobile:
	   registra la tile iniziale e la direzione dello swipe,
	   così ogni gesture si risolve in massimo uno step */
	scroller.addEventListener(
		"touchstart",
		(event) => {
			if (!isMobile()) return;

			const touch = event.touches[0];
			if (!touch) return;

			touchStartX = touch.clientX;
			mobileGestureStartIndex = getMiddleIndex(getNearestIndex());
			mobileSwipeDirection = 0;
			isTouchDragging = true;
		}, {
			passive: true
		}
	);

	scroller.addEventListener(
		"touchmove",
		(event) => {
			if (!isMobile() || !isTouchDragging) return;

			const touch = event.touches[0];
			if (!touch) return;

			const deltaX = touch.clientX - touchStartX;

			if (Math.abs(deltaX) < 18) return;
			mobileSwipeDirection = deltaX < 0 ? 1 : -1;
		}, {
			passive: true
		}
	);

	scroller.addEventListener(
		"touchend",
		() => {
			if (!isMobile()) return;
			isTouchDragging = false;
			settleAfterScroll();
		}, {
			passive: true
		}
	);

	scroller.addEventListener(
		"touchcancel",
		() => {
			if (!isMobile()) return;
			isTouchDragging = false;
			settleAfterScroll();
		}, {
			passive: true
		}
	);

	/* Navigazione a step:
	   - desktop: comportamento invariato
	   - mobile: usa sempre la card equivalente del set centrale */
	const stepCarousel = (direction) => {
		const currentIndex = isMobile() ? getMiddleIndex(getNearestIndex()) : getNearestIndex();
		const nextIndex = isMobile() ?
			getMiddleIndex(currentIndex + direction) :
			getLoopedIndex(currentIndex + direction);
		const smooth = !prefersReduced.matches;

		if (!isMobile()) {
			setActiveByIndex(nextIndex);
			updateCardProgress();
		}

		isProgrammaticScroll = smooth && !isMobile();
		centerCard(cards[nextIndex], smooth);

		if (!smooth) {
			isProgrammaticScroll = false;

			if (!isMobile()) {
				normalizeLoop();
				setActiveByIndex(getNearestIndex());
			}

			updateCardProgress();
		}
	};

	/* Tastiera per accessibilità */
	scroller.addEventListener("keydown", (event) => {
		if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

		stepCarousel(event.key === "ArrowRight" ? 1 : -1);
		event.preventDefault();
	});

	/* Pulsanti desktop */
	prevButton?.addEventListener("click", () => {
		stepCarousel(-1);
	});

	nextButton?.addEventListener("click", () => {
		stepCarousel(1);
	});

	/* Inizializzazione:
	   - centra la card iniziale nel set centrale
	   - misura il loop
	   - imposta lo stato iniziale corretto */
	const init = () => {
		cards = Array.from(scroller.querySelectorAll(".work-card"));
		resetMobileGesture();
		clearActiveStates();
		setWidth = measureSetWidth();

		const fallbackIndex = Math.floor(originalCount / 2);
		const targetIndex = middleStart + (initialIndex >= 0 ? initialIndex : fallbackIndex);

		scroller.scrollLeft = setWidth;
		centerCard(cards[targetIndex], false);

		if (!isMobile()) {
			normalizeLoop();
			setActiveByIndex(getNearestIndex());
		}

		updateCardProgress();
	};

	/* Resize: reinit pulita senza ricalcoli ripetuti */
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

	/* Avvio iniziale */
	init();
});

/* Mobile menu:
 apre/chiude l'offcanvas solo sotto 861px,
 blocca lo scroll del body, chiude su Escape e al click sui link */
document.addEventListener("DOMContentLoaded", () => {
	const mobileMenu = document.getElementById("mobileMenu");
	const mobileMenuButton = document.getElementById("mobileMenuButton");
	const mobileMenuCloseButton = document.getElementById("mobileMenuCloseButton");
	const mobileMenuLinks = mobileMenu ? Array.from(mobileMenu.querySelectorAll(".mobile-menu__link")) : [];
	const mobileQuery = window.matchMedia("(max-width: 860px)");

	if (!mobileMenu || !mobileMenuButton || !mobileMenuCloseButton) return;

	mobileMenu.setAttribute("inert", "");

	/* Menu state:
	   sincronizza classi, attributi ARIA e focus tra stato aperto/chiuso */
	const setMenuState = (isOpen) => {
		document.body.classList.toggle("is-menu-open", isOpen);
		mobileMenu.setAttribute("aria-hidden", String(!isOpen));
		mobileMenuButton.setAttribute("aria-expanded", String(isOpen));

		if (isOpen) {
			mobileMenu.removeAttribute("inert");
			mobileMenuCloseButton.focus();
			return;
		}

		mobileMenu.setAttribute("inert", "");

		if (mobileQuery.matches) {
			mobileMenuButton.focus();
		}
	};

	/* Toggle handlers:
	   il pulsante header apre, quello nel pannello richiude */
	const openMenu = () => {
		if (!mobileQuery.matches) return;
		setMenuState(true);
	};

	const closeMenu = () => {
		setMenuState(false);
	};

	mobileMenuButton.addEventListener("click", () => {
		const isOpen = document.body.classList.contains("is-menu-open");
		if (isOpen) {
			closeMenu();
			return;
		}

		openMenu();
	});

	mobileMenuCloseButton.addEventListener("click", closeMenu);

	/* Auto-close:
	   chiude il pannello al click di un link, su Escape e tornando a desktop */
	mobileMenuLinks.forEach((link) => {
		link.addEventListener("click", closeMenu);
	});

	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape" && document.body.classList.contains("is-menu-open")) {
			closeMenu();
		}
	});

	mobileQuery.addEventListener?.("change", (event) => {
		if (!event.matches) {
			closeMenu();
		}
	});
});

/* Back to top:
   mostra il bottone dopo uno scroll abbastanza significativo
   e riporta in cima con easing rapido ma fluido, rispettando reduced motion */
   document.addEventListener("DOMContentLoaded", () => {
	const backToTopButton = document.getElementById("backToTopButton");
	if (!backToTopButton) return;

	const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
	let revealOffset = 0;
	let scrollRafId = 0;
	let resizeRafId = 0;
	let animationFrameId = 0;

	/* Reveal threshold:
	   200px può andare, ma su viewport grandi compare troppo presto;
	   qui uso una soglia adattiva più elegante tra circa 220px e 360px */
	const computeRevealOffset = () => {
		revealOffset = Math.max(220, Math.min(window.innerHeight * 0.35, 360));
	};

	/* Visibility state:
	   attiva o nasconde il bottone solo quando diventa davvero utile */
	const updateVisibility = () => {
		backToTopButton.classList.toggle("is-visible", window.scrollY > revealOffset);
	};

	/* Easing:
	   movimento veloce ma non brusco, più coerente del solo smooth nativo */
	const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

	const scrollToTop = () => {
		if (animationFrameId) {
			window.cancelAnimationFrame(animationFrameId);
			animationFrameId = 0;
		}

		if (prefersReduced.matches) {
			window.scrollTo(0, 0);
			return;
		}

		const startY = window.scrollY;
		if (startY <= 0) return;

		const duration = Math.min(520, Math.max(340, startY * 0.18));
		const startTime = performance.now();

		const step = (now) => {
			const progress = Math.min((now - startTime) / duration, 1);
			const eased = easeOutCubic(progress);

			window.scrollTo(0, Math.round(startY * (1 - eased)));

			if (progress < 1) {
				animationFrameId = window.requestAnimationFrame(step);
				return;
			}

			animationFrameId = 0;
		};

		animationFrameId = window.requestAnimationFrame(step);
	};

	/* Scroll and resize:
	   throttle via requestAnimationFrame per mantenere la pagina reattiva */
	const onScroll = () => {
		if (scrollRafId) return;

		scrollRafId = window.requestAnimationFrame(() => {
			scrollRafId = 0;
			updateVisibility();
		});
	};

	const onResize = () => {
		if (resizeRafId) return;

		resizeRafId = window.requestAnimationFrame(() => {
			resizeRafId = 0;
			computeRevealOffset();
			updateVisibility();
		});
	};

	backToTopButton.addEventListener("click", scrollToTop);
	window.addEventListener("scroll", onScroll, { passive: true });
	window.addEventListener("resize", onResize, { passive: true });

	computeRevealOffset();
	updateVisibility();
});