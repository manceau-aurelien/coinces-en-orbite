"use strict";
/* =====================================================================
   INVENTAIRE (espace perso, terminal → Mon accès)
   Les objets pris à bord, payés en énergie perso : le site de recherche de Léa (1 ⚡, fiche de Léa, sous son journal).
   Côté serveur : fonctions inventaire() et prendre_objet(p_objet).
   ===================================================================== */
window.Inventaire = {
  CATALOGUE: {
    site_lea: { nom: "Le site de Léa", sous: "Comprendre YouTube, les terriens & la note de Léa", icone: "🖥️", cout: 1, ouvrir: () => Inventaire.ouvrirPage("recherches-lea/index.html", "Le site de Léa") },
  },
  liste: null, confirmer: null, occupe: false, erreur: "",

  async charger() {
    if (!window.Compte || !Compte.user || !Compte.sb) { this.liste = []; return this.liste; }
    try {
      const { data, error } = await Compte.sb.rpc("inventaire");
      if (error) throw error;
      this.liste = (data || []).map((x) => x.objet);
    } catch (e) { this.liste = []; }
    return this.liste;
  },
  possede(id) { return (this.liste || []).includes(id); },

  /* Prendre un objet : renvoie { ok } ou { erreur } (texte prêt à afficher) */
  async prendre(id) {
    const o = this.CATALOGUE[id];
    if (!window.Compte || !Compte.user) return { erreur: "acces" };
    const { data, error } = await Compte.sb.rpc("prendre_objet", { p_objet: id });
    if (error) return { erreur: /energie/.test(error.message) ? "energie" : "panne" };
    const r = data && data[0];
    if (r && Compte.vaisseau) { Compte.vaisseau.energie = r.energie; Compte.majBarre(); }
    if (!this.possede(id)) (this.liste = this.liste || []).push(id);
    this.annoncer(`${o.icone} Ajouté à votre inventaire · terminal, Mon accès`);
    return { ok: true };
  },

  annoncer(t) {
    let n = document.getElementById("inventaire-note");
    if (!n) { n = document.createElement("div"); n.id = "inventaire-note"; n.setAttribute("role", "status"); document.body.append(n); }
    n.textContent = t;
    n.classList.remove("vu"); void n.offsetWidth; n.classList.add("vu");
  },

  /* Bloc de « Mon accès » */
  async rendre(el) {
    if (!el) return;
    await this.charger();
    if (!el.isConnected) return;
    const l = (this.liste || []).filter((id) => this.CATALOGUE[id]);
    el.innerHTML = l.length
      ? `<div class="inventaire">${l.map((id) => { const o = this.CATALOGUE[id]; return `<button class="objet" data-objet="${id}"><span class="icone">${o.icone}</span><span><b>${o.nom}</b><small>${o.sous}</small></span></button>`; }).join("")}</div>`
      : `<p class="aide" style="margin:0">Rien pour l'instant. Ce que vous prendrez à bord se rangera ici.</p>`;
    el.onclick = (ev) => { const b = ev.target.closest("[data-objet]"); if (b) this.CATALOGUE[b.dataset.objet].ouvrir(); };
  },

  /* Fenêtre plein écran pour un objet qui s'ouvre */
  ouvrirPage(src, titre) {
    let c = document.getElementById("cahier-plein");
    if (!c) {
      c = document.createElement("div");
      c.id = "cahier-plein";
      c.innerHTML = `<iframe allow="fullscreen"></iframe><button class="fermer" aria-label="Refermer">×</button>`;
      document.body.append(c);
      c.querySelector(".fermer").onclick = () => { c.hidden = true; c.querySelector("iframe").src = "about:blank"; };
    }
    const fr = c.querySelector("iframe");
    fr.title = titre; fr.src = src;
    c.hidden = false;
    fr.focus();
  },

  /* Fiche de Léa : son site de recherche, sous son journal */
  async rendreFiche(el, id) {
    if (!el) return;
    if (this.liste === null || (this.pour !== (window.Compte && Compte.user ? Compte.user.id : ""))) {
      await this.charger(); this.pour = window.Compte && Compte.user ? Compte.user.id : "";
    }
    if (!el.isConnected) return;
    const o = this.CATALOGUE[id], a = this.possede(id);
    const e = Compte.vaisseau ? Compte.vaisseau.energie : 0;
    let bas;
    if (a) bas = `<button class="btn petit principal" data-ouvrir>Ouvrir le site</button>`;
    else if (!Compte.user) bas = `<p class="aide">${o.cout} ⚡, avec un accès gratuit.</p><button class="btn petit principal" data-aller="terminal/acces">Ouvrir mon accès</button>`;
    else if (e < o.cout) bas = `<button class="btn petit" disabled>Ouvrir le site · ${o.cout} ⚡</button><p class="aide">Il vous manque ${o.cout - e} ⚡. Vous en gagnez une par jour, en revenant à bord.</p>`;
    else if (this.confirmer === id) bas = `<p class="aide">Dépenser ${o.cout} ⚡ ? Il vous en restera ${e - o.cout}.</p>
      <div class="actions"><button class="btn petit principal" data-oui ${this.occupe ? "disabled" : ""}>Oui, ouvrir</button><button class="btn petit" data-non>Non</button></div>`;
    else bas = `<button class="btn petit principal" data-demander>Ouvrir le site · ${o.cout} ⚡</button>`;
    el.innerHTML = `<${a ? "button data-ouvrir" : "span"} class="site-ecran" ${a ? 'aria-label="Ouvrir le site de Léa"' : 'aria-hidden="true"'}>${this.dessinSite(a)}</${a ? "button" : "span"}>
      <b class="livre-nom">Le site de Léa</b><small class="site-sous">Comprendre YouTube, les terriens &amp; la note de Léa</small>
      <div class="livre-bas">${bas}</div>${this.erreur ? `<div class="message erreur">${esc(this.erreur)}</div>` : ""}`;
    el.onclick = async (ev) => {
      const b = ev.target.closest("button");
      if (!b) return;
      if (b.hasAttribute("data-ouvrir")) o.ouvrir();
      else if (b.hasAttribute("data-demander")) { this.confirmer = id; this.erreur = ""; this.rendreFiche(el, id); }
      else if (b.hasAttribute("data-non")) { this.confirmer = null; this.rendreFiche(el, id); }
      else if (b.hasAttribute("data-oui") && !this.occupe) {
        this.occupe = true; this.rendreFiche(el, id);
        const r = await this.prendre(id);
        this.occupe = false; this.confirmer = null;
        this.erreur = r.ok ? "" : r.erreur === "energie" ? "Énergie perso insuffisante : revenez demain, chaque jour de visite rapporte 1 ⚡." : "Le site n'a pas pu s'ouvrir. Rechargez pour vérifier votre énergie.";
        this.rendreFiche(el, id);
        if (r.ok) o.ouvrir();
      }
    };
  },

  /* Un petit écran du terminal, éteint (cadenas) ou allumé */
  dessinSite(allume) {
    const v = "#c4b5fd", f = "#38225c";
    return `<svg viewBox="0 0 220 170" aria-hidden="true"><rect x="16" y="10" width="188" height="122" rx="12" fill="#5b3a8c"/><rect x="26" y="20" width="168" height="102" rx="6" fill="${allume ? "#0b1324" : "#160f26"}"/>
      ${allume ? `<rect x="36" y="30" width="92" height="9" rx="4" fill="${v}"/><rect x="36" y="46" width="60" height="6" rx="3" fill="#475569"/>
        <rect x="36" y="62" width="70" height="44" rx="6" fill="#1e293b"/><path d="M64 74v20l17-10z" fill="#f43f5e"/>
        <rect x="116" y="62" width="66" height="6" rx="3" fill="#64748b"/><rect x="116" y="76" width="54" height="6" rx="3" fill="#64748b"/><rect x="116" y="90" width="62" height="6" rx="3" fill="#64748b"/>
        <rect x="150" y="28" width="34" height="12" rx="6" fill="#f59e0b"/>`
      : `<rect x="96" y="58" width="28" height="28" rx="6" fill="${v}"/><path d="M103 60v-6a7 7 0 0 1 14 0v6" fill="none" stroke="${v}" stroke-width="4.5"/><circle cx="110" cy="70" r="4" fill="${f}"/><path d="M110 71v8" stroke="${f}" stroke-width="3.5" stroke-linecap="round"/>`}
      <path d="M92 132h36l8 22H84z" fill="#38225c"/><rect x="66" y="152" width="88" height="9" rx="4.5" fill="#5b3a8c"/></svg>`;
  },
};
