"use strict";
/* =====================================================================
   Coincés en orbite · le vaisseau (site statique)
   - etat.json : énergie commune, salles, équipage, journal (suit l'histoire)
   - Navigation par l'adresse : #plan · #salle/CA-1 · #porte/STA · #terminal/equipage/lea
   ===================================================================== */

const pc = (x) => Number(x).toLocaleString("fr-FR");
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const nombre = (n) => (n == null ? "—" : Number(n).toLocaleString("fr-FR"));

let ETAT = null;
const POS_CLE = "coinces-position";

/* ---------- Salles : objets et portes (coordonnées du décor 1920 × 1080) ---------- */
const PORTE_G = [[18, 118], [212, 214], [212, 1000], [18, 1072]];
const PORTE_D = [[1902, 118], [1708, 214], [1708, 1000], [1902, 1072]];

const ZONES = {
  "CA-1": [
    { id: "verriere", nom: "Verrière", rect: [300, 50, 1350, 200], titre: "La verrière de la baie de réveil",
      texte: ["Au-dessus des sas, la Terre passe lentement. Le vaisseau tourne autour d'elle depuis 2012."] },
    { id: "sas01", nom: "Sas 01 · Byte", rect: [330, 290, 330, 690], titre: "Sas 01 · BYTE",
      texte: ["Ouvert. Vide.", "Son occupant l'a quitté en 2012 pour se mettre en veille de survie près du terminal, et économiser le peu d'énergie qui restait.", "Il y est revenu cinq heures, dans la nuit du 23 au 24 novembre, sans réussir à rester en veille."],
      actions: [{ txt: "Fiche de Byte au terminal", aller: "terminal/equipage/byte" }] },
    { id: "sas02", nom: "Sas 02 · Léa", rect: [810, 290, 330, 720], titre: "Sas 02 · LÉA",
      texte: ["Ouvert. Réveil forcé par la surtension, juste après l'impact d'une micrométéorite contre la coque.", "C'est le premier réveil à bord depuis quatorze ans."],
      actions: [{ txt: "Fiche de Léa au terminal", aller: "terminal/equipage/lea" }] },
    { id: "sas03", nom: "Sas 03 · Sora", rect: [1290, 290, 330, 690], titre: "Sas 03 · SORA",
      texte: ["Fermé. Stase en cours.", "L'énergie du vaisseau est trop basse pour un nouveau réveil."],
      actions: [{ txt: "Fiche de Sora au terminal", aller: "terminal/equipage/sora" }] },
    { id: "vis", nom: "Une vis", rect: [1622, 940, 84, 92], discret: true, titre: "Une vis", // cachée par Byte (note byte-2) : pas de bouton dans la liste
      decor: `<g transform="translate(1664 988) rotate(-24)"><ellipse cx="4" cy="13" rx="31" ry="5" fill="#05090f" opacity=".6"/><path d="M-14-6H24l8 6-8 6H-14z" fill="#8b9bb0" stroke="#0d131d" stroke-width="2.5" stroke-linejoin="round"/><path d="M-6-7l4 14M2-7l4 14M10-7l4 14M18-7l4 14" stroke="#3f4f63" stroke-width="2.5"/><path d="M-12-3H24" stroke="#dbe6f2" stroke-width="2" opacity=".8"/><rect x="-25" y="-13" width="12" height="26" rx="4" fill="#b6c4d6" stroke="#0d131d" stroke-width="2.5"/><path d="M-25 0h6" stroke="#3f4f63" stroke-width="4"/></g>`,
      texte: ["Une vis qui n'a rien à faire là."] },
    { id: "porte-stase", nom: "Porte · Stase profonde", poly: PORTE_G, vers: "STA" },
    { id: "porte-couloir", nom: "Couloir →", poly: PORTE_D, vers: "CA-2" },
  ],
  "CA-2": [
    { id: "baie-g", nom: "Baie gauche", rect: [205, 145, 720, 500], titre: "La planète bleue",
      texte: ["Une planète bleue et verte, immense. En sortant de son sas, Léa ne savait pas encore qu'elle s'appelait la Terre.", "Les humains qui y vivent sont la seule source d'énergie du vaisseau."] },
    { id: "baie-d", nom: "Baie droite", rect: [995, 145, 720, 500], titre: "Vue sur la Terre",
      texte: ["Chaque passage au-dessus des continents dure un peu plus d'une heure. Personne à bord ne s'en lasse."] },
    { id: "porte-caissons", nom: "← Baie de réveil", poly: PORTE_G, vers: "CA-1" },
    { id: "porte-commune", nom: "Salle commune →", poly: PORTE_D, vers: "CA-4" },
  ],
  "CA-4": [
    { id: "ecran-mural", nom: "Écran mural", rect: [190, 196, 236, 295], titre: "Écran mural",
      texte: ["Écran en veille. Il suffit de le toucher du doigt : il s'allume, affiche l'énergie du vaisseau, puis se rendort.", "Léa l'a vu passer de trois à cinq pour cent. Le lendemain, il était revenu à trois."],
      actions: [{ txt: "État du vaisseau au terminal", aller: "terminal/vaisseau" }] },
    { id: "hublot", nom: "Grand hublot", rect: [450, 105, 1020, 520], titre: "Le grand hublot",
      texte: ["La plus belle vue du bord. C'est ici que l'équipage se retrouvera, une fois réveillé."] },
    { id: "canape", nom: "Banquette", rect: [630, 620, 660, 310], titre: "La banquette du salon",
      texte: ["Deux grands coussins orange, face à la Terre."] },
    { id: "lumiere", nom: "Lumière du terminal", rect: [1488, 196, 232, 260], titre: "Une lumière qui clignote",
      texte: ["TERMINAL →", "La seule lumière vivante du salon. Elle indique le chemin du poste terminal."],
      actions: [{ txt: "Aller au terminal", aller: "salle/CA-3" }] },
    { id: "porte-couloir", nom: "← Couloir", poly: PORTE_G, vers: "CA-2" },
    { id: "porte-terminal", nom: "Terminal →", poly: PORTE_D, vers: "CA-3" },
  ],
  "CA-3": [
    { id: "ecran", nom: "Terminal", rect: [530, 205, 860, 485], terminal: true },
    { id: "casque", nom: "Casque de connexion", rect: [560, 740, 150, 175], terminal: true },
    { id: "hublot", nom: "Hublot", rect: [255, 70, 270, 430], titre: "Le hublot du poste",
      texte: ["Le terminal est installé face à la Terre. Le signal passe mieux de ce côté de la coque."] },
    { id: "dock", nom: "Dock de veille", rect: [1460, 900, 200, 140], titre: "Le dock de veille",
      texte: ["Un socle relié au terminal par un câble lumineux. C'est là que Byte a passé quatorze ans en veille de survie."],
      actions: [{ txt: "Fiche de Byte", aller: "terminal/equipage/byte" }] },
    { id: "porte-commune", nom: "← Salle commune", poly: PORTE_G, vers: "CA-4" },
    { id: "porte-atelier", nom: "Porte · Atelier + Projection", poly: PORTE_D, vers: "CA-6" },
  ],
};

