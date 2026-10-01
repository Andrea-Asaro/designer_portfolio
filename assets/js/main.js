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

	/* FLIP della media della tile attiva.
	   La tile a riposo è scalata dal CSS (scale 2 con origin top center):
	   si anima da "first" fino esattamente a quel transform, espresso con origin 0 0,
	   così al termine basta togliere l'animazione e il CSS prosegue senza scatti. */
	const flipMediaFrom = (media, first, duration) => {
		const box = media.parentElement.getBoundingClientRect();
		const width = Math.max(box.width, 1);
		const height = Math.max(box.height, 1);
		const rest = new DOMMatrixReadOnly(getComputedStyle(media).transform);
		const restScale = rest.a || 1;
		const restX = rest.e + (width / 2) * (1 - restScale);

		media.style.opacity = "1";
		media.style.transformOrigin = "0 0";

		const animation = media.animate(
			[
				{
					transform: `translate(${first.left - box.left}px, ${first.top - box.top}px) scale(${first.width / width}, ${first.height / height})`,
				},
				{ transform: `translate(${restX}px, 0px) scale(${restScale}, ${restScale})` },
			],
			{ duration, easing: EASE, fill: "forwards" }
		);

		return animation.finished.then(() => animation);
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
			await wait(600);
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
		introMedia.style.opacity = "0";
		introMedia.style.visibility = "hidden";

		void document.body.offsetHeight;

		const lastSans = rectOf(targetSans);
		const lastSerif = rectOf(targetSerif);

		const flips = Promise.all([
			flipTargetFrom(targetSans, firstSans, lastSans, 1740, { uniform: true }),
			flipTargetFrom(targetSerif, firstSerif, lastSerif, 1740, { uniform: true }),
			flipMediaFrom(targetMedia, firstMedia, 1740),
		]);

		await wait(216);
		document.documentElement.classList.add("is-page-in");

		const [, , mediaAnimation] = await flips;

		targetMedia.style.transition = "none";
		mediaAnimation.cancel();
		targetMedia.style.transformOrigin = "";
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
		await wait(48);
		intro.classList.add("is-letters-in");
		await wait(1416);
		intro.classList.add("is-split", "is-media-in");
		await wait(1320);
		await settleToPage();
	};

	run();
});

/* Carousel (come iamrossmason.com):
   - le tile sono posizionate a mano (transform) su un nastro infinito:
     ogni tile "si avvolge" quando esce da un lato e rientra dall'altro
   - l'input (rotella, trascinamento, frecce) muove il target t,
     la posizione reale tc lo insegue con un lerp (inerzia) e poi fa snap su una tile
   - desktop: 7 colonne; la tile al centro è attiva (scale 2 dall'alto),
     quelle a sinistra/destra si scostano di mezza tile.
     --diff attenua l'effetto mentre si scorre veloce, come nel reference
   - l'attiva termina sulla base della scritta DADDARIO rosanna (copre tutta l'altezza del nome)
   - mobile: tile uguali, trascinamento più rapido del dito, tap per aprire */
