/* SkiPass Cloud - static demo shop (no backend)
   - Cart stored in localStorage
   - Cookie consent mock: stores analytics preference
*/

const STORE = {
  CART: "spc_cart_v1",
  CONSENT: "spc_cookie_consent_v1" // { necessary:true, analytics:boolean, ts:number }
};

const PLANS = {
  basic: {
    id: "basic",
    name: "Basic",
    priceMonthly: 249,
    seats: 5,
    desc: "Für kleine Skigebiete & Testbetrieb."
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceMonthly: 549,
    seats: 25,
    desc: "Für wachsende Betriebe mit Reporting."
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    priceMonthly: 1190,
    seats: 100,
    desc: "Für große Anlagen & Integrationen."
  }
};

function formatEUR(n){
  return new Intl.NumberFormat("de-AT", { style:"currency", currency:"EUR" }).format(n);
}

function readJSON(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    if(!raw) return fallback;
    return JSON.parse(raw);
  }catch{
    return fallback;
  }
}

function writeJSON(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}

function getCart(){
  return readJSON(STORE.CART, { items: [] }); // items: [{planId, qty}]
}

function setCart(cart){
  writeJSON(STORE.CART, cart);
  updateCartCount();
}

function clearCart(){
  setCart({ items: [] });
}

function addToCart(planId, qty=1){
  const cart = getCart();
  const found = cart.items.find(i => i.planId === planId);
  if(found) found.qty += qty;
  else cart.items.push({ planId, qty });
  setCart(cart);
}

function removeFromCart(planId){
  const cart = getCart();
  cart.items = cart.items.filter(i => i.planId !== planId);
  setCart(cart);
}

function updateQty(planId, qty){
  const cart = getCart();
  const it = cart.items.find(i => i.planId === planId);
  if(!it) return;
  it.qty = Math.max(1, Math.min(99, Number(qty) || 1));
  setCart(cart);
}

function cartCount(){
  const cart = getCart();
  return cart.items.reduce((sum, i) => sum + i.qty, 0);
}

function cartTotal(){
  const cart = getCart();
  let total = 0;
  for(const i of cart.items){
    const p = PLANS[i.planId];
    if(p) total += p.priceMonthly * i.qty;
  }
  return total;
}

function updateCartCount(){
  const el = document.querySelector("[data-cart-count]");
  if(!el) return;
  const n = cartCount();
  el.textContent = String(n);
  el.setAttribute("aria-label", `Warenkorb, ${n} Artikel`);
}

function wireAddButtons(){
  document.querySelectorAll("[data-add-plan]").forEach(btn => {
    btn.addEventListener("click", () => {
      const planId = btn.getAttribute("data-add-plan");
      addToCart(planId, 1);
      // polite toast-ish message
      const live = document.querySelector("[data-live]");
      if(live){
        live.textContent = `${PLANS[planId].name} wurde zum Warenkorb hinzugefügt.`;
        setTimeout(()=> live.textContent = "", 2000);
      }
    });
  });
}

function renderCartTable(){
  const tableBody = document.querySelector("#cartBody");
  const totalEl = document.querySelector("#cartTotal");
  const emptyEl = document.querySelector("#cartEmpty");
  const checkoutBtn = document.querySelector("#goCheckout");

  if(!tableBody || !totalEl) return;

  const cart = getCart();
  tableBody.innerHTML = "";

  if(cart.items.length === 0){
    if(emptyEl) emptyEl.hidden = false;
    if(checkoutBtn) checkoutBtn.setAttribute("aria-disabled", "true"), checkoutBtn.classList.add("disabled");
  }else{
    if(emptyEl) emptyEl.hidden = true;
    if(checkoutBtn) checkoutBtn.removeAttribute("aria-disabled"), checkoutBtn.classList.remove("disabled");
  }

  for(const item of cart.items){
    const p = PLANS[item.planId];
    if(!p) continue;

    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    tdName.innerHTML = `<strong style="color:var(--text)">${p.name}</strong><div class="hint">${p.desc}</div>`;
    tr.appendChild(tdName);

    const tdPrice = document.createElement("td");
    tdPrice.textContent = formatEUR(p.priceMonthly) + " / Monat";
    tr.appendChild(tdPrice);

    const tdQty = document.createElement("td");
    const id = `qty-${p.id}`;
    tdQty.innerHTML = `
      <label class="hint" for="${id}">Anzahl</label>
      <input id="${id}" inputmode="numeric" pattern="[0-9]*" min="1" max="99" value="${item.qty}" aria-label="Anzahl für ${p.name}">
    `;
    tr.appendChild(tdQty);

    const tdSub = document.createElement("td");
    tdSub.textContent = formatEUR(p.priceMonthly * item.qty);
    tr.appendChild(tdSub);

    const tdAct = document.createElement("td");
    const rm = document.createElement("button");
    rm.className = "btn small danger";
    rm.type = "button";
    rm.textContent = "Entfernen";
    rm.addEventListener("click", () => removeFromCart(p.id));
    tdAct.appendChild(rm);
    tr.appendChild(tdAct);

    tableBody.appendChild(tr);

    // qty handler
    const input = tdQty.querySelector("input");
    input.addEventListener("change", () => updateQty(p.id, input.value));
  }

  totalEl.textContent = formatEUR(cartTotal()) + " / Monat";
}