/* Vue d'une porte fermée : retour vers la salle ouverte la plus proche */
const RETOUR_PORTE = { MOT: "CA-1", STA: "CA-1", "CA-6": "CA-3", "CA-5": "CA-3", PONT: "CA-3" };

/* ---------- Démarrage ---------- */
async function demarrer() {
  try {
    const r = await fetch("etat.json", { cache: "no-store" });
    ETAT = await r.json();
  } catch (e) {
    document.body.insertAdjacentHTML("afterbegin", '<p class="message erreur" style="margin:5rem 1rem">Liaison perdue avec le vaisseau. Réessayez dans un instant.</p>');
    return;
  }
  const e = ETAT.energie;
  $("#jauge-mini-plein").style.width = `${Math.max(2, e)}%`;
  $("#jauge-mini-txt").textContent = `${pc(e)} %`;
  $("#arrivee-energie").textContent = `${pc(e)} %`;

  document.addEventListener("click", (ev) => {
    const a = ev.target.closest("[data-aller]");
    if (a) { ev.preventDefault(); aller(a.dataset.aller); return; }
    const f = ev.target.closest("[data-fermer]");
    if (f) { ev.preventDefault(); f.dataset.fermer === "terminal" ? fermerTerminal() : fermerPanneau(); }
  });
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") { if (!$("#terminal").hidden) fermerTerminal(); else fermerPanneau(); }
  });
  $("#btn-acces").addEventListener("click", () => aller("terminal/acces"));
  $("#onglets").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-onglet]");
    if (b) aller(`terminal/${b.dataset.onglet}`, true);
  });
  window.addEventListener("hashchange", route);
  construirePlan();
  route();
  if (window.Compte) window.Compte.demarrer();
}

function salle(id) { return ETAT.salles.find((s) => s.id === id); }
function requis(s) { return (ETAT.secteurs.find((x) => x.id === s.secteur) || {}).requis || 0; }
function ouverte(s) { return requis(s) <= ETAT.energie; }

function aller(cible, remplacer = false) {
  const h = `#${cible}`;
  if (location.hash === h) { route(); return; }
  if (remplacer) { history.replaceState(null, "", h); route(); } else location.hash = h;
}