document.addEventListener("DOMContentLoaded", () => {
	const scroller = document.getElementById("workScroller");
	if (!scroller) return;

	const mobileQuery = window.matchMedia("(max-width: 860px)");
	const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
	const content = scroller.closest("main");
	const header = document.querySelector(".site-shell > header");
	const wordmark = document.querySelector(".site-wordmark");
	const wordmarkSans = document.querySelector(".site-wordmark__sans");
	const footer = wordmark?.closest("footer");

	const LERP = 0.1;
	const SNAP_DELAY = 100;
	const RATIO = 1.25; // tile 4:5
	const ACTIVE_SCALE = 2;
	const COLUMNS = 7;
	const DRAG_TAP = 10; // sotto questa soglia il trascinamento è un tap

	const originals = Array.from(scroller.querySelectorAll(".work-card"));
	const count = originals.length;
	if (!count) return;

	const initialIndex = Math.max(0, originals.findIndex((card) => card.dataset.initial === "true"));
	const slides = originals.slice();

	let ww = 0;
	let slideW = 0;
	let total = 0;
	let lo = 0;
	let offset = 0;
	let centerX = 0;
	let t = 0;
	let tc = 0;
	let current = -1;
	let snapTimer = 0;
	let rafId = 0;
	let lastTime = 0;
	let drag = null;

	const isMobile = () => mobileQuery.matches;
	const mod = (value, size) => ((value % size) + size) % size;
	const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

	/* Un set di cloni in coda: il nastro deve essere più largo dello schermo + 4 tile,
	   altrimenti il punto in cui una tile si avvolge sarebbe visibile */
	const appendCloneSet = () => {
		originals.forEach((card) => {
			const clone = card.cloneNode(true);
			clone.removeAttribute("data-initial");
			clone.setAttribute("aria-hidden", "true");
			clone.querySelectorAll("a").forEach((link) => {
				link.tabIndex = -1;
			});
			scroller.appendChild(clone);
			slides.push(clone);
		});
	};

	/* Posizione verticale di un elemento dentro main, ignorando i transform
	   (l'intro anima wordmark e header con transform mentre qui si misura) */
	const offsetTopIn = (el, ancestor) => {
		let top = 0;
		let node = el;
		while (node && node !== ancestor) {
			top += node.offsetTop;
			node = node.offsetParent;
		}
		return node === ancestor ? top : top - (ancestor?.offsetTop || 0);
	};

	/* Sonda a larghezza zero dentro "DADDARIO": il suo bordo inferiore è la linea di base */
	const probe = document.createElement("span");
	probe.setAttribute("aria-hidden", "true");
	probe.style.cssText = "display:inline-block;width:0;height:0;overflow:hidden;vertical-align:baseline;";
	wordmarkSans?.appendChild(probe);

	const measure = () => {
		ww = scroller.clientWidth || window.innerWidth;

		const headerBottom = header ? header.offsetTop + header.offsetHeight - (content?.offsetTop || 0) : 0;
		const meta = originals[0].querySelector(".work-meta");
		const metaH = meta ? meta.offsetHeight : 0;
		let stageTop;

		if (footer) footer.style.paddingBottom = "";

		if (!isMobile() && wordmarkSans) {
			/* Fondo dell'attiva = base della scritta, più il piccolo overshoot delle lettere tonde */
			const fontSize = parseFloat(getComputedStyle(wordmark).fontSize) || 0;
			const bottom = offsetTopIn(probe, content) + fontSize * 0.02;
			const minTop = headerBottom + metaH + 16;
			slideW = Math.max(60, Math.min(ww / COLUMNS, (bottom - minTop) / (RATIO * ACTIVE_SCALE)));
			stageTop = bottom - slideW * RATIO * ACTIVE_SCALE;

			/* Schermi alti (tablet in verticale): invece di far scendere le tile a metà pagina
			   si alza la scritta fino al fondo dell'attiva */
			const maxTop = Math.max(ww * 0.197, window.innerHeight * 0.4);
			if (footer && stageTop > maxTop) {
				const lift = stageTop - maxTop;
				const basePadding = parseFloat(getComputedStyle(footer).paddingBottom) || 0;
				footer.style.paddingBottom = `${basePadding + lift}px`;
				stageTop = maxTop;
			}
		} else {
			/* Mobile: margini laterali come nel reference (60px su 390px) */
			const side = clamp(ww * (60 / 390), 24, 96);
			const top = headerBottom + metaH + clamp(window.innerHeight * 0.06, 24, 64);
			const wordmarkTop = wordmark ? offsetTopIn(wordmark, content) : window.innerHeight;
			const maxH = Math.max(120, wordmarkTop - 24 - top);
			slideW = Math.min(ww - side * 2, maxH / RATIO);
			stageTop = top;
		}

		while (slides.length * slideW < ww + slideW * 4) appendCloneSet();

		total = slides.length * slideW;
		centerX = (ww - slideW) / 2;
		const slotsBefore = Math.ceil((centerX + slideW * 2) / slideW);
		lo = centerX - slotsBefore * slideW;
		offset = (slotsBefore - initialIndex) * slideW;

		scroller.style.setProperty("--slide-w", `${slideW}px`);
		scroller.style.setProperty("--stage-top", `${stageTop}px`);
	};

	const setCurrent = (index) => {
		if (index === current) return;
		slides[current]?.classList.remove("is-active");
		current = index;
		slides[current]?.classList.add("is-active");
	};

	const render = () => {
		const diff = clamp(1 - Math.abs(0.001 * (t - tc)), 0, 1);
		scroller.style.setProperty("--diff", diff.toFixed(3));

		let nearest = 0;
		let nearestDistance = Infinity;
		const xs = slides.map((slide, i) => {
			const x = lo + mod(i * slideW - tc + offset, total);
			const distance = Math.abs(x - centerX);
			if (distance < nearestDistance) {
				nearestDistance = distance;
				nearest = i;
			}
			return x;
		});

		setCurrent(nearest);

		slides.forEach((slide, i) => {
			const x = xs[i];
			const visible = x > -slideW * 2 && x < ww + slideW;
			slide.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
			slide.classList.toggle("is-off", !visible);
			slide.classList.toggle("is-left", i !== nearest && x < centerX);
			slide.classList.toggle("is-right", i !== nearest && x > centerX);
		});
	};

	const tick = (now) => {
		const ratio = lastTime ? Math.min((now - lastTime) / (1000 / 60), 4) : 1;
		lastTime = now;

		tc = prefersReduced.matches ? t : tc + (t - tc) * Math.min(1, LERP * ratio);
		if (Math.abs(t - tc) < 0.1) tc = t;

		render();

		if (tc !== t || drag) {
			rafId = window.requestAnimationFrame(tick);
			return;
		}
		rafId = 0;
		lastTime = 0;
	};

	const kick = () => {
		if (rafId) return;
		lastTime = 0;
		rafId = window.requestAnimationFrame(tick);
	};

	const snap = () => {
		t = Math.round(t / slideW) * slideW;
		kick();
	};

	const moveBy = (delta) => {
		t += delta;
		kick();
		window.clearTimeout(snapTimer);
		snapTimer = window.setTimeout(snap, SNAP_DELAY);
	};

	/* Rotella / trackpad: la home non scorre in verticale, quindi ogni scroll muove il nastro */
	window.addEventListener(
		"wheel",
		(event) => {
			if (document.body.classList.contains("is-menu-open")) return;
			const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
			const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
			if (!delta) return;
			event.preventDefault();
			moveBy(delta * unit);
		},
		{ passive: false }
	);

	/* Trascinamento (mouse e touch): il nastro si muove più veloce del puntatore,
	   2× col mouse e 3.5× col dito come nel reference; al rilascio snap */
	scroller.addEventListener("pointerdown", (event) => {
		if (event.pointerType === "mouse" && event.button !== 0) return;
		const speed = event.pointerType === "mouse" ? 2 : 3.5;
		drag = {
			id: event.pointerId,
			startX: event.clientX,
			startY: event.clientY,
			speed,
			on: t + event.clientX * speed,
			moved: false,
		};
		window.clearTimeout(snapTimer);
	});

	window.addEventListener(
		"pointermove",
		(event) => {
			if (!drag || event.pointerId !== drag.id) return;
			const dx = event.clientX - drag.startX;
			const dy = event.clientY - drag.startY;
			if (!drag.moved && Math.abs(dx) >= DRAG_TAP && Math.abs(dx) > Math.abs(dy)) {
				drag.moved = true;
				scroller.classList.add("is-dragging");
			}
			t = drag.on - event.clientX * drag.speed;
			kick();
		},
		{ passive: true }
	);

	const endDrag = (event) => {
		if (!drag || event.pointerId !== drag.id) return;
		const didDrag = drag.moved;
		drag = null;
		scroller.classList.remove("is-dragging");
		snap();

		if (didDrag) {
			/* Dopo un trascinamento il click non deve aprire il progetto */
			const blockClick = (clickEvent) => {
				clickEvent.preventDefault();
				clickEvent.stopPropagation();
			};
			scroller.addEventListener("click", blockClick, { capture: true, once: true });
			window.setTimeout(() => scroller.removeEventListener("click", blockClick, { capture: true }), 80);
		}
	};

	window.addEventListener("pointerup", endDrag);
	window.addEventListener("pointercancel", endDrag);

	/* Il browser non deve trascinare immagini o link */
	scroller.addEventListener("dragstart", (event) => event.preventDefault());

	/* Tastiera: frecce = una tile; il focus su un link porta la sua tile al centro */
	scroller.addEventListener("keydown", (event) => {
		if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
		event.preventDefault();
		t = Math.round(t / slideW) * slideW + (event.key === "ArrowRight" ? slideW : -slideW);
		kick();
	});

	scroller.addEventListener("focusin", (event) => {
		if (drag || !event.target.matches(":focus-visible")) return;
		const slide = event.target.closest(".work-card");
		const index = slides.indexOf(slide);
		if (index < 0 || index === current) return;
		const x = lo + mod(index * slideW - tc + offset, total);
		t = Math.round((tc + x - centerX) / slideW) * slideW;
		kick();
	});

	/* overflow:hidden scorre comunque quando il focus va su un elemento fuori vista */
	scroller.addEventListener("scroll", () => {
		scroller.scrollLeft = 0;
	});

	const relayout = () => {
		const units = slideW ? t / slideW : 0;
		const unitsCurrent = slideW ? tc / slideW : 0;
		measure();
		t = units * slideW;
		tc = unitsCurrent * slideW;
		render();
	};

	let resizeRaf = 0;
	window.addEventListener("resize", () => {
		if (resizeRaf) return;
		resizeRaf = window.requestAnimationFrame(() => {
			resizeRaf = 0;
			relayout();
		});
	});
	mobileQuery.addEventListener?.("change", relayout);
	document.fonts?.ready.then(relayout);

	measure();
	render();
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


/* Projects deck:
   all'arrivo le immagini sono già in volo da un mazzo al centro della viewport
   verso la propria cella della griglia (il mazzo chiuso non si vede mai);
   solo alla fine compaiono anni e titoli.
   Curva e durata del volo sono quelle dell'intro della home. */
document.addEventListener("DOMContentLoaded", () => {
	const root = document.documentElement;
	if (!root.classList.contains("has-deck")) return;

	const cards = Array.from(document.querySelectorAll(".projects-year__grid .project-tile__media"));
	const texts = Array.from(document.querySelectorAll(".projects-year__label, .project-tile__title"));
	if (!cards.length || typeof Element.prototype.animate !== "function") {
		root.classList.remove("has-deck");
		return;
	}

	const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
	const FADE_IN = 480; // le carte compaiono mentre sono già in movimento
	const HEAD_START = 24; // al primo frame la distribuzione è quasi all'inizio
	const STAGGER = 84; // ogni carta atterra un po' dopo la precedente
	const DEAL = 1740; // volo della prima carta (come il FLIP della home)
	const TEXT_IN = 1080; // comparsa di anni e titoli
	const MAX_WAIT = 600; // attesa massima delle immagini prima di partire

	/* Tutte le immagini vanno caricate e decodificate prima del volo,
	   altrimenti la decodifica a metà animazione crea scatti */
	const images = cards.map((card) => card.querySelector("img")).filter(Boolean);
	images.forEach((img) => {
		img.loading = "eager";
	});
	const decoded = Promise.all(images.map((img) => (img.decode ? img.decode().catch(() => {}) : null)));
	const timeout = new Promise((resolve) => window.setTimeout(resolve, MAX_WAIT));

	const deal = () => {
		/* Mazzo centrato nella viewport visibile */
		const deckX = window.innerWidth / 2;
		const deckY = window.innerHeight / 2;

		cards.forEach((card, i) => {
			const rect = card.getBoundingClientRect();
			const dx = deckX - (rect.left + rect.width / 2);
			const dy = deckY - (rect.top + rect.height / 2) - i; // spessore del mazzo
			const tilt = (i % 2 ? 1 : -1) * (0.6 + ((i * 7) % 4) * 0.35);

			/* La prima carta distribuita è quella in cima al mazzo */
			card.classList.add("is-dealing");
			card.style.zIndex = String(cards.length - i);

			/* Partono tutte insieme e nessuna resta ferma nel mazzo:
			   la distribuzione nasce dalla durata, che cresce di carta in carta */
			card.animate(
				[
					{ transform: `translate3d(${dx}px, ${dy}px, 0) rotate(${tilt}deg) scale(0.9)` },
					{ transform: "translate3d(0, 0, 0) rotate(0deg) scale(1)" },
				],
				{ duration: DEAL + i * STAGGER, delay: -HEAD_START, easing: EASE, fill: "backwards" }
			);

			card.animate([{ opacity: 0 }, { opacity: 1 }], { duration: FADE_IN, easing: EASE, fill: "backwards" });
		});

		/* Anni e titoli restano nascosti finché l'ultima carta non ha quasi finito */
		const dealEnd = DEAL + (cards.length - 1) * STAGGER - HEAD_START;
		const textDelay = dealEnd - DEAL * 0.4;
		texts.forEach((text, i) => {
			text.animate(
				[
					{ opacity: 0, transform: "translate3d(0, 14px, 0)" },
					{ opacity: 1, transform: "none" },
				],
				{ duration: TEXT_IN, delay: textDelay + Math.min(i, 8) * 48, easing: EASE, fill: "backwards" }
			);
		});

		root.classList.remove("has-deck");

		/* Timer invece di animation.finished: le promise non si risolvono
		   se la scheda è in background o non renderizza frame */
		window.setTimeout(() => {
			cards.forEach((card) => {
				card.classList.remove("is-dealing");
				card.style.zIndex = "";
			});
		}, dealEnd);
	};

	Promise.race([decoded, timeout]).then(() => window.requestAnimationFrame(deal));
});

/* Text reveal:
   stessa comparsa dei testi della pagina projects (salita di 14px + fade,
   curva dell'intro della home), un elemento [data-reveal] dopo l'altro */
document.addEventListener("DOMContentLoaded", () => {
	const root = document.documentElement;
	if (!root.classList.contains("has-reveal")) return;

	const items = Array.from(document.querySelectorAll("[data-reveal]"));
	if (!items.length || typeof Element.prototype.animate !== "function") {
		root.classList.remove("has-reveal", "has-reveal-media");
		return;
	}

	const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
	const TEXT_IN = 1080;
	const STAGGER = 48;
	const START = 216; // come il page-in della home

	items.forEach((item, i) => {
		item.animate(
			[
				{ opacity: 0, transform: "translate3d(0, 14px, 0)" },
				{ opacity: 1, transform: "none" },
			],
			{ duration: TEXT_IN, delay: START + i * STAGGER, easing: EASE, fill: "backwards" }
		);
	});

	root.classList.remove("has-reveal");

	/* Immagini [data-reveal-media] (foto about): stesso reveal delle pagine progetto,
	   insieme al primo testo. has-reveal-media resta: le regole CSS ne dipendono */
	const media = Array.from(document.querySelectorAll("[data-reveal-media]"));
	window.setTimeout(() => {
		media.forEach((el) => el.classList.add("is-in"));
	}, START);
});

/* Project pages:
   titolo hero lettera per lettera all'apertura, poi anno e meta;
   cover, galleria e testi dell'intro entrano quando arrivano nella viewport */
document.addEventListener("DOMContentLoaded", () => {
	const root = document.documentElement;
	if (!root.classList.contains("has-project-motion")) return;

	const title = document.querySelector(".project-hero__title");
	const LETTER_STAGGER = 48;
	const TEXT_STAGGER = 48;

	/* Titolo: ogni parola è una maschera, ogni lettera sale al suo interno.
	   Il testo originale resta disponibile agli screen reader tramite aria-label */
	let letterCount = 0;
	if (title) {
		title.setAttribute("aria-label", title.textContent.replace(/\s+/g, " ").trim());

		const splitNode = (node) => {
			if (node.nodeType === Node.TEXT_NODE) {
				const fragment = document.createDocumentFragment();
				node.textContent.split(/(\s+)/).forEach((part) => {
					if (!part) return;
					if (/^\s+$/.test(part)) {
						fragment.appendChild(document.createTextNode(" "));
						return;
					}
					const word = document.createElement("span");
					word.className = "project-title__word";
					word.setAttribute("aria-hidden", "true");
					Array.from(part).forEach((char) => {
						const letter = document.createElement("span");
						letter.className = "project-title__letter";
						letter.textContent = char;
						letter.style.transitionDelay = `${letterCount * LETTER_STAGGER}ms`;
						letterCount += 1;
						word.appendChild(letter);
					});
					fragment.appendChild(word);
				});
				node.replaceWith(fragment);
				return;
			}
			Array.from(node.childNodes).forEach(splitNode);
		};

		Array.from(title.childNodes).forEach(splitNode);
	}

	/* Anno e meta dopo il titolo */
	const heroTexts = Array.from(document.querySelectorAll(".project-hero__year, .project-hero__meta-item"));
	const heroTextsStart = 360 + letterCount * LETTER_STAGGER;
	heroTexts.forEach((el, i) => {
		el.style.transitionDelay = `${heroTextsStart + i * 96}ms`;
	});

	/* Cover e immagini della galleria */
	const media = Array.from(document.querySelectorAll(".project-cover figure, section[aria-label^='Galleria'] figure"));
	media.forEach((figure) => figure.classList.add("project-media"));

	/* Testi dell'intro, in ordine di lettura */
	const introTexts = Array.from(
		document.querySelectorAll(
			".project-intro__index, .project-intro__title, .project-intro__label, .project-intro__body > p"
		)
	);
	introTexts.forEach((el, i) => {
		el.style.transitionDelay = `${i * TEXT_STAGGER}ms`;
	});

	/* Due frame: il browser registra lo stato iniziale prima di far partire le transition */
	window.requestAnimationFrame(() => {
		window.requestAnimationFrame(() => {
			title?.classList.add("is-in");
			heroTexts.forEach((el) => el.classList.add("is-in"));
		});
	});

	const reveal = (el) => el.classList.add("is-in");

	if (!("IntersectionObserver" in window)) {
		[...media, ...introTexts].forEach(reveal);
		return;
	}

	const observer = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (!entry.isIntersecting) return;
				reveal(entry.target);
				observer.unobserve(entry.target);
			});
		},
		{ rootMargin: "0px 0px -12% 0px", threshold: 0.01 }
	);

	[...media, ...introTexts].forEach((el) => observer.observe(el));
});

