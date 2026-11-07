(() => {
  "use strict";

  /* ---------- данные ---------- */
  const WA = "79064800076";
  const FREE_FROM = 3000;
  const CAT_ICON = { "Горячие блюда": "o-star", "Чуду и выпечка": "o-rhomb", "Сеты и наборы": "o-chev", "Салаты и закуски": "o-mount", "Полуфабрикаты": "o-rhomb" };

  const items = window.NASI_MENU.map((r, i) => ({ id: "p" + i, cat: r[0], name: r[1], desc: r[2], price: r[3], photo: r[4] }));
  const byId = Object.fromEntries(items.map(p => [p.id, p]));
  const byName = n => items.find(p => p.name === n);
  const cats = [...new Set(items.map(p => p.cat))];

  const $ = s => document.querySelector(s);
  const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FINE = matchMedia("(pointer: fine)").matches;
  const rub = n => n.toLocaleString("ru-RU").replace(/ |,/g, " ") + " ₽";
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const img = p => p.photo ? "assets/menu/" + p.photo.replace(/\.[^.]+$/, "") + ".jpg" : "";
  const ph = p => `<div class="card__ph"><svg><use href="#${CAT_ICON[p.cat] || "o-rhomb"}"/></svg><span>${esc(p.name)}</span></div>`;
  const media = (p, lazy = true) => p.photo ? `<img src="${img(p)}" alt="${esc(p.name)}"${lazy ? ' loading="lazy"' : ""}>` : ph(p);

  /* ---------- плавный скролл ---------- */
  let lenis = null;
  if (window.Lenis && !REDUCE) { lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true }); lenis.stop(); window.__lenis = lenis; }
  const go = (target, offset = 0) => {
    if (lenis) lenis.scrollTo(target, { offset, duration: 1.6, force: true });
    else if (typeof target === "number") window.scrollTo({ top: target, behavior: "smooth" });
    else target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* ---------- корзина ---------- */
  let cart = {};
  try { cart = JSON.parse(localStorage.getItem("nasi-cart") || "{}") || {}; } catch (_) { cart = {}; }
  Object.keys(cart).forEach(id => { if (!byId[id]) delete cart[id]; });
  const save = () => { try { localStorage.setItem("nasi-cart", JSON.stringify(cart)); } catch (_) {} };
  const cartCount = () => Object.values(cart).reduce((a, b) => a + b, 0);
  const cartSum = () => Object.entries(cart).reduce((s, [id, q]) => s + byId[id].price * q, 0);
  function setQty(id, q) {
    if (q <= 0) delete cart[id]; else cart[id] = q;
    save(); renderCart(); refreshAdd(id);
  }
  function add(id) {
    setQty(id, (cart[id] || 0) + 1);
    const b = $("#cartBtn"); b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump");
    toast(byId[id].name + " — в заказе");
  }

  /* ---------- панели ---------- */
  const panels = { nav: [$("#sideNav"), $("#navBackdrop")], cart: [$("#cart"), $("#cartBackdrop")] };
  const openPanel = k => { const [el, bd] = panels[k]; el.classList.add("on"); bd.classList.add("on"); el.setAttribute("aria-hidden", "false"); document.body.classList.add("lock"); if (k === "nav") $("#burgerBtn").setAttribute("aria-expanded", "true"); };
  const closePanel = k => { const [el, bd] = panels[k]; el.classList.remove("on"); bd.classList.remove("on"); el.setAttribute("aria-hidden", "true"); if (k === "nav") $("#burgerBtn").setAttribute("aria-expanded", "false"); if (!document.querySelector(".side-nav.on,.cart.on,.modal.on")) document.body.classList.remove("lock"); };
  $("#burgerBtn").addEventListener("click", () => openPanel("nav"));
  $("#navClose").addEventListener("click", () => closePanel("nav"));
  $("#navBackdrop").addEventListener("click", () => closePanel("nav"));
  $("#sideNav").addEventListener("click", e => { if (e.target.closest("a[href^='#']")) closePanel("nav"); });
  $("#cartBtn").addEventListener("click", () => openPanel("cart"));
  $("#cartClose").addEventListener("click", () => closePanel("cart"));
  $("#cartBackdrop").addEventListener("click", () => closePanel("cart"));

  const hdr = $("#hdr");
  const onScroll = () => hdr.classList.toggle("is-solid", window.scrollY > 40);
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

  /* ---------- открыто сейчас? (Махачкала = МСК) ---------- */
  (function () {
    const el = $("#openStatus"), d = new Date();
    const h = (d.getUTCHours() + 3) % 24 + d.getUTCMinutes() / 60;
    const open = h >= 9 && h < 20;
    el.classList.add(open ? "open" : "closed");
    el.querySelector("b").textContent = open ? "Сейчас открыто · 9:00 — 20:00" : "Сейчас закрыто · откроемся в 9:00";
  })();

  /* ---------- хиты ---------- */
  const HITS = ["Чуду тонкое с мясом", "Курзе мясо", "Шах плов с мясом", "Сет баранья голова", "Пиде мясное", "Осетинский пирог: картофель, сыр", "Сет хинкал", "Манты с тыквой", "Хачапури по-аджарски", "Открытое чуду"];
  $("#hitsTrack").innerHTML = HITS.map(byName).filter(Boolean).map(p => `
    <article class="poster" data-open="${p.id}" tabindex="0" role="button" aria-label="${esc(p.name)}">
      <div class="poster__img">${media(p)}<div class="poster__price">${rub(p.price)}</div></div>
      <h3>${esc(p.name)}</h3>
      <p>${esc(p.desc)}</p>
    </article>`).join("");
  const track = $("#hitsTrack");
  const step = () => (track.querySelector(".poster")?.offsetWidth || 300) + 22;
  $("#hitsPrev").addEventListener("click", () => track.scrollBy({ left: -step(), behavior: "smooth" }));
  $("#hitsNext").addEventListener("click", () => track.scrollBy({ left: step(), behavior: "smooth" }));

  /* ---------- полуфабрикаты ---------- */
  const FROZEN = ["Хинкал лакский 1 кг", "Слоёный хинкал с орехами 1 кг", "Курзе мясо 1 кг", "Манты с мясом 1 кг", "Долма 1 кг", "Цветные пельмени 1 кг"];
  $("#frozenList").innerHTML = FROZEN.map(byName).filter(Boolean).map(p =>
    `<li class="reveal"><span>${esc(p.name)}</span><i></i><b>${rub(p.price)}</b></li>`).join("");
  $("#frozenBtn").addEventListener("click", e => { e.preventDefault(); go(document.getElementById("cat-" + cats.indexOf("Полуфабрикаты")), -150); });

  /* ---------- Instagram ---------- */
  $("#instaGrid").innerHTML = Array.from({ length: 12 }, (_, i) =>
    `<a href="https://instagram.com/nasi.gourme" target="_blank" rel="noopener" class="reveal" aria-label="Пост в Instagram"><img src="assets/insta/ig${String(i).padStart(2, "0")}.jpg" alt="" loading="lazy"></a>`).join("");

  /* ---------- меню ---------- */
  $("#factCount").textContent = items.length;
  $("#factCount").dataset.count = items.length;
  $("#cats").innerHTML = cats.map((c, i) => `<button class="cat${i ? "" : " active"}" data-cat="cat-${i}" role="tab">${c}<sup>${items.filter(p => p.cat === c).length}</sup></button>`).join("");

  const addHTML = p => {
    const q = cart[p.id] || 0;
    return q
      ? `<div class="add in" data-add="${p.id}"><button data-minus="${p.id}" aria-label="Убрать">−</button><b>${q}</b><button data-plus="${p.id}" aria-label="Добавить">+</button></div>`
      : `<button class="add" data-add="${p.id}" data-plus="${p.id}">+ В заказ</button>`;
  };
  $("#menuGrid").innerHTML = cats.map((c, ci) => {
    const list = items.filter(p => p.cat === c);
    return `<div class="menu__group" id="cat-${ci}"><svg><use href="#${CAT_ICON[c] || "o-rhomb"}"/></svg><h3>${c}</h3><span></span><em>${list.length}</em></div>` +
      list.map(p => `
      <article class="card" data-open="${p.id}">
        <div class="card__img">${media(p)}</div>
        <div class="card__body">
          <h4 class="card__title">${esc(p.name)}</h4>
          ${p.desc ? `<p class="card__desc">${esc(p.desc)}</p>` : ""}
          <div class="card__foot"><span class="card__price">${rub(p.price)}</span>${addHTML(p)}</div>
        </div>
      </article>`).join("");
  }).join("");

  function refreshAdd(id) {
    document.querySelectorAll(`[data-add="${id}"]`).forEach(el => { el.outerHTML = addHTML(byId[id]); });
    if (modalId === id) renderModalBuy();
  }

  document.addEventListener("click", e => {
    const plus = e.target.closest("[data-plus]"), minus = e.target.closest("[data-minus]");
    if (plus) { e.stopPropagation(); add(plus.dataset.plus); return; }
    if (minus) { e.stopPropagation(); setQty(minus.dataset.minus, (cart[minus.dataset.minus] || 0) - 1); return; }
    if (e.target.closest(".add")) return;
    const o = e.target.closest("[data-open]");
    if (o) openModal(o.dataset.open);
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Enter" && e.target.matches?.("[data-open]")) openModal(e.target.dataset.open);
    if (e.key === "Escape") { closeModal(); closePanel("cart"); closePanel("nav"); }
  });

  $("#cats").addEventListener("click", e => { const b = e.target.closest(".cat"); if (b) go(document.getElementById(b.dataset.cat), -150); });
  const catBtns = [...document.querySelectorAll(".cat")], groups = [...document.querySelectorAll(".menu__group")];
  window.addEventListener("scroll", () => {
    let cur = groups[0];
    for (const g of groups) if (g.getBoundingClientRect().top < 230) cur = g;
    catBtns.forEach(b => {
      const on = b.dataset.cat === cur.id;
      if (on && !b.classList.contains("active")) b.parentElement.scrollTo({ left: b.offsetLeft - 20, behavior: "smooth" });
      b.classList.toggle("active", on);
    });
  }, { passive: true });

  /* ---------- карточка блюда ---------- */
  const modal = $("#productModal");
  let modalId = null;
  function renderModalBuy() { const q = cart[modalId] || 0; $("#pmAdd").textContent = q ? `В заказе: ${q} · ещё +1` : "В заказ"; }
  function openModal(id) {
    const p = byId[id]; if (!p) return;
    modalId = id;
    $("#pmImgWrap").innerHTML = media(p, false);
    $("#pmCat").textContent = p.cat;
    $("#pmTitle").textContent = p.name;
    $("#pmDesc").textContent = p.desc ? "Состав: " + p.desc : "";
    $("#pmPrice").textContent = rub(p.price);
    renderModalBuy();
    modal.classList.add("on"); modal.setAttribute("aria-hidden", "false"); document.body.classList.add("lock");
  }
  function closeModal() {
    if (!modal.classList.contains("on")) return;
    modal.classList.remove("on"); modal.setAttribute("aria-hidden", "true"); modalId = null;
    if (!document.querySelector(".side-nav.on,.cart.on")) document.body.classList.remove("lock");
  }
  modal.addEventListener("click", e => { if (e.target.closest("[data-close]")) closeModal(); });
  $("#pmAdd").addEventListener("click", () => modalId && add(modalId));

  /* ---------- корзина: отрисовка + заказ в WhatsApp ---------- */
  const form = $("#cartForm");
  form.addEventListener("change", () => { $("#addrFld").style.display = form.how.value === "Доставка" ? "" : "none"; });
  function renderCart() {
    const n = cartCount(), sum = cartSum(), ids = Object.keys(cart);
    const cnt = $("#cartCount"); cnt.textContent = n; cnt.classList.toggle("on", n > 0);
    $("#cartList").innerHTML = ids.length ? ids.map(id => {
      const p = byId[id];
      return `<div class="ci">${p.photo ? `<img src="${img(p)}" alt="">` : `<div class="ci__ph"></div>`}
        <div><h4>${esc(p.name)}</h4><p>${rub(p.price * cart[id])}</p></div>
        <div class="qty"><button data-minus="${id}" aria-label="Убрать">−</button><b>${cart[id]}</b><button data-plus="${id}" aria-label="Добавить">+</button></div></div>`;
    }).join("") : `<div class="cart__empty">Здесь пока пусто.<br>Загляните в меню — чуду ждут.</div>`;
    form.classList.toggle("hide", !ids.length);
    const left = Math.max(0, FREE_FROM - sum);
    $("#cartProgress").innerHTML = (left > 0 ? `До бесплатной доставки — ${rub(left)}` : `Доставка по Махачкале — бесплатно`) +
      `<div class="bar"><i style="width:${Math.min(100, sum / FREE_FROM * 100)}%"></i></div>`;
    $("#cartTotal").textContent = rub(sum);
    $("#cartOrder").disabled = !ids.length;
  }
  $("#cartOrder").addEventListener("click", () => {
    const ids = Object.keys(cart); if (!ids.length) return;
    const f = form, how = f.how.value;
    const lines = ids.map(id => `• ${byId[id].name} × ${cart[id]} — ${rub(byId[id].price * cart[id])}`);
    const msg = [
      "Здравствуйте! Хочу сделать заказ с сайта:", "", ...lines, "", `Итого: ${rub(cartSum())}`,
      `Получение: ${how}`,
      how === "Доставка" && f.addr.value.trim() ? `Адрес: ${f.addr.value.trim()}` : "",
      f.name.value.trim() ? `Имя: ${f.name.value.trim()}` : "",
      f.note.value.trim() ? `Комментарий: ${f.note.value.trim()}` : ""
    ].filter((l, i, a) => l !== "" || (a[i - 1] !== "" && i < a.length - 1)).join("\n");
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
  });
  renderCart();

  let tt;
  function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.add("on"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("on"), 1800); }

  /* =========================================================
     АНИМАЦИИ
     ========================================================= */
  const root = document.documentElement, body = document.body;

  document.querySelectorAll("[data-split]").forEach(el => {
    const lines = el.innerHTML.split(/<br\s*\/?>/i).map(l => l.replace(/<[^>]+>/g, "").trim());
    el.setAttribute("aria-label", lines.join(" "));
    let i = 0;
    el.innerHTML = lines.map(line => `<span class="ln" aria-hidden="true">` +
      line.split(/\s+/).map(w => `<span style="display:inline-block;white-space:nowrap">` +
        [...w].map(c => `<span class="ch" style="--i:${i++}">${esc(c)}</span>`).join("") + `</span>`).join(" ") + `</span>`).join("");
  });

  function countUp(el) {
    const to = +el.dataset.count, t0 = performance.now(), dur = 1800;
    const tick = t => { const k = Math.min(1, (t - t0) / dur); el.textContent = Math.round(to * (k === 1 ? 1 : 1 - Math.pow(2, -10 * k))); if (k < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }
  const io = "IntersectionObserver" in window ? new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return;
    en.target.classList.add("in");
    if (en.target.dataset.count && !REDUCE) countUp(en.target);
    io.unobserve(en.target);
  }), { rootMargin: "0px 0px -8% 0px", threshold: .08 }) : null;
  const heroTitle = $(".hero__title");
  document.querySelectorAll(".reveal,.wipe,[data-split],[data-count]").forEach((el, i) => {
    if (el === heroTitle) return;
    if (el.classList.contains("reveal") && el.closest(".hero,.facts,.promos,.insta__grid,.frozen__list,.cinfo"))
      el.style.transitionDelay = ((i % 6) * 0.08) + "s";
    io ? io.observe(el) : el.classList.add("in");
  });

  (function preload() {
    const pre = $("#preloader"), bar = $("#preloaderBar");
    let p = 0, done = false; const t0 = performance.now();
    const fake = setInterval(() => { p += (0.9 - p) * 0.08; bar.style.transform = `scaleX(${p})`; }, 60);
    const finish = () => {
      if (done) return; done = true; clearInterval(fake); bar.style.transform = "scaleX(1)";
      setTimeout(() => { pre.classList.add("done"); body.classList.remove("is-loading");
        setTimeout(() => { body.classList.add("ready"); heroTitle.classList.add("in"); }, 250); }, 420);
    };
    if (REDUCE) { pre.remove(); body.classList.remove("is-loading"); body.classList.add("ready"); heroTitle.classList.add("in"); return; }
    const hi = $(".hero__media img");
    const ready = () => setTimeout(finish, Math.max(0, 1700 - (performance.now() - t0)));
    if (hi.complete) ready(); else { hi.addEventListener("load", ready); hi.addEventListener("error", ready); }
    setTimeout(finish, 4500);
  })();

  if (lenis) {
    const sync = () => (body.classList.contains("lock") || body.classList.contains("is-loading")) ? lenis.stop() : lenis.start();
    new MutationObserver(sync).observe(body, { attributes: true, attributeFilter: ["class"] });
    document.addEventListener("click", e => {
      const a = e.target.closest('a[href^="#"]'); if (!a) return;
      const id = a.getAttribute("href"); const t = id === "#top" || id === "#" ? 0 : document.querySelector(id);
      if (t === null) return; e.preventDefault(); go(t, id === "#menu" ? -40 : 0);
    });
  }

  const ring = $("#cursor"), dot = $("#cursorDot"), label = $("#cursorLabel");
  let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my, down = false;
  const useCursor = FINE && !REDUCE;
  if (useCursor) {
    root.classList.add("has-cursor");
    addEventListener("mousemove", e => { mx = e.clientX; my = e.clientY; dot.style.transform = `translate3d(${mx}px,${my}px,0)`; root.classList.remove("cursor-out"); }, { passive: true });
    document.addEventListener("mouseleave", () => root.classList.add("cursor-out"));
    addEventListener("mousedown", () => down = true); addEventListener("mouseup", () => down = false);
    document.addEventListener("mouseover", e => {
      const t = e.target;
      const ctrl = t.closest("a:not(.insta__grid a),button,.cat,.add,label");
      const view = !ctrl && (t.closest("[data-open]") || t.closest(".insta__grid a"));
      const call = t.closest(".marquee--call");
      ring.classList.toggle("is-view", !!view || !!call);
      ring.classList.toggle("is-link", !!ctrl && !call);
      label.textContent = call ? "Написать" : view ? "Смотреть" : "";
    });
    document.querySelectorAll(".hero__btns .pill,.circle-btn,.icon-btn,.fab,.burger,.contacts__btns .pill,.banquet .pill").forEach(el => {
      el.classList.add("mag");
      el.addEventListener("mousemove", e => { const r = el.getBoundingClientRect(); el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .28}px,${(e.clientY - r.top - r.height / 2) * .35}px)`; });
      el.addEventListener("mouseleave", () => { el.style.transform = ""; });
    });
  } else { ring.remove(); dot.remove(); }

  const pxEls = [...document.querySelectorAll(".px")];
  const heroMedia = $(".hero__media"), heroContent = $(".hero__content");
  const marquees = [...document.querySelectorAll(".marquee")];
  let lastY = scrollY, skew = 0;
  function frame(t) {
    if (lenis) lenis.raf(t);
    const y = scrollY, vh = innerHeight;
    if (!REDUCE) {
      if (y < vh * 1.2) {
        heroMedia.style.transform = `translate3d(0,${(y * .35).toFixed(1)}px,0)`;
        heroContent.style.transform = `translate3d(0,${(y * .18).toFixed(1)}px,0)`;
        heroContent.style.opacity = Math.max(0, 1 - y / (vh * .6)).toFixed(3);
      }
      for (const el of pxEls) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -50 || r.top > vh + 50) continue;
        el.style.setProperty("--py", (((r.top + r.height / 2 - vh / 2) / vh) * -6).toFixed(2) + "%");
      }
      const v = y - lastY; lastY = y;
      skew += (Math.max(-10, Math.min(10, v * .25)) - skew) * .12;
      for (const m of marquees) m.style.setProperty("--skew", skew.toFixed(2) + "deg");
    }
    if (useCursor) { cx += (mx - cx) * .16; cy += (my - cy) * .16; ring.style.transform = `translate3d(${cx.toFixed(1)}px,${cy.toFixed(1)}px,0) scale(${down ? .82 : 1})`; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
