/* Homepage intro:
   brand letter-reveal → split → FLIP settle into page layout */
document.addEventListener("DOMContentLoaded", () => {
	const intro = document.getElementById("siteIntro");
	if (!intro) {
		document.documentElement.classList.remove("has-intro");
		return;
	}

	const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
	const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
	const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

	const cleanupIntro = () => {
		intro.setAttribute("hidden", "");
		intro.setAttribute("aria-hidden", "true");
		intro.remove();
		document.documentElement.classList.remove(
			"has-intro",
			"is-intro-settling",
			"is-page-in",
			"is-intro-media-in"
		);
	};

	const finishWithoutMotion = () => {
		cleanupIntro();
	};

	const buildLetters = () => {
		intro.querySelectorAll("[data-intro-word]").forEach((word) => {
			const text = word.getAttribute("data-intro-word") || "";
			word.replaceChildren(
				...Array.from(text).map((char) => {
					const span = document.createElement("span");
					span.className = "site-intro__letter";
					span.textContent = char;
					return span;
				})
			);
		});
	};

	const rectOf = (el) => {
		const rect = el.getBoundingClientRect();
		return {
			left: rect.left,
			top: rect.top,
			width: Math.max(rect.width, 1),
			height: Math.max(rect.height, 1),
		};
	};

	/* Destinazione media = rettangolo reale a riposo (layout 2×, senza scale CSS). */
	const prepareActiveMedia = (mediaEl) => {
		const card = mediaEl.closest(".work-card");
		if (card) {
			document.querySelectorAll(".work-card.is-active").forEach((node) => {
				if (node !== card) node.classList.remove("is-active");
			});
			card.classList.add("is-active");
		}

		mediaEl.style.transition = "none";
		mediaEl.style.transform = "none";
		mediaEl.style.opacity = "1";
		void mediaEl.offsetHeight;
	};

	/*
	  FLIP sui target reali (footer):
	  a fine animazione non c'è swap proxy→DOM → niente scatto sul testo.
	  uniform=true: scale uguale su X/Y.
	*/
	const flipTargetFrom = (el, first, last, duration, { uniform = false } = {}) => {
		const scaleX = first.width / last.width;
		const scaleY = uniform ? scaleX : first.height / last.height;
		const dx = first.left - last.left;
		const dy = first.top - last.top;

		el.style.transformOrigin = "top left";
		el.style.willChange = "transform";
		el.style.transform = `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`;

		return el
			.animate(
				[
					{ transform: `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})` },
					{ transform: "translate(0px, 0px) scale(1, 1)" },
				],
				{
					duration,
					easing: EASE,
					fill: "forwards",
				}
			)
			.finished.then(() => {
				el.style.transform = "";
				el.style.willChange = "";
			});
	};

	/* Proxy fixed in screen-space (per il media, che ha già transform CSS sul carosello) */
	const flipProxyTo = (el, first, last, duration) => {
		const sx = last.width / first.width;
		const sy = last.height / first.height;
		const dx = last.left - first.left;
		const dy = last.top - first.top;

		el.classList.add("is-flipping");
		el.style.position = "fixed";
		el.style.left = `${first.left}px`;
		el.style.top = `${first.top}px`;
		el.style.width = `${first.width}px`;
		el.style.height = `${first.height}px`;
		el.style.margin = "0";
		el.style.right = "auto";
		el.style.bottom = "auto";
		el.style.zIndex = "90";
		el.style.transformOrigin = "top left";
		el.style.clipPath = "none";
		el.style.visibility = "visible";
		el.style.opacity = "1";
		el.style.transform = "translate(0px, 0px) scale(1, 1)";

		return el.animate(
			[
				{ transform: "translate(0px, 0px) scale(1, 1)" },
				{ transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
			],
			{
				duration,
				easing: EASE,
				fill: "forwards",
			}
		).finished;
	};

	const settleToPage = async () => {
		const introSans = intro.querySelector(".site-intro__word--sans");
		const introSerif = intro.querySelector(".site-intro__word--serif");
		const introMedia = intro.querySelector("[data-intro-media]");
		const targetSans = document.querySelector(".site-wordmark__sans");
		const targetSerif = document.querySelector(".site-wordmark__serif");
		const targetMedia =
			document.querySelector('.work-card[data-initial="true"] .work-media') ||
			document.querySelector(".work-card .work-media");

		if (!introSans || !introSerif || !introMedia || !targetSans || !targetSerif || !targetMedia) {
			document.documentElement.classList.remove("has-intro");
			intro.classList.add("is-exiting");
			await wait(500);
			cleanupIntro();
			return;
		}

		const firstSans = rectOf(introSans);
		const firstSerif = rectOf(introSerif);
		const firstMedia = rectOf(introMedia);

		intro.classList.add("is-settling");
		document.documentElement.classList.add("is-intro-settling");
		document.documentElement.classList.remove("has-intro");

		/* Il media reale è l'attore FLIP (come il wordmark): niente swap proxy→DOM. */
		prepareActiveMedia(targetMedia);
		introMedia.style.opacity = "0";
		introMedia.style.visibility = "hidden";

		void document.body.offsetHeight;

		const lastSans = rectOf(targetSans);
		const lastSerif = rectOf(targetSerif);
		const lastMedia = rectOf(targetMedia);

		const flips = Promise.all([
			flipTargetFrom(targetSans, firstSans, lastSans, 1450, { uniform: true }),
			flipTargetFrom(targetSerif, firstSerif, lastSerif, 1450, { uniform: true }),
			flipTargetFrom(targetMedia, firstMedia, lastMedia, 1450),
		]);

		await wait(180);
		document.documentElement.classList.add("is-page-in");

		await flips;

		targetMedia.style.transition = "none";
		targetMedia.style.transform = "";
		targetMedia.style.opacity = "";
		void targetMedia.offsetHeight;

		cleanupIntro();

		window.requestAnimationFrame(() => {
			targetMedia.style.transition = "";
		});
	};

	if (prefersReduced.matches) {
		finishWithoutMotion();
		return;
	}

	buildLetters();
	intro.removeAttribute("hidden");
	intro.setAttribute("aria-hidden", "false");

	const run = async () => {
		await wait(40);
		intro.classList.add("is-letters-in");
		await wait(1180);
		intro.classList.add("is-split", "is-media-in");
		await wait(1100);
		await settleToPage();
	};

	run();
});

/* Carousel:
   - desktop: loop infinito + card attiva centrata + scaling visivo guidato dallo scroll
   - mobile: snap nativo + massimo una tile per swipe + riallineamento istantaneo nel set centrale
   - fix: evita il loop/glitch causato da smooth scroll + normalize sui cloni in mobile */
   document.addEventListener("DOMContentLoaded", () => {
	/* Riferimenti principali del carosello e controlli desktop */
	const scroller = document.getElementById("workScroller");
	if (!scroller) return;

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

	/* Desktop: trackpad/wheel + drag del mouse (niente frecce) */
	scroller.addEventListener(
		"wheel",
		(event) => {
			if (isMobile()) return;

			const absX = Math.abs(event.deltaX);
			const absY = Math.abs(event.deltaY);
			const delta = absX > absY ? event.deltaX : event.deltaY;
			if (!delta) return;

			event.preventDefault();
			scroller.scrollLeft += delta;
		},
		{ passive: false }
	);

	let pointerDrag = null;

	scroller.addEventListener("pointerdown", (event) => {
		if (isMobile()) return;
		if (event.pointerType === "touch") return;
		if (event.button !== 0) return;

		pointerDrag = {
			pointerId: event.pointerId,
			startX: event.clientX,
			startScroll: scroller.scrollLeft,
			moved: false,
		};
		scroller.classList.add("is-dragging");
		scroller.setPointerCapture?.(event.pointerId);
	});

	scroller.addEventListener("pointermove", (event) => {
		if (!pointerDrag || event.pointerId !== pointerDrag.pointerId) return;

		const dx = event.clientX - pointerDrag.startX;
		if (!pointerDrag.moved && Math.abs(dx) > 3) {
			pointerDrag.moved = true;
		}
		if (!pointerDrag.moved) return;

		event.preventDefault();
		scroller.scrollLeft = pointerDrag.startScroll - dx;
	});

	const endPointerDrag = (event) => {
		if (!pointerDrag || event.pointerId !== pointerDrag.pointerId) return;

		const didDrag = pointerDrag.moved;
		pointerDrag = null;
		scroller.classList.remove("is-dragging");

		if (didDrag) {
			/* Evita il click sul progetto dopo un drag */
			const blockClick = (clickEvent) => {
				clickEvent.preventDefault();
				clickEvent.stopPropagation();
				scroller.removeEventListener("click", blockClick, true);
			};
			scroller.addEventListener("click", blockClick, true);
		}
	};

	scroller.addEventListener("pointerup", endPointerDrag);
	scroller.addEventListener("pointercancel", endPointerDrag);

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