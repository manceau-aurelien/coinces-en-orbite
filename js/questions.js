"use strict";
/* =====================================================================
   QUESTION DU JOUR (espace perso, terminal → Mon accès → tuile « avant le prochain ⚡ »)
   Décision d'Aurélien (26/11/2026) : la question n'apparaît qu'en touchant la tuile du décompte.
   Chaque jour, une question tirée parmi celles que le terrien n'a pas encore trouvées, deux essais.
   Juste : merci pour son implication (il participe à la production du vaisseau), 1 ⚡ offerte, une fois par jour.
   Les réponses ne sont jamais dans la page : c'est le relais qui tire et vérifie (question_du_jour(), repondre_du_jour()).
   ===================================================================== */
window.Questionnaire = {
  ouvert: false, q: null, saisie: "", faux: false, occupe: false,

  async charger() {
    if (!window.Compte || !Compte.user || !Compte.sb) { this.q = null; return null; }
    try {
      const { data, error } = await Compte.sb.rpc("question_du_jour");
      if (error) throw error;
      this.q = (data && data[0]) || null;
    } catch (e) { this.q = null; }
    return this.q;
  },

  /* Appelé à chaque affichage de « Mon accès » : la tuile ouvre et referme la question */
  async brancher(el) {
    const tuile = el.querySelector("#b-question-jour"), zone = el.querySelector("#questions-acces");
    if (!tuile || !zone) return;
    tuile.onclick = () => {
      this.ouvert = !this.ouvert;
      zone.hidden = !this.ouvert;
      tuile.setAttribute("aria-expanded", String(this.ouvert));
      if (this.ouvert) { this.rendre(zone); zone.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
    };
    await this.charger();
    this.indice(el);
    if (this.ouvert) this.rendre(zone);
  },

  indice(el) {
    const i = el.querySelector("#qj-indice");
    if (!i) return;
    const e = this.q ? this.q.etat : null;
    i.textContent = e === "ouverte" ? "❓ Question du jour" : e === "juste" ? "✓ Question du jour trouvée" : e === "ratee" ? "Question du jour : demain" : "";
    i.hidden = !i.textContent;
  },

  rendre(zone) {
    if (!zone) return;
    const q = this.q;
    let h;
    if (!q) h = `<p class="aide" style="margin:0">La question du jour ne répond pas. Rechargez la page.</p>`;
    else if (q.etat === "aucune") h = `<p class="q-merci">Vous avez trouvé toutes les questions du bord. Bravo ! D'autres arriveront avec les prochains journaux de bord.</p>`;
    else if (q.etat === "juste") h = `<p class="q-merci"><b>✓ Bonne réponse !</b><br>Merci pour votre implication : en répondant, vous participez à la production du vaisseau.
      Pour cela, nous vous offrons <b>1 ⚡</b>.</p><p class="aide" style="margin:.4rem 0 0">Une nouvelle question vous attend demain.</p>`;
    else if (q.etat === "ratee") h = `<p class="q-texte">${esc(q.question)}</p><p class="q-faux">Ce n'était pas ça. Cette question reviendra un autre jour.</p>
      <p class="aide" style="margin:.4rem 0 0">Une nouvelle question vous attend demain.</p>`;
    else {
      const touches = ["7", "8", "9", "4", "5", "6", "1", "2", "3", ",", "0", "⌫"];
      h = `<p class="q-titre">Question du jour</p><p class="q-texte">${esc(q.question)}</p>
        <p class="q-source">${esc(q.source)} · ${q.essais} essai${q.essais > 1 ? "s" : ""} · 1 ⚡ offerte si c'est juste</p>
        <div class="calculette">
          <div class="ecran-calc${this.faux ? " faux" : ""}" aria-live="polite"><span>${esc(this.saisie) || "&nbsp;"}</span><small>${esc(q.unite || "")}</small></div>
          <div class="touches">${touches.map((t) => `<button type="button" data-t="${t}" aria-label="${t === "⌫" ? "Effacer" : t}">${t}</button>`).join("")}</div>
          <button type="button" class="btn petit principal valider" data-valider ${!this.saisie || this.occupe ? "disabled" : ""}>Valider</button>
        </div>
        ${this.faux ? `<p class="q-faux">Ce n'est pas ça. Il vous reste un essai.</p>` : ""}`;
    }
    zone.innerHTML = `<div class="question${q && q.etat === "juste" ? " merci" : ""}">${h}</div>`;
    zone.onclick = (ev) => this.clic(ev, zone);
  },

  async clic(ev, zone) {
    const b = ev.target.closest("button");
    if (!b || !this.q || this.q.etat !== "ouverte") return;
    let s = this.saisie;
    if (b.dataset.t) {
      const t = b.dataset.t;
      if (t === "⌫") s = s.slice(0, -1);
      else if (t === ",") { if (s && !s.includes(",")) s += ","; }
      else if (s.length < 7) s = s === "0" ? t : s + t;
      this.saisie = s; this.faux = false;
      return this.rendre(zone);
    }
    if (!b.hasAttribute("data-valider") || !s || this.occupe) return;
    this.occupe = true; this.rendre(zone);
    const { data, error } = await Compte.sb.rpc("repondre_du_jour", { p_reponse: s.replace(",", ".") });
    this.occupe = false;
    const r = !error && data && data[0];
    if (!r) { await this.charger(); this.saisie = ""; this.faux = false; return this.rendre(zone); }
    this.q.etat = r.etat; this.q.essais = r.essais; this.saisie = "";
    this.faux = !r.juste && r.etat === "ouverte";
    if (r.juste) {
      if (Compte.vaisseau) { Compte.vaisseau.energie = r.energie; Compte.majBarre(); }
      if (window.Inventaire) Inventaire.annoncer("⚡ +1 énergie perso · merci pour votre aide !");
      const corps = document.getElementById("terminal-corps");
      if (corps && document.getElementById("b-question-jour")) return Compte.rafraichir();
    }
    this.rendre(zone);
    const acces = zone.closest("#terminal-corps") || document;
    this.indice(acces);
  },
};