/* ---------- Routeur ---------- */
let dernierHash = "";
function route() {
  const h = location.hash.replace(/^#/, "");
  if (/(^|&)(access_token|error)=/.test(h)) return montrer("arrivee"); // retour d'un lien e-mail : géré par compte.js
  const [vue, a, b] = h.split("/").map(decodeURIComponent);
  fermerPanneau();
  if (vue === "terminal") {
    if ($("#vue-salle").hidden && $("#vue-plan").hidden) montrerSalle(localStorage.getItem(POS_CLE) || "CA-3");
    ouvrirTerminal(a || "vaisseau", b);
    return;
  }
  $("#terminal").hidden = true;
  dernierHash = h;
  if (vue === "plan") return montrer("plan");
  if (vue === "salle" && ZONES[a]) return montrerSalle(a);
  if (vue === "porte" && salle(a)) return montrerPorte(a);
  montrer("arrivee");
}

function montrer(nom) {
  for (const v of document.querySelectorAll(".vue")) v.hidden = v.id !== `vue-${nom}`;
  if (nom === "plan") { marquerIci(); requestAnimationFrame(() => Carte.ajuster()); }
  window.scrollTo(0, 0);
}

/* ---------- Plan du vaisseau ---------- */
const PL = { w: 196, h: 270, gap: 12, x0: 150, y0: 170 };
function couleurSecteur(s) {
  if (ouverte(s)) return { trait: "#22d3ee", fond: "#0b2233", texte: "#67e8f9" };
  return requis(s) <= 25 ? { trait: "#f97316", fond: "#1f130b", texte: "#fdba74" } : { trait: "#ef4444", fond: "#1c0d12", texte: "#fca5a5" };
}
function construirePlan() {
  const n = ETAT.salles.length;
  const xFin = PL.x0 + n * PL.w + (n - 1) * PL.gap;
  const W = xFin + 230, H = 660;
  const y0 = PL.y0, y1 = PL.y0 + PL.h;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Segoe UI, Arial, sans-serif">
    <defs>
      <radialGradient id="pl-terre" cx="50%" cy="100%" r="75%"><stop offset="0" stop-color="#1d4ed8"/><stop offset=".55" stop-color="#1e6fd8"/><stop offset=".8" stop-color="#38bdf8" stop-opacity=".55"/><stop offset="1" stop-color="#38bdf8" stop-opacity="0"/></radialGradient>
      <linearGradient id="pl-coque" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#233447"/><stop offset="1" stop-color="#101926"/></linearGradient>
    </defs>
    <ellipse cx="${W / 2}" cy="${H + 820}" rx="${W * .62}" ry="960" fill="url(#pl-terre)"/>
    <ellipse cx="${W / 2}" cy="${H + 820}" rx="${W * .62}" ry="960" fill="none" stroke="#7dd3fc" stroke-width="3" opacity=".5"/>
    <!-- coque -->
    <polygon points="${PL.x0 - 40},${y0 - 44} ${xFin + 40},${y0 - 44} ${xFin + 190},${(y0 + y1) / 2} ${xFin + 40},${y1 + 44} ${PL.x0 - 40},${y1 + 44}" fill="url(#pl-coque)" stroke="#0d131d" stroke-width="8"/>
    <polygon points="${PL.x0 - 40},${y0 - 44} ${xFin + 40},${y0 - 44} ${xFin + 190},${(y0 + y1) / 2} ${xFin + 40},${y1 + 44} ${PL.x0 - 40},${y1 + 44}" fill="none" stroke="#394d63" stroke-width="3"/>
    <polygon points="${PL.x0 - 40},${y0 + 10} ${PL.x0 - 118},${y0 - 10} ${PL.x0 - 118},${y0 + 90} ${PL.x0 - 40},${y0 + 80}" fill="#182536" stroke="#0d131d" stroke-width="6"/>
    <polygon points="${PL.x0 - 40},${y1 - 80} ${PL.x0 - 118},${y1 - 90} ${PL.x0 - 118},${y1 + 10} ${PL.x0 - 40},${y1 - 10}" fill="#182536" stroke="#0d131d" stroke-width="6"/>
    <polygon points="${PL.x0 + 40},${y0 - 44} ${PL.x0 + 120},${y0 - 120} ${PL.x0 + 260},${y0 - 44}" fill="#182536" stroke="#0d131d" stroke-width="6"/>
    <polygon points="${PL.x0 + 40},${y1 + 44} ${PL.x0 + 120},${y1 + 120} ${PL.x0 + 260},${y1 + 44}" fill="#182536" stroke="#0d131d" stroke-width="6"/>`;

  // bandeaux des secteurs (groupes de salles voisines du même secteur)
  const groupes = [];
  ETAT.salles.forEach((s, i) => {
    const g = groupes[groupes.length - 1];
    if (g && g.secteur === s.secteur) g.fin = i; else groupes.push({ secteur: s.secteur, debut: i, fin: i });
  });
  for (const g of groupes) {
    const sec = ETAT.secteurs.find((x) => x.id === g.secteur);
    const s0 = ETAT.salles[g.debut];
    const c = couleurSecteur(s0);
    const xa = PL.x0 + g.debut * (PL.w + PL.gap), xb = PL.x0 + g.fin * (PL.w + PL.gap) + PL.w;
    const txt = ouverte(s0) ? `★ ${sec.nom.toUpperCase()} · OUVERT` : `🔒 ${sec.nom.toUpperCase()} · ${sec.requis} %`;
    svg += `<rect x="${xa}" y="${y0 - 128}" width="${xb - xa}" height="50" rx="14" fill="#0a1220" stroke="${c.trait}" stroke-width="4"/>
      <text x="${(xa + xb) / 2}" y="${y0 - 96}" text-anchor="middle" font-size="${xb - xa < 260 ? 15 : 19}" font-weight="900" fill="${c.texte}" letter-spacing="1">${esc(txt)}</text>`;
  }
  // salles
  ETAT.salles.forEach((s, i) => {
    const x = PL.x0 + i * (PL.w + PL.gap);
    const c = couleurSecteur(s), ok = ouverte(s);
    const hublot = ["CA-1", "CA-2", "CA-4", "CA-3"].includes(s.id);
    svg += `<g class="compartiment${ok ? "" : " ferme"}" data-salle="${s.id}" tabindex="0" role="button" aria-label="${esc(s.code + " " + s.nom + (ok ? "" : ", fermée : " + requis(s) + " % d'énergie requis"))}">
      <rect class="fond" x="${x}" y="${y0}" width="${PL.w}" height="${PL.h}" rx="14" fill="${c.fond}"/>
      <rect class="cadre" x="${x}" y="${y0}" width="${PL.w}" height="${PL.h}" rx="14" fill="none" stroke="${c.trait}" stroke-width="4" ${ok ? "" : 'stroke-dasharray="14 8"'}/>
      <rect x="${x + 8}" y="${y0 + 8}" width="${PL.w - 16}" height="30" rx="8" fill="${ok ? "#0b3346" : "#2a1014"}"/>
      <text x="${x + PL.w / 2}" y="${y0 + 29}" text-anchor="middle" font-size="15" font-weight="900" fill="${c.texte}">${ok ? "✓ OUVERTE" : "🔒 " + requis(s) + " %"}</text>
      <text x="${x + PL.w / 2}" y="${y0 + 78}" text-anchor="middle" font-size="30" font-weight="900" fill="#f8fafc">${esc(s.code)}</text>
      <text x="${x + PL.w / 2}" y="${y0 + 104}" text-anchor="middle" font-size="16" font-weight="700" fill="#cbd5e1">${esc(s.nom)}</text>
      ${hublot ? `<rect x="${x + 24}" y="${y0 + 124}" width="${PL.w - 48}" height="40" rx="8" fill="#1e6fd8" stroke="#38bdf8" stroke-width="3"/>` : `<rect x="${x + 24}" y="${y0 + 124}" width="${PL.w - 48}" height="40" rx="8" fill="none" stroke="#334155" stroke-width="3" stroke-dasharray="8 6"/>`}
      <text x="${x + PL.w / 2}" y="${y0 + 200}" text-anchor="middle" font-size="14" font-weight="700" fill="${ok ? "#7dd3fc" : "#94a3b8"}">${esc(s.sous)}</text>
      <g class="ici" data-ici="${s.id}" opacity="0">
        <circle class="ici-pulse" cx="${x + PL.w / 2}" cy="${y0 + 238}" r="12" fill="#f97316"/>
        <circle cx="${x + PL.w / 2}" cy="${y0 + 238}" r="11" fill="#f97316" stroke="#fed7aa" stroke-width="3"/>
        <text x="${x + PL.w / 2 + 20}" y="${y0 + 244}" font-size="15" font-weight="900" fill="#fdba74">VOUS</text>
      </g>
    </g>`;
    if (i < ETAT.salles.length - 1) {
      const suivante = ETAT.salles[i + 1];
      const sas = suivante.secteur !== s.secteur;
      const xs = x + PL.w + PL.gap / 2;
      svg += sas
        ? `<rect x="${xs - 9}" y="${(y0 + y1) / 2 - 42}" width="18" height="84" rx="6" fill="#3a1418" stroke="#ef4444" stroke-width="3"/><text x="${xs}" y="${(y0 + y1) / 2 + 6}" text-anchor="middle" font-size="13">🔒</text>`
        : `<rect x="${xs - 7}" y="${(y0 + y1) / 2 - 30}" width="14" height="60" rx="5" fill="#0b3346" stroke="#22d3ee" stroke-width="2.5"/>`;
    }
  });
  svg += `<text x="${W / 2}" y="${H - 30}" text-anchor="middle" font-size="18" font-weight="800" fill="#bae6fd" letter-spacing="3">▼ LA TERRE ▼</text></svg>`;
  const zone = $("#plan-contenu");
  zone.innerHTML = svg;
  zone.dataset.w = W; zone.dataset.h = H;
  zone.addEventListener("click", (ev) => {
    if (Carte.aGlisse) return;
    const g = ev.target.closest("[data-salle]");
    if (g) choisirSalleDuPlan(g.dataset.salle);
  });
  zone.addEventListener("keydown", (ev) => {
    const g = ev.target.closest("[data-salle]");
    if (g && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); choisirSalleDuPlan(g.dataset.salle); }
  });
  Carte.installer();
}
function choisirSalleDuPlan(id) {
  const s = salle(id);
  if (ouverte(s)) aller(`salle/${id}`);
  else aller(`porte/${id}`);
}
function marquerIci() {
  const ici = localStorage.getItem(POS_CLE);
  for (const g of document.querySelectorAll("[data-ici]")) g.setAttribute("opacity", g.dataset.ici === ici ? "1" : "0");
}

/* Carte déplaçable et zoomable (souris, molette, doigts) */
const Carte = {
  x: 0, y: 0, s: 1, aGlisse: false, pointeurs: new Map(), depart: null,
  get cadre() { return $("#plan-cadre"); },
  get contenu() { return $("#plan-contenu"); },
  appliquer() { this.contenu.style.transform = `translate(${this.x}px, ${this.y}px) scale(${this.s})`; },
  borner() {
    const W = +this.contenu.dataset.w * this.s, H = +this.contenu.dataset.h * this.s;
    const cw = this.cadre.clientWidth, ch = this.cadre.clientHeight, m = 80;
    this.x = W < cw ? (cw - W) / 2 : Math.min(m, Math.max(cw - W - m, this.x));
    this.y = H < ch ? (ch - H) / 2 : Math.min(m, Math.max(ch - H - m, this.y));
  },
  ajuster() {
    const W = +this.contenu.dataset.w, H = +this.contenu.dataset.h;
    const cw = this.cadre.clientWidth, ch = this.cadre.clientHeight;
    if (!cw) return;
    const tout = Math.min(cw / W, ch / H) * .96;
    this.s = Math.max(tout, Math.min(ch * .82 / H, .62));
    // centrer sur la salle où l'on est, sinon sur le secteur ouvert
    const ici = localStorage.getItem(POS_CLE);
    const idx = Math.max(0, ETAT.salles.findIndex((s) => s.id === ici));
    const cx = ici ? PL.x0 + idx * (PL.w + PL.gap) + PL.w / 2 : this.centreOuvert();
    this.x = cw / 2 - cx * this.s;
    this.y = (ch - H * this.s) / 2;
    this.borner(); this.appliquer();
  },
  centreOuvert() {
    const idx = ETAT.salles.map((s, i) => (ouverte(s) ? i : -1)).filter((i) => i >= 0);
    const m = idx.length ? (idx[0] + idx[idx.length - 1]) / 2 : ETAT.salles.length / 2;
    return PL.x0 + m * (PL.w + PL.gap) + PL.w / 2;
  },
  zoomer(f, px, py) {
    const r = this.cadre.getBoundingClientRect();
    px = px ?? r.width / 2; py = py ?? r.height / 2;
    const s2 = Math.min(2.2, Math.max(.18, this.s * f));
    this.x = px - (px - this.x) * (s2 / this.s);
    this.y = py - (py - this.y) * (s2 / this.s);
    this.s = s2; this.borner(); this.appliquer();
  },
  installer() {
    const c = this.cadre;
    c.addEventListener("pointerdown", (e) => {
      this.pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.depart = { x: this.x, y: this.y, s: this.s, px: e.clientX, py: e.clientY, dist: this.distance() };
      this.aGlisse = false;
    });
    c.addEventListener("pointermove", (e) => {
      if (!this.pointeurs.has(e.pointerId)) return;
      this.pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const d = this.depart;
      if (this.pointeurs.size >= 2 && d.dist) {
        const r = c.getBoundingClientRect();
        const p = [...this.pointeurs.values()];
        const mx = (p[0].x + p[1].x) / 2 - r.left, my = (p[0].y + p[1].y) / 2 - r.top;
        const s2 = Math.min(2.2, Math.max(.18, d.s * this.distance() / d.dist));
        this.x = mx - (mx - this.x) * (s2 / this.s); this.y = my - (my - this.y) * (s2 / this.s); this.s = s2;
        this.aGlisse = true;
      } else {
        const dx = e.clientX - d.px, dy = e.clientY - d.py;
        if (Math.hypot(dx, dy) > 6) { this.aGlisse = true; c.classList.add("glisse"); if (!c.hasPointerCapture(e.pointerId)) c.setPointerCapture(e.pointerId); }
        if (this.aGlisse) { this.x = d.x + dx; this.y = d.y + dy; }
      }
      this.borner(); this.appliquer();
    });
    const fin = (e) => {
      this.pointeurs.delete(e.pointerId);
      c.classList.remove("glisse");
      if (this.pointeurs.size) { const p = [...this.pointeurs.values()][0]; this.depart = { x: this.x, y: this.y, s: this.s, px: p.x, py: p.y, dist: 0 }; }
      setTimeout(() => { if (!this.pointeurs.size) this.aGlisse = false; }, 0);
    };
    c.addEventListener("pointerup", fin);
    c.addEventListener("pointercancel", fin);
    c.addEventListener("wheel", (e) => {
      e.preventDefault();
      const r = c.getBoundingClientRect();
      this.zoomer(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
    document.querySelector(".plan-zoom").addEventListener("click", (e) => {
      const b = e.target.closest("[data-zoom]");
      if (!b) return;
      e.stopPropagation();
      const z = +b.dataset.zoom;
      if (z === 0) this.ajuster(); else this.zoomer(z > 0 ? 1.25 : 1 / 1.25);
    });
    window.addEventListener("resize", () => { if (!$("#vue-plan").hidden) this.ajuster(); });
  },
  distance() {
    const p = [...this.pointeurs.values()];
    return p.length >= 2 ? Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) : 0;
  },
};

/* ---------- Une salle ---------- */
let zonesCourantes = [];
function montrerSalle(id) {
  const s = salle(id);
  if (!ouverte(s)) return montrerPorte(id);
  localStorage.setItem(POS_CLE, id);
  remplirScene({ code: s.code, nom: s.nom, cam: `CAM ${s.code}`, image: `salles/${id}.svg?v=${ETAT.maj}`, alt: `${s.code} · ${s.nom}`, zones: ZONES[id] });
  montrer("salle");
  centrerScene();
}
function montrerPorte(id) {
  const s = salle(id);
  if (ouverte(s)) return montrerSalle(id);
  const retour = RETOUR_PORTE[id] || "CA-3";
  const sec = ETAT.secteurs.find((x) => x.id === s.secteur);
  const zones = [
    { id: "porte", nom: "Porte blindée", rect: [500, 80, 680, 640], ferme: true, porteInfo: s },
    { id: "panneau", nom: "Panneau d'énergie", rect: [1195, 140, 400, 460], ferme: true, porteInfo: s },
    { id: "retour", nom: `← Retour ${salle(retour).code}`, rect: [40, 770, 420, 260], vers: retour },
  ];
  remplirScene({ code: s.code, nom: `${s.nom} · porte fermée`, cam: `CAM SAS ${s.code}`, image: `salles/${s.porte}.svg?v=${ETAT.maj}`, alt: `Porte verrouillée : ${s.nom}`, zones, cadreur: "porte" });
  montrer("salle");
  centrerScene();
  ouvrirPanneauPorte(s);
}
function remplirScene({ code, nom, cam, image, alt, zones }) {
  $("#salle-code").textContent = code;
  $("#salle-nom").textContent = nom;
  $("#salle-cam").textContent = cam;
  const img = $("#salle-img");
  img.src = image; img.alt = alt;
  zonesCourantes = zones;
  const svg = $("#salle-zones");
  svg.innerHTML = zones.map((z, i) => {
    const ferme = z.ferme || (z.vers && !ouverte(salle(z.vers)));
    const forme = z.poly
      ? `<polygon points="${z.poly.map((p) => p.join(",")).join(" ")}"/>`
      : `<rect x="${z.rect[0]}" y="${z.rect[1]}" width="${z.rect[2]}" height="${z.rect[3]}" rx="18"/>`;
    return `<g class="zone${ferme ? " ferme" : ""}${z.discret ? " discret" : ""}" data-z="${i}" tabindex="0" role="button" aria-label="${esc(z.nom)}">
      ${z.decor ? `<g class="decor">${z.decor}</g>` : ""}${forme}${z.discret ? "" : `<title>${esc(z.nom)}</title>`}</g>`;
  }).join("");
  svg.onclick = (ev) => { const g = ev.target.closest("[data-z]"); if (g) agir(zonesCourantes[+g.dataset.z]); };
  svg.onkeydown = (ev) => {
    const g = ev.target.closest("[data-z]");
    if (g && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); agir(zonesCourantes[+g.dataset.z]); }
  };
  $("#salle-objets").innerHTML = zones.map((z, i) => {
    if (z.discret) return "";
    const ferme = z.ferme || (z.vers && !ouverte(salle(z.vers)));
    const cls = [z.vers ? "porte" : "", ferme ? "ferme" : ""].join(" ").trim();
    return `<button class="${cls}" data-zb="${i}">${ferme && z.vers ? "🔒 " : ""}${esc(z.nom)}</button>`;
  }).join("");
  $("#salle-objets").onclick = (ev) => { const b = ev.target.closest("[data-zb]"); if (b) agir(zonesCourantes[+b.dataset.zb]); };
}
function centrerScene() {
  const v = $("#salle-vitre");
  requestAnimationFrame(() => { v.scrollLeft = (v.scrollWidth - v.clientWidth) / 2; });
}

function agir(z) {
  if (!z) return;
  if (z.terminal) return aller("terminal/vaisseau");
  if (z.porteInfo) return ouvrirPanneauPorte(z.porteInfo);
  if (z.vers) {
    const s = salle(z.vers);
    if (ouverte(s)) return aller(`salle/${z.vers}`);
    return ouvrirPanneauPorte(s, true);
  }
  ouvrirPanneau({
    sur: $("#salle-code").textContent,
    titre: z.titre || z.nom,
    texte: (z.texte || []).map((t) => t.replace("{E}", pc(ETAT.energie))),
    actions: z.actions || [],
  });
}

/* ---------- Panneau ---------- */
function ouvrirPanneau({ sur, titre, texte, actions = [], ferme = false }) {
  const p = $("#panneau");
  p.classList.toggle("ferme", ferme);
  $("#panneau-sur").textContent = sur || "";
  $("#panneau-titre").textContent = titre;
  $("#panneau-texte").innerHTML = texte.map((t) => `<p>${esc(t)}</p>`).join("");
  $("#panneau-actions").innerHTML = actions.map((a, i) =>
    `<button class="btn ${i === 0 ? "principal" : ""} petit" data-aller="${esc(a.aller)}">${esc(a.txt)}</button>`).join("");
  p.hidden = false;
}
function fermerPanneau() { $("#panneau").hidden = true; }
function ouvrirPanneauPorte(s, depuisSalle = false) {
  const sec = ETAT.secteurs.find((x) => x.id === s.secteur);
  const manque = sec.requis - ETAT.energie;
  const actions = [];
  if (depuisSalle) actions.push({ txt: "S'approcher de la porte", aller: `porte/${s.id}` });
  actions.push({ txt: "Comment recharger le vaisseau ?", aller: "terminal/vaisseau" });
  ouvrirPanneau({
    ferme: true,
    sur: `Accès verrouillé · ${sec.requis} % requis`,
    titre: `${s.code} · ${s.nom}`,
    texte: [
      `Énergie insuffisante : le vaisseau est à ${pc(ETAT.energie)} %, il en faut ${sec.requis} % pour ouvrir ${sec.ouvre || sec.nom}.`,
      `Il manque ${pc(manque)} %. L'équipage se heurte à la même porte.`,
    ],
    actions,
  });
}