/* Apertura progetto (come iamrossmason.com):
   1. in home l'immagine cliccata vola (1.2s, expo.inOut) in un riquadro 16:9 in alto
      (a schermo pieno su mobile) mentre il resto della pagina sfuma in 0.42s
   2. la pagina progetto riparte con l'immagine nello stesso punto
      (disegnata dal CSS già al primo paint, vedi has-flight nell'head)
      e la fa volare fino alla cover, dove si dissolve nella cover vera */
const FLIGHT_KEY = "pageFlight";
const FLIGHT_EASE = "cubic-bezier(0.87, 0, 0.13, 1)"; // expo.inOut
const FLIGHT_DURATION = 1200;

const createFlight = (src, rect) => {
	const flight = document.createElement("div");
	flight.className = "page-flight";
	flight.setAttribute("aria-hidden", "true");
	const img = document.createElement("img");
	img.src = src;
	img.alt = "";
	flight.appendChild(img);
	Object.assign(flight.style, {
		left: `${rect.left}px`,
		top: `${rect.top}px`,
		width: `${rect.width}px`,
		height: `${rect.height}px`,
	});
	document.body.appendChild(flight);
	return flight;
};

/* Home: uscita */
document.addEventListener("DOMContentLoaded", () => {
	const scroller = document.getElementById("workScroller");
	const shell = document.querySelector(".site-shell");
	if (!scroller || !shell) return;

	const mobileQuery = window.matchMedia("(max-width: 860px)");
	const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
	let leaving = null;

	const flightTarget = () => {
		const vw = window.innerWidth;
		if (mobileQuery.matches) return { left: 0, top: 0, width: vw, height: window.innerHeight };
		const side = Math.min(48, Math.max(16, vw * 0.04));
		const width = vw - side * 2;
		return { left: side, top: vw * 0.08, width, height: (width * 9) / 16 };
	};

	scroller.addEventListener("click", (event) => {
		const link = event.target.closest(".work-link");
		if (!link || event.defaultPrevented || leaving) return;
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		if (prefersReduced.matches || typeof Element.prototype.animate !== "function") return;

		const media = link.querySelector(".work-media");
		const img = media?.querySelector("img");
		if (!media || !img) return;

		event.preventDefault();

		const first = media.getBoundingClientRect();
		const last = flightTarget();
		const flight = createFlight(img.currentSrc || img.src, first);
		media.style.visibility = "hidden";
		document.body.style.pointerEvents = "none";

		const toRect = (r) => ({
			left: `${r.left}px`,
			top: `${r.top}px`,
			width: `${r.width}px`,
			height: `${r.height}px`,
		});

		const animations = [
			flight.animate([toRect(first), toRect(last)], {
				duration: FLIGHT_DURATION,
				easing: FLIGHT_EASE,
				fill: "forwards",
			}),
			shell.animate([{ opacity: 1 }, { opacity: 0 }], {
				duration: 420,
				easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
				fill: "forwards",
			}),
		];

		leaving = { flight, media, animations };

		/* Timer invece di animation.finished: le promise si bloccano se la scheda non renderizza */
		window.setTimeout(() => {
			try {
				sessionStorage.setItem(
					FLIGHT_KEY,
					JSON.stringify({ src: flight.firstChild.src, rect: last, to: link.pathname, at: Date.now() })
				);
			} catch (_) {}
			window.location.href = link.href;
		}, FLIGHT_DURATION);
	});

	/* Tornando indietro (bfcache) la home deve ricomparire intatta */
	window.addEventListener("pageshow", (event) => {
		if (!event.persisted || !leaving) return;
		leaving.animations.forEach((animation) => animation.cancel());
		leaving.flight.remove();
		leaving.media.style.visibility = "";
		document.body.style.pointerEvents = "";
		leaving = null;
	});
});