function renderCheckoutSummary(){
  const box = document.querySelector("#checkoutSummary");
  const totalEl = document.querySelector("#checkoutTotal");
  const emptyWarn = document.querySelector("#checkoutEmptyWarn");
  const submitBtn = document.querySelector("#placeOrder");

  if(!box || !totalEl) return;

  const cart = getCart();
  box.innerHTML = "";

  if(cart.items.length === 0){
    if(emptyWarn) emptyWarn.hidden = false;
    if(submitBtn) submitBtn.disabled = true;
  }else{
    if(emptyWarn) emptyWarn.hidden = true;
    if(submitBtn) submitBtn.disabled = false;
  }

  for(const item of cart.items){
    const p = PLANS[item.planId];
    if(!p) continue;

    const row = document.createElement("div");
    row.className = "notice";
    row.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;">
        <div><strong style="color:var(--text)">${p.name}</strong> <span class="hint">× ${item.qty}</span></div>
        <div style="font-family:var(--mono)">${formatEUR(p.priceMonthly * item.qty)} / Monat</div>
      </div>
    `;
    box.appendChild(row);
  }

  totalEl.textContent = formatEUR(cartTotal()) + " / Monat";
}

function validateCheckoutForm(form){
  const errors = [];
  const company = form.company?.value?.trim() || "";
  const name = form.fullname?.value?.trim() || "";
  const email = form.email?.value?.trim() || "";
  const country = form.country?.value || "";
  const payment = form.payment?.value || "";

  if(company.length < 2) errors.push("Bitte gib einen Firmennamen an.");
  if(name.length < 2) errors.push("Bitte gib deinen Namen an.");
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Bitte gib eine gültige E-Mail-Adresse an.");
  if(!country) errors.push("Bitte wähle ein Land aus.");
  if(!payment) errors.push("Bitte wähle eine Zahlungsmethode aus.");

  return errors;
}

function wireCheckoutForm(){
  const form = document.querySelector("#checkoutForm");
  const errBox = document.querySelector("#checkoutErrors");
  if(!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const cart = getCart();
    if(cart.items.length === 0){
      if(errBox){
        errBox.innerHTML = `<div class="error" role="alert">Dein Warenkorb ist leer. Bitte wähle zuerst einen Plan aus.</div>`;
      }
      return;
    }

    const errors = validateCheckoutForm(form);
    if(errors.length){
      if(errBox){
        errBox.innerHTML = `<div class="error" role="alert"><strong>Bitte korrigiere:</strong><ul>${errors.map(x=>`<li>${x}</li>`).join("")}</ul></div>`;
      }
      // move focus to error
      errBox?.querySelector(".error")?.focus?.();
      return;
    }

    // store "order" snapshot for success page
    const order = {
      ts: Date.now(),
      customer: {
        company: form.company.value.trim(),
        fullname: form.fullname.value.trim(),
        email: form.email.value.trim(),
        country: form.country.value,
      },
      payment: form.payment.value,
      items: getCart().items,
      totalMonthly: cartTotal()
    };
    writeJSON("spc_last_order_v1", order);

    // clear cart and redirect
    clearCart();
    window.location.href = "success.html";
  });
}

function renderSuccess(){
  const box = document.querySelector("#orderBox");
  if(!box) return;

  const order = readJSON("spc_last_order_v1", null);
  if(!order){
    box.innerHTML = `<div class="error" role="alert">Keine Bestellung gefunden. Bitte starte im Shop.</div>`;
    return;
  }

  const itemsHtml = (order.items || []).map(i => {
    const p = PLANS[i.planId];
    if(!p) return "";
    return `<li><strong>${p.name}</strong> × ${i.qty} — ${formatEUR(p.priceMonthly * i.qty)} / Monat</li>`;
  }).join("");

  const paymentLabel = {
    invoice: "Rechnung",
    card: "Kreditkarte",
    sepa: "SEPA-Lastschrift"
  }[order.payment] || "—";

  const orderId = "SPC-" + String(order.ts).slice(-8);

  box.innerHTML = `
    <div class="success" role="status">
      <strong>Bestellung erfolgreich.</strong> Vielen Dank für deinen Einkauf!
    </div>
    <div class="notice" style="margin-top:12px">
      <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;">
        <div>
          <div class="hint">Bestell-ID</div>
          <div style="font-family:var(--mono); color:var(--text)">${orderId}</div>
        </div>
        <div>
          <div class="hint">Kontakt</div>
          <div style="color:var(--text)">${order.customer.fullname} — ${order.customer.email}</div>
        </div>
      </div>
    </div>
    <div class="notice" style="margin-top:12px">
      <div class="hint">Positionen</div>
      <ul class="ul">${itemsHtml || "<li>—</li>"}</ul>
      <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:10px">
        <div><span class="hint">Zahlungsart</span><div style="color:var(--text)">${paymentLabel}</div></div>
        <div><span class="hint">Summe</span><div style="font-family:var(--mono);color:var(--text)">${formatEUR(order.totalMonthly)} / Monat</div></div>
      </div>
    </div>
    <div class="demo">
      <strong>Demo-Download:</strong> In einem echten System würde man hier sein Lizenzpaket erhalten.  
      <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
        <a class="btn primary" href="license.html">Lizenz ansehen</a>
        <a class="btn" href="contact.html">Support kontaktieren</a>
      </div>
    </div>
  `;
}

function navCurrent(){
  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("nav a").forEach(a => {
    const href = a.getAttribute("href");
    if(href === path) a.setAttribute("aria-current","page");
    else a.removeAttribute("aria-current");
  });
}

function cookieBannerInit(){
  // Nutze EIN Element als Quelle der Wahrheit: #cookieBanner
  const banner = document.getElementById("cookieBanner");
  if(!banner) return;

  // Elemente im Banner
  const acceptAll = banner.querySelector("[data-consent-accept]");
  const reject    = banner.querySelector("[data-consent-reject]");
  const detailsBtn= banner.querySelector("[data-consent-details]"); // dein Details-Button im Banner
  const save      = banner.querySelector("[data-consent-save]");
  const analyticsToggle = banner.querySelector("#analyticsToggle");
  const panel = banner.querySelector("#cookiePanel");
  if(panel) panel.hidden = true;
  if(detailsBtn) detailsBtn.setAttribute("aria-expanded","false");


  // Fokus-Management (WCAG)
  let lastFocus = null;

  function showCookieBanner(){
    lastFocus = document.activeElement;
    banner.style.display = "block";

    const first = banner.querySelector(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
    );
    first?.focus();
  }

  function hideCookieBanner(){
    banner.style.display = "none";
    lastFocus?.focus?.();
  }

    banner.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideCookieBanner();
  });

  // OPTIONAL: Demo-Reset (wenn du das für die Abgabe wirklich willst)
  // Hinweis: WCAG egal, aber UX untypisch.
const ALWAYS_SHOW_COOKIE_BANNER = true;
if (ALWAYS_SHOW_COOKIE_BANNER) localStorage.removeItem(STORE.CONSENT);


  // Initial anzeigen wenn kein Consent vorhanden
  const consent = readJSON(STORE.CONSENT, null);
  if(!consent){
    showCookieBanner();
  }else{
    // wenn consent existiert: Toggle vorbefüllen (falls vorhanden)
    if(analyticsToggle) analyticsToggle.checked = !!consent.analytics;
  }

  // Details-Panel: Screenreader-konform (aria-expanded + hidden)
  if(detailsBtn && panel){
    // Stelle sicher, dass aria-controls gesetzt ist (falls du es im HTML noch nicht hast)
    if(!detailsBtn.hasAttribute("aria-controls")) detailsBtn.setAttribute("aria-controls", "cookiePanel");
    if(!detailsBtn.hasAttribute("aria-expanded")) detailsBtn.setAttribute("aria-expanded", "false");

    detailsBtn.addEventListener("click", () => {
      const open = detailsBtn.getAttribute("aria-expanded") === "true";
      detailsBtn.setAttribute("aria-expanded", String(!open));
      panel.hidden = open;

      // optional: Fokus ins Panel (damit Screenreader/Keyboard sofort dort ist)
      if(!open){
        (analyticsToggle || panel).focus?.();
      }else{
        detailsBtn.focus();
      }
    });
  }

  // Buttons
  acceptAll?.addEventListener("click", () => {
    writeJSON(STORE.CONSENT, { necessary:true, analytics:true, ts:Date.now() });
    hideCookieBanner();
  });

  reject?.addEventListener("click", () => {
    writeJSON(STORE.CONSENT, { necessary:true, analytics:false, ts:Date.now() });
    hideCookieBanner();
  });

  save?.addEventListener("click", () => {
    writeJSON(STORE.CONSENT, {
      necessary:true,
      analytics: !!analyticsToggle?.checked,
      ts:Date.now()
    });
    hideCookieBanner();
  });
}


function init(){
  navCurrent();
  updateCartCount();
  wireAddButtons();
  renderCartTable();
  renderCheckoutSummary();
  wireCheckoutForm();
  renderSuccess();
  cookieBannerInit();

  // Rerender on cart changes (storage event + custom)
  window.addEventListener("storage", (e) => {
    if(e.key === STORE.CART){
      updateCartCount();
      renderCartTable();
      renderCheckoutSummary();
    }
  });

  // Monkey patch setCart to emit event (internal)
  const _setCart = setCart;
  window.__spc_setCart = (cart) => _setCart(cart);
}

document.addEventListener("DOMContentLoaded", init);

// When setCart is called, render updates
(function(){
  const original = setCart;
  window.setCart = function(cart){
    original(cart);
    renderCartTable();
    renderCheckoutSummary();
  };
})();