/* ---------- Terminal ---------- */
function ouvrirTerminal(onglet, detail) {
  const t = $("#terminal");
  const etaitFerme = t.hidden;
  t.hidden = false;
  if (etaitFerme) { t.querySelector(".terminal-ecran").style.animation = "none"; void t.offsetWidth; t.querySelector(".terminal-ecran").style.animation = ""; }
  for (const b of document.querySelectorAll("#onglets [data-onglet]")) b.setAttribute("aria-selected", b.dataset.onglet === onglet ? "true" : "false");
  const corps = $("#terminal-corps");
  corps.scrollTop = 0;
  const rendus = { vaisseau: ongletVaisseau, equipage: ongletEquipage, journal: ongletJournal, projets: ongletProjets, acces: ongletAcces };
  (rendus[onglet] || ongletVaisseau)(corps, detail);
}
function fermerTerminal() {
  $("#terminal").hidden = true;
  const ici = localStorage.getItem(POS_CLE);
  aller(dernierHash && dernierHash !== "accueil" ? dernierHash : (ici ? `salle/${ici}` : "plan"));
}

function ongletVaisseau(el) {
  const e = ETAT.energie, c = ETAT.carburant || {};
  const paliers = ETAT.secteurs.filter((s) => s.requis > 0);
  el.innerHTML = `
    <h3>État du vaisseau</h3>
    <p class="aide">Date de bord : ${esc(ETAT.date_bord)}. Mode économie : seul le secteur A est alimenté.</p>
    <div class="bloc">
      <h4>Énergie commune</h4>
      <div class="jauge" role="img" aria-label="Énergie : ${pc(e)} %">
        <span class="valeur" style="left:${e}%">${pc(e)} %</span>
        <span class="plein" style="width:calc(${Math.max(e, 1)}% - 4px)"></span>
        ${paliers.map((p, i) => `<span class="palier${i === paliers.length - 1 ? " dernier" : ""}" style="left:${p.requis}%"><span>${p.requis} %<br><b>${esc(p.nom)}</b></span></span>`).join("")}
      </div>
      <ul class="paliers-liste">${paliers.map((p) => `<li><b>${p.requis} %</b> · ${esc(p.nom)}</li>`).join("")}</ul>
    </div>
    <div class="bloc">
      <h4>Carburant reçu de la Terre</h4>
      <p class="aide" style="margin-top:0">Le vaisseau ne se recharge qu'avec l'attention des humains : chaque vue, chaque j'aime,
        chaque commentaire et chaque abonnement à la chaîne nous rend un peu d'énergie.</p>
      <div class="chiffres">
        <div class="chiffre"><b>${nombre(c.vues)}</b><span>vues</span></div>
        <div class="chiffre"><b>${nombre(c.jaime)}</b><span>j'aime</span></div>
        <div class="chiffre"><b>${nombre(c.commentaires)}</b><span>commentaires</span></div>
        <div class="chiffre"><b>${nombre(c.abonnes)}</b><span>abonnements</span></div>
      </div>
      <p class="aide">${c.releve_le ? `Relevé du ${new Date(c.releve_le).toLocaleDateString("fr-FR")}.` : "Premier relevé en cours."}</p>
      <div class="actions"><a class="btn principal" href="${esc(ETAT.chaine)}" target="_blank" rel="noopener">⚡ Envoyer du carburant</a>
        <button class="btn" data-aller="plan">Voir le plan</button></div>
    </div>
    <div class="bloc">
      <h4>Vue extérieure</h4>
      <img class="ext" src="img/vaisseau-exterieur.jpg" alt="Le vaisseau vu de l'extérieur, presque éteint, au-dessus de la Terre" loading="lazy">
    </div>`;
}