/* Pagina progetto: arrivo */
document.addEventListener("DOMContentLoaded", () => {
	const root = document.documentElement;
	if (!root.classList.contains("has-flight")) return;

	let data = null;
	try {
		data = JSON.parse(sessionStorage.getItem(FLIGHT_KEY) || "null");
		sessionStorage.removeItem(FLIGHT_KEY);
	} catch (_) {}

	const figure = document.querySelector(".project-cover figure");
	const cover = figure?.querySelector("img, video");
	if (!data || !figure || !cover) {
		root.classList.remove("has-flight");
		return;
	}

	/* L'elemento vero prende il posto dello pseudo-elemento nello stesso frame */
	const flight = createFlight(data.src, data.rect);
	const coverLayer = document.createElement("img");
	coverLayer.src = cover.currentSrc || cover.src;
	coverLayer.alt = "";
	coverLayer.style.opacity = "0";
	flight.appendChild(coverLayer);

	figure.classList.add("is-landed");
	figure.style.visibility = "hidden";
	root.classList.remove("has-flight");

	const from = data.rect;
	const expoInOut = (p) => {
		if (p <= 0) return 0;
		if (p >= 1) return 1;
		return p < 0.5 ? Math.pow(2, 20 * p - 10) / 2 : (2 - Math.pow(2, -20 * p + 10)) / 2;
	};
	const lerp = (a, b, p) => a + (b - a) * p;

	let start = 0;
	let done = false;

	const land = () => {
		if (done) return;
		done = true;
		figure.style.visibility = "";
		flight.remove();
	};

	/* rAF manuale: il punto d'arrivo si rilegge a ogni frame, così segue scroll e layout */
	const step = (now) => {
		if (done) return;
		if (!start) start = now;
		const progress = Math.min(1, (now - start) / FLIGHT_DURATION);
		const eased = expoInOut(progress);
		const to = cover.getBoundingClientRect();

		flight.style.left = `${lerp(from.left, to.left, eased)}px`;
		flight.style.top = `${lerp(from.top, to.top, eased)}px`;
		flight.style.width = `${lerp(from.width, to.width, eased)}px`;
		flight.style.height = `${lerp(from.height, to.height, eased)}px`;
		coverLayer.style.opacity = String(Math.min(1, Math.max(0, (eased - 0.2) / 0.6)));

		if (progress < 1) {
			window.requestAnimationFrame(step);
			return;
		}
		land();
	};

	window.requestAnimationFrame(step);
	window.setTimeout(land, FLIGHT_DURATION + 400);
});
