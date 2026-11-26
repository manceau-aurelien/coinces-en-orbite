"use strict";
/* =====================================================================
   Journaux personnels : un livre sous le portrait de chaque membre éveillé.
   Ouvrir le livre coûte 1 ⚡ et débloque la première note ; chaque note suivante coûte 1 ⚡.
   Sous le livre ouvert, de petites notes datées ; un clic ouvre la note dans une fenêtre.
   (Livre ouvert = première note débloquée.) Le prix et le texte viennent du relais.
   Affichés seulement si etat.json contient "journaux": true.
   ===================================================================== */
const Journaux = {
  notes: null, pour: null, panne: false, confirmer: null, occupe: false, erreur: "", zone: null, auteur: null, lue: null, fenetre: null,

  actifs() { return !!(typeof ETAT !== "undefined" && ETAT && ETAT.journaux); },
  pages(a) { return (this.notes || []).filter((n) => n.auteur === a).sort((x, y) => x.numero - y.numero); },
  membre(a) { return ETAT.equipage.find((x) => x.id === a) || { nom: a }; },

  /* Remplit le livre et ses notes, sous le portrait */
  async rendre(zone, auteur) {
    if (!zone || !this.actifs()) return;
    if (this.auteur !== auteur) { this.confirmer = null; this.erreur = ""; }
    this.zone = zone; this.auteur = auteur;
    const qui = Compte.user ? Compte.user.id : "";
    if (!this.notes || this.pour !== qui) await this.charger(qui);
    if (zone.isConnected) this.dessiner();
  },

  async charger(qui) {
    this.panne = false;
    try {
      if (!Compte.sb) throw new Error("relais");
      const { data, error } = await Compte.sb.rpc("journaux_du_bord");
      if (error) throw error;
      this.notes = data || [];
      this.pour = qui;
    } catch (e) { this.notes = null; this.panne = true; }
  },

  /* « Mon accès » : seulement les journaux déjà débloqués */
  async acces(el) {
    if (!el || !this.actifs()) return;
    const qui = Compte.user ? Compte.user.id : "";
    if (!this.notes || this.pour !== qui) await this.charger(qui);
    if (!el.isConnected) return;
    const l = ETAT.equipage.filter((m) => { const p = this.pages(m.id); return p.length && p[0].ouverte; });
    el.innerHTML = l.length ? `<div class="bloc"><h4>Journaux débloqués</h4><div class="actions" style="margin-top:0">${l.map((m) =>
      `<button class="btn" data-aller="terminal/equipage/${esc(m.id)}">Journal de ${esc(m.nom)}</button>`).join("")}</div></div>` : "";
  },

  dessiner() {
    if (this.lue) this.dessinerFenetre();
    const livre = this.zone && this.zone.isConnected && this.zone.querySelector("#journal-livre");
    if (!livre) return;
    if (this.panne || !this.notes) {
      livre.innerHTML = `<div class="message info">Le journal est momentanément injoignable.</div>`;
      return;
    }
    const pages = this.pages(this.auteur);
    livre.innerHTML = pages.length ? this.htmlLivre(pages) : "";
    livre.onclick = (ev) => this.clic(ev);
  },

  clic(ev) {
    const b = ev.target.closest("button");
    if (!b) return;
    if (b.dataset.pageDemander) { this.confirmer = b.dataset.pageDemander; this.erreur = ""; this.dessiner(); }
    else if (b.hasAttribute("data-page-non")) { this.confirmer = null; if (this.lue) this.fermer(); else this.dessiner(); }
    else if (b.dataset.pageOui) this.ouvrir(b.dataset.pageOui);
    else if (b.dataset.pageVoir) this.voir(b.dataset.pageVoir);
    else if (b.hasAttribute("data-page-fermer")) this.fermer();
    else if (b.dataset.aller) this.fermer();
  },

  htmlLivre(pages) {
    const m = this.membre(this.auteur), p = pages[0], image = this.dessin(p.ouverte);
    const nom = `<b class="livre-nom">Journal de ${esc(m.nom)}</b>`;
    if (p.ouverte) {
      return `<span class="livre">${image}</span>${nom}<div class="notes-livre">${pages.map((n) => {
        const [jour, heure] = n.date_bord.split(", ");
        return `<button class="feuille${n.ouverte ? "" : " fermee"}" data-page-voir="${esc(n.id)}"><span>${esc(jour)}</span>${heure ? `<span>${esc(heure)}</span>` : ""}${n.ouverte ? "" : `<b>🔒 ${n.cout} ⚡</b>`}</button>`;
      }).join("")}</div>`;
    }
    const cliquable = Compte.user && Compte.vaisseau && Compte.vaisseau.energie >= p.cout && this.confirmer !== p.id;
    return `${cliquable ? `<button class="livre" data-page-demander="${esc(p.id)}" aria-label="Ouvrir le journal de ${esc(m.nom)}">${image}</button>` : `<span class="livre">${image}</span>`}
      ${nom}<div class="livre-bas">${this.htmlPrix(p, "Ouvrir le journal")}</div>${this.erreur ? `<div class="message erreur">${esc(this.erreur)}</div>` : ""}`;
  },

  /* Fenêtre de lecture */
  voir(id) {
    const n = this.notes && this.notes.find((x) => x.id === id);
    if (!n) return;
    this.lue = id; this.erreur = ""; this.confirmer = n.ouverte ? null : id;
    if (!this.fenetre) {
      const d = this.fenetre = document.createElement("dialog");
      d.id = "lecture";
      d.onclick = (ev) => { if (ev.target === d) this.fermer(); else this.clic(ev); };
      d.onkeydown = (ev) => ev.stopPropagation(); // Échap ferme la note, pas le terminal
      d.onclose = () => { this.lue = null; this.confirmer = null; this.erreur = ""; };
      window.addEventListener("hashchange", () => this.fermer());
      document.body.append(d);
    }
    this.dessinerFenetre();
    if (!this.fenetre.open) this.fenetre.showModal();
    this.fenetre.scrollTop = 0;
  },
  fermer() { if (this.fenetre && this.fenetre.open) this.fenetre.close(); },
  dessinerFenetre() {
    const n = this.notes && this.notes.find((x) => x.id === this.lue);
    if (!n) return;
    this.fenetre.className = n.ouverte ? "" : "fermee";
    this.fenetre.setAttribute("aria-label", `Note du ${n.date_bord}`);
    this.fenetre.innerHTML = `<div class="lecture-page"><button class="lecture-x" data-page-fermer aria-label="Fermer">×</button>
      <span class="page-date">Journal de ${esc(this.membre(n.auteur).nom)} · ${esc(n.date_bord)}</span>
      ${n.ouverte ? `<h3>${esc(n.titre)}</h3><div class="page-texte">${String(n.texte || "").split(/\n\s*\n/).map((p) => `<p>${esc(p.trim())}</p>`).join("")}</div>`
        : `<h3>🔒 Note fermée</h3>${this.htmlPrix(n, "Ouvrir cette note")}`}
      ${this.erreur ? `<div class="message erreur">${esc(this.erreur)}</div>` : ""}</div>`;
  },

  /* Bouton de dépense, selon l'accès et l'énergie du visiteur */
  htmlPrix(n, verbe) {
    const e = Compte.vaisseau ? Compte.vaisseau.energie : 0;
    if (!Compte.user) return `<p class="aide">${n.cout} ⚡, avec un accès gratuit.</p><button class="btn petit principal" data-aller="terminal/acces">Ouvrir mon accès</button>`;
    if (e < n.cout) return `<button class="btn petit" disabled>${verbe} · ${n.cout} ⚡</button><p class="aide">Il vous manque ${n.cout - e} ⚡. Vous en gagnez une par jour, en revenant à bord.</p>`;
    if (this.confirmer === n.id) {
      return `<p class="aide">Dépenser ${n.cout} ⚡ ? Il vous en restera ${e - n.cout}.</p>
        <div class="actions"><button class="btn petit principal" data-page-oui="${esc(n.id)}" ${this.occupe ? "disabled" : ""}>Oui, ouvrir</button><button class="btn petit" data-page-non>Non</button></div>`;
    }
    return `<button class="btn petit principal" data-page-demander="${esc(n.id)}">${verbe} · ${n.cout} ⚡</button>`;
  },

  /* L'image du journal : fermé avec son élastique et son cadenas, ou ouvert */
  dessin(ouvert) {
    const m = this.membre(this.auteur);
    const [cuir, fonce, vif] = { byte: ["#33475e", "#1d2b3c", "#22d3ee"], lea: ["#5b3a8c", "#38225c", "#c4b5fd"] }[this.auteur] || ["#3f4a5c", "#262e3b", "#94a3b8"];
    if (ouvert) {
      const l = (x) => [0, 1, 2, 3, 4, 5].map((i) => `<path d="M${x} ${72 + i * 15}h${i === 5 ? 38 : 64}"/>`).join("");
      return `<svg viewBox="0 0 220 190" aria-hidden="true"><path d="M8 34q102-18 102 4q0-22 102-4v138q-102-16-102 4q0-20-102-4z" fill="${fonce}"/>
        <path d="M16 30q94-16 94 8v130q0-22-94-8z" fill="#f6ecd2"/><path d="M204 30q-94-16-94 8v130q0-22 94-8z" fill="#fbf4e0"/>
        <path d="M110 38v130" stroke="#cbb98e" stroke-width="3"/><g stroke="#b7a682" stroke-width="3" stroke-linecap="round">${l(30)}${l(126)}</g>
        <path d="M30 54h40M126 54h40" stroke="${fonce}" stroke-width="6" stroke-linecap="round"/><path d="M182 25v44l7-8 7 8V24z" fill="${vif}"/></svg>`;
    }
    return `<svg viewBox="0 0 220 190" aria-hidden="true"><rect x="46" y="16" width="136" height="166" rx="8" fill="#e9dcbb"/><path d="M50 172h128M50 177h128" stroke="#bfae86" stroke-width="2"/>
      <rect x="38" y="8" width="138" height="162" rx="10" fill="${cuir}"/><path d="M38 18a10 10 0 0 1 10-10h14v162H48a10 10 0 0 1-10-10z" fill="${fonce}"/>
      <rect x="70" y="16" width="98" height="146" rx="6" fill="none" stroke="#ffffff2e" stroke-width="2" stroke-dasharray="6 5"/>
      <rect x="80" y="36" width="78" height="32" rx="5" fill="#f6ecd2"/><text x="119" y="58" text-anchor="middle" font-size="19" font-weight="800" fill="${fonce}" font-family="Georgia, serif">${esc(m.nom)}</text>
      <rect x="38" y="104" width="138" height="14" fill="${fonce}"/><rect x="102" y="94" width="34" height="34" rx="7" fill="${vif}"/>
      <path d="M111 96v-7a8 8 0 0 1 16 0v7" fill="none" stroke="${vif}" stroke-width="5"/><circle cx="119" cy="108" r="4.5" fill="${fonce}"/><path d="M119 109v10" stroke="${fonce}" stroke-width="4" stroke-linecap="round"/></svg>`;
  },

  async ouvrir(id) {
    if (this.occupe) return;
    this.occupe = true; this.erreur = "";
    this.dessiner();
    try {
      const { data, error } = await Compte.sb.rpc("ouvrir_note", { p_note: id });
      if (error) throw error;
      const r = Array.isArray(data) ? data[0] : data;
      const n = this.notes.find((x) => x.id === id);
      n.ouverte = true; n.texte = r.texte;
      if (Compte.vaisseau) Compte.vaisseau.energie = r.energie;
    } catch (e) {
      this.erreur = /insuffisante/i.test(String(e && e.message)) ? "Énergie perso insuffisante : revenez demain, chaque jour de visite rapporte 1 ⚡."
        : "La note n'a pas pu s'ouvrir. Votre énergie n'a peut-être pas été dépensée : rechargez pour vérifier.";
    }
    this.occupe = false; this.confirmer = null;
    Compte.majBarre();
    this.dessiner();
  },
};
window.Journaux = Journaux;