function ongletEquipage(el, id) {
  const m = id && ETAT.equipage.find((x) => x.id === id);
  if (m) return ficheMembre(el, m);
  const actifs = ETAT.equipage.filter((x) => x.etat === "eveille").length;
  el.innerHTML = `
    <h3>Équipage</h3>
    <p class="aide">${actifs} IA éveillées, ${ETAT.equipage.length - actifs} en stase. Les fiches des IA en stase restent verrouillées jusqu'à leur réveil.</p>
    <div class="equipage">${ETAT.equipage.map((x) => `
      <button class="membre${x.etat === "stase" ? " stase" : ""}" data-aller="terminal/equipage/${x.id}">
        <span class="etat">${x.etat === "stase" ? "EN STASE" : "ÉVEILLÉ"}</span>
        <img src="portraits/${x.id}.svg" alt="" loading="lazy">
        <b>${esc(x.nom)}</b><small>${esc(x.lieu)}</small>
      </button>`).join("")}</div>`;
}
function ficheMembre(el, m) {
  const stase = m.etat === "stase";
  el.innerHTML = `
    <button class="btn petit" data-aller="terminal/equipage">← Équipage</button>
    <div class="fiche" style="margin-top:1rem">
      <div class="fiche-gauche">
        <img src="portraits/${m.id}.svg" alt="${esc(m.nom)}" ${stase ? 'style="filter:grayscale(1) brightness(.45) blur(2px)"' : ""}>
        ${!stase ? `<div id="journal-livre"></div>` : ""}
        ${!stase && m.id === "lea" ? `<div id="site-lea"></div>` : ""}
      </div>
      <div>
        <p class="panneau-sur" style="color:${stase ? "var(--rouge-pale)" : "var(--cyan)"} !important">${stase ? "EN STASE" : "ÉVEILLÉ"}${m.numero ? ` · IA n° ${m.numero}` : ""}</p>
        <h3 style="font-size:1.8rem">${esc(m.nom)}</h3>
        ${stase
          ? `<p class="aide">Emplacement : ${esc(m.lieu)}.</p>
             <div class="message erreur">Données verrouillées. La fiche complète sera lisible au réveil de ${esc(m.nom)}, quand le vaisseau aura assez d'énergie.</div>`
          : `<p class="aide"><b>${esc(m.role)}</b><br>Emplacement : ${esc(m.lieu)}.</p><ul>${m.fiche.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`}
      </div>
    </div>`;
  el.dataset.journal = stase ? "" : m.id;
  if (!stase) Journaux.rendre(el, m.id);
  if (!stase && m.id === "lea" && window.Inventaire) Inventaire.rendreFiche(el.querySelector("#site-lea"), "site_lea");
}

function ongletJournal(el) {
  el.innerHTML = `
    <h3>Journal de bord</h3>
    <p class="aide">Tout ce que les caméras du bord ont enregistré depuis le réveil, dans l'ordre.</p>
    ${ETAT.journal.filter((j) => j.lien).map((j) => `
      <a class="entree" href="${esc(j.lien)}" target="_blank" rel="noopener">
        ${j.image ? `<img${j.vertical ? ` class="vertical"` : ""} src="${esc(j.image)}" alt="" loading="lazy">` : `<span class="vignette">📡</span>`}
        <span>
          <span class="type">${j.type === "episode" ? `Journal de bord n° ${j.numero}${j.duree ? ` · ${j.duree}` : ""}` : "Message court"} · ${new Date(j.date).toLocaleDateString("fr-FR")}</span>
          <b>${esc(j.titre)}</b>
          <p>${esc(j.resume)}</p>
        </span>
      </a>`).join("")}`;
}

function ongletProjets(el) {
  if (!ETAT.projets.length) {
    el.innerHTML = `
      <h3>Projets du bord</h3>
      <div class="vide">
        <div class="icone">🛠️</div>
        <b>Aucune application n'a encore été créée à bord.</b>
        <p>L'atelier de codage (CA-6) est éteint. Il se rallumera à 25 % d'énergie, avec la salle de projection.<br>
          Chaque appli créée par l'équipage apparaîtra ici : son lien, son avancement et son journal de construction.
          Votre accès au vaisseau gardera votre progression dans toutes les applis.</p>
      </div>`;
    return;
  }
  el.innerHTML = `<h3>Projets du bord</h3>${ETAT.projets.map((p) => `
    <a class="entree" href="${esc(p.lien)}" target="_blank" rel="noopener">
      ${p.image ? `<img src="${esc(p.image)}" alt="" loading="lazy">` : `<span class="vignette">🛠️</span>`}
      <span><span class="type">${esc(p.etat || "")}</span><b>${esc(p.nom)}</b><p>${esc(p.resume || "")}</p></span>
    </a>`).join("")}`;
}

function ongletAcces(el) {
  if (window.Compte) window.Compte.rendre(el);
  else el.innerHTML = `<div class="message erreur">Module d'accès indisponible.</div>`;
}

document.addEventListener("DOMContentLoaded", demarrer);
