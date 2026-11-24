"use strict";
/* =====================================================================
   Journaux personnels de l'équipage : première dépense d'énergie perso.
   Le prix et le texte viennent du relais ; rien n'est décidé ici.
   Affichés seulement si etat.json contient "journaux": true.
   ===================================================================== */
const Journaux = {
  notes: null, pour: null, panne: false, confirmer: null, occupe: false, erreur: "",

  actifs() { return !!(typeof ETAT !== "undefined" && ETAT && ETAT.journaux); },

  /* Remplit `el` avec les notes des auteurs demandés */
  async rendre(el, auteurs) {
    if (!el || !this.actifs()) return;
    el.dataset.journaux = auteurs.join(",");
    const qui = Compte.user ? Compte.user.id : "";
    if (!this.notes || this.pour !== qui) {
      el.innerHTML = `<p class="aide" style="margin:0">Lecture des journaux…</p>`;
      await this.charger(qui);
    }
    if (el.isConnected) this.dessiner(el, auteurs);
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

  dessiner(el, auteurs) {
    if (this.panne || !this.notes) {
      el.innerHTML = `<div class="message info">Les journaux personnels sont momentanément injoignables.</div>`;
      return;
    }
    const energie = Compte.vaisseau ? Compte.vaisseau.energie : 0;
    const liste = auteurs.flatMap((a) => this.notes.filter((n) => n.auteur === a)); // ordre de la vidéo : Léa, puis Byte
    el.innerHTML = liste.map((n) => {
      const m = ETAT.equipage.find((x) => x.id === n.auteur) || { nom: n.auteur };
      const tete = `<img src="portraits/${esc(n.auteur)}.svg" alt="">
        <span class="note-titre"><span class="type">Journal de ${esc(m.nom)} · note ${n.numero}</span>
        <b>${n.ouverte ? esc(n.titre) : "🔒 Note personnelle"}</b>
        ${n.ouverte ? `<small>${esc(n.date_bord)}</small>` : ""}</span>`;
      if (n.ouverte) {
        return `<article class="note ouverte"><div class="note-tete">${tete}</div>
          <div class="note-texte">${String(n.texte || "").split(/\n\s*\n/).map((p) => `<p>${esc(p.trim())}</p>`).join("")}</div></article>`;
      }
      let bas;
      if (!Compte.user) {
        bas = `<p class="aide">Il faut un accès pour gagner de l'énergie perso et ouvrir cette note.</p>
          <button class="btn petit principal" data-aller="terminal/acces">Ouvrir mon accès</button>`;
      } else if (energie < n.cout) {
        bas = `<p class="aide">Il vous manque ${n.cout - energie} ⚡. Vous en gagnez une par jour, en revenant à bord.</p>
          <button class="btn petit" disabled>Ouvrir · ${n.cout} ⚡</button>`;
      } else if (this.confirmer === n.id) {
        bas = `<p class="aide">Dépenser ${n.cout} ⚡ ? Il vous en restera ${energie - n.cout}.</p>
          <div class="actions"><button class="btn petit principal" data-note-oui="${esc(n.id)}" ${this.occupe ? "disabled" : ""}>Oui, ouvrir</button>
          <button class="btn petit" data-note-non>Non</button></div>`;
      } else {
        bas = `<button class="btn petit principal" data-note-demander="${esc(n.id)}">Ouvrir · ${n.cout} ⚡</button>`;
      }
      return `<article class="note"><div class="note-tete">${tete}</div><div class="note-bas">${bas}</div></article>`;
    }).join("") || `<p class="aide" style="margin:0">Aucune note pour l'instant.</p>`;
    if (this.erreur) el.insertAdjacentHTML("beforeend", `<div class="message erreur">${esc(this.erreur)}</div>`);
    el.onclick = (ev) => {
      const b = ev.target.closest("button");
      if (!b) return;
      if (b.dataset.noteDemander) { this.confirmer = b.dataset.noteDemander; this.erreur = ""; this.dessiner(el, auteurs); }
      else if (b.hasAttribute("data-note-non")) { this.confirmer = null; this.dessiner(el, auteurs); }
      else if (b.dataset.noteOui) this.ouvrir(b.dataset.noteOui);
    };
  },

  async ouvrir(id) {
    if (this.occupe) return;
    this.occupe = true; this.erreur = "";
    this.redessiner();
    try {
      const { data, error } = await Compte.sb.rpc("ouvrir_note", { p_note: id });
      if (error) throw error;
      const r = Array.isArray(data) ? data[0] : data;
      const n = this.notes.find((x) => x.id === id);
      n.ouverte = true; n.texte = r.texte;
      if (Compte.vaisseau) Compte.vaisseau.energie = r.energie;
    } catch (e) {
      this.erreur = /insuffisante/i.test(String(e && e.message)) ? "Énergie perso insuffisante : revenez demain pour un nouveau rapport de quart."
        : "La note n'a pas pu s'ouvrir. Votre énergie n'a peut-être pas été dépensée : rechargez la page pour vérifier.";
    }
    this.occupe = false; this.confirmer = null;
    Compte.majBarre();
    Compte.rafraichir();
    this.redessiner();
  },

  redessiner() {
    for (const el of document.querySelectorAll("[data-journaux]")) this.dessiner(el, el.dataset.journaux.split(","));
  },
};
window.Journaux = Journaux;
