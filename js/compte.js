"use strict";
/* =====================================================================
   Accès au vaisseau : un seul compte pour le site et toutes les applis.
   La clé ci-dessous est publique par conception ; la sécurité vient
   des règles RLS de la base. Les applis du bord créent leur client avec
   la même storageKey ("coinces-acces") : la connexion est partagée.
   ===================================================================== */
const ACCES_URL = "https://dsessjeacvlsoncnlwmh.supabase.co";
const ACCES_CLE = "sb_publishable_0q7q7nRw21calnx_Pi9Stw_09yQQ7TH";
const ACCES_STOCKAGE = "coinces-acces";

const Compte = {
  sb: null, user: null, pseudo: "", vaisseau: null, sqlManquant: false, recuperation: false,
  mode: "entrer", message: null, occupe: false, confirmerSuppression: false,

  demarrer() {
    if (!(window.supabase && window.supabase.createClient)) { this.majBarre(); return; }
    this.sb = window.supabase.createClient(ACCES_URL, ACCES_CLE, {
      auth: { storageKey: ACCES_STOCKAGE, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "implicit" },
    });
    this.sb.auth.onAuthStateChange((ev, session) => {
      if (ev === "PASSWORD_RECOVERY") {
        this.recuperation = true; this.user = session && session.user;
        setTimeout(() => aller("terminal/acces"), 0);
        return;
      }
      if (ev === "SIGNED_OUT") { this.user = null; this.vaisseau = null; this.pseudo = ""; this.majBarre(); this.rafraichir(); }
    });
    this.sb.auth.getSession().then(({ data }) => {
      const s = data && data.session;
      if (s && !this.recuperation) this.connecte(s.user, false);
      else { this.majBarre(); this.rafraichir(); }
    }).catch(() => this.majBarre());
  },

  async connecte(user, annoncer = true) {
    this.user = user;
    try {
      const { data } = await this.sb.from("profiles").select("username").eq("id", user.id).maybeSingle();
      this.pseudo = (data && data.username) || (user.user_metadata && user.user_metadata.username) || "Terrien";
    } catch (e) { this.pseudo = "Terrien"; }
    await this.rapportDeQuart(annoncer);
    this.majBarre();
    this.rafraichir();
  },

  /* +1 énergie perso par jour de connexion, calculé côté serveur */
  async rapportDeQuart(annoncer) {
    try {
      const { data, error } = await this.sb.rpc("rapport_de_quart");
      if (error) throw error;
      this.vaisseau = Array.isArray(data) ? data[0] : data;
      this.sqlManquant = false;
      if (this.vaisseau && this.vaisseau.nouveau && typeof ouvrirPanneau === "function") {
        ouvrirPanneau({
          sur: "Visite du jour",
          titre: `Bienvenue à bord, ${this.pseudo}`,
          texte: [`+1 ⚡ d'énergie perso pour votre visite d'aujourd'hui (vous en avez ${this.vaisseau.energie}).`,
            this.vaisseau.serie > 1 ? `${this.vaisseau.serie} jours de suite. L'équipage compte sur vous.` : "Revenez demain : chaque jour de visite rapporte 1 ⚡."],
          actions: [{ txt: "Mon accès", aller: "terminal/acces" }],
        });
      }
    } catch (e) {
      this.vaisseau = null;
      this.sqlManquant = /PGRST202|rapport_de_quart|function/i.test(String((e && (e.code || e.message)) || ""));
    }
    if (annoncer) this.rafraichir();
  },

  majBarre() {
    const t = document.getElementById("acces-txt");
    if (!t) return;
    t.textContent = this.user ? `${this.pseudo}${this.vaisseau ? ` · ⚡ ${this.vaisseau.energie}` : ""}` : "Mon accès";
    document.querySelector("#btn-acces .pastille").textContent = this.user ? "🧑‍🚀" : "📡";
  },

  rafraichir() {
    const corps = document.getElementById("terminal-corps");
    const onglet = document.querySelector('#onglets [aria-selected="true"]');
    if (corps && onglet && onglet.dataset.onglet === "acces" && !document.getElementById("terminal").hidden) this.rendre(corps);
    if (corps && corps.dataset.journal && document.getElementById("journal-livre")) Journaux.rendre(corps, corps.dataset.journal);
    const site = document.getElementById("site-lea");
    if (site && window.Inventaire) Inventaire.rendreFiche(site, "site_lea");
  },

  /* ---------- Affichage ---------- */
  rendre(el) {
    const msg = this.message ? `<div class="message ${this.message.type}">${this.message.html}</div>` : "";
    if (!this.sb) {
      el.innerHTML = `<h3>Mon accès</h3><div class="message erreur">Le relais d'accès ne répond pas. Vérifiez votre connexion internet puis rechargez la page.</div>`;
      return;
    }
    if (this.recuperation) {
      el.innerHTML = `<h3>Nouveau mot de passe</h3>
        <p class="aide">Choisissez un nouveau mot de passe pour votre accès.</p>${msg}
        <form class="formulaire" id="f-nouveau">
          <label>Nouveau mot de passe<input type="password" name="pass" minlength="6" required autocomplete="new-password"></label>
          <button class="btn principal" ${this.occupe ? "disabled" : ""}>Enregistrer</button>
        </form>`;
      el.querySelector("#f-nouveau").onsubmit = (e) => { e.preventDefault(); this.nouveauMotDePasse(new FormData(e.target).get("pass")); };
      return;
    }
    if (this.user) return this.rendreProfil(el, msg);

    const choix = [["entrer", "J'ai déjà un accès"], ["creer", "Créer mon accès"], ["oubli", "Mot de passe oublié"]];
    let form = "";
    if (this.mode === "creer") {
      form = `<form class="formulaire" id="f-acces">
        <label>Pseudo (visible à bord)<input name="pseudo" minlength="3" maxlength="20" required autocomplete="nickname"></label>
        <label>E-mail<input type="email" name="email" required autocomplete="email"></label>
        <label>Mot de passe (6 caractères min.)<input type="password" name="pass" minlength="6" required autocomplete="new-password"></label>
        <p class="aide" style="margin:0">Retenez bien votre e-mail et votre mot de passe : ils ouvrent le vaisseau et toutes les applis du bord, sur tous vos appareils.</p>
        <button class="btn principal" ${this.occupe ? "disabled" : ""}>Créer mon accès</button>
      </form>`;
    } else if (this.mode === "oubli") {
      form = `<form class="formulaire" id="f-acces">
        <label>E-mail de votre accès<input type="email" name="email" required autocomplete="email"></label>
        <button class="btn principal" ${this.occupe ? "disabled" : ""}>Recevoir un lien</button>
      </form>`;
    } else {
      form = `<form class="formulaire" id="f-acces">
        <label>E-mail<input type="email" name="email" required autocomplete="email"></label>
        <label>Mot de passe<input type="password" name="pass" required autocomplete="current-password"></label>
        <button class="btn principal" ${this.occupe ? "disabled" : ""}>Se connecter</button>
      </form>`;
    }
    el.innerHTML = `<h3>Mon accès au vaisseau</h3>
      <p class="aide">Un seul accès pour tout le bord : il garde votre énergie perso, et plus tard votre progression dans chaque
        application créée par l'équipage. La visite reste libre sans accès.</p>
      <div class="choix">${choix.map(([m, t]) => `<button data-mode="${m}" aria-pressed="${this.mode === m}">${t}</button>`).join("")}</div>
      ${msg}${form}
      <div class="bloc" style="margin-top:1.4rem">
        <h4>Énergie perso</h4>
        <p class="aide" style="margin:0">Chaque jour où vous revenez à bord avec votre accès, vous gagnez 1 ⚡. Cette énergie est la vôtre.
          Elle n'ouvre pas les salles du vaisseau (seule l'énergie commune le peut), mais elle ${Journaux.actifs() ? "ouvre les journaux personnels de l'équipage" : "débloquera des bonus"}.</p>
      </div>`;
    el.querySelector(".choix").onclick = (e) => {
      const b = e.target.closest("[data-mode]");
      if (b) { this.mode = b.dataset.mode; this.message = null; this.rendre(el); }
    };
    el.querySelector("#f-acces").onsubmit = (e) => { e.preventDefault(); this.envoyer(Object.fromEntries(new FormData(e.target)), el); };
  },

  /* Temps avant minuit à Paris : c'est l'heure où la base compte un nouveau jour de visite */
  secondesAvantProchain() {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "numeric", minute: "numeric", second: "numeric", hourCycle: "h23" })
      .formatToParts(new Date()).map((x) => [x.type, +x.value]));
    return Math.max(0, 86400 - (p.hour * 3600 + p.minute * 60 + p.second));
  },
  texteDecompte() {
    const s = this.secondesAvantProchain(), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return h ? `${h} h ${String(m).padStart(2, "0")}` : m ? `${m} min` : "maintenant";
  },
  suivreDecompte() {
    clearInterval(this.minuterie);
    this.minuterie = setInterval(() => {
      const b = document.getElementById("decompte-eclair");
      if (!b) return clearInterval(this.minuterie);
      b.textContent = this.texteDecompte();
      if (this.secondesAvantProchain() <= 1 && !this.minuit) {   // minuit passé, page ouverte : la visite du nouveau jour compte
        this.minuit = true;
        setTimeout(() => { this.minuit = false; this.rapportDeQuart(true); }, 3000);
      }
    }, 15000);
  },

  rendreProfil(el, msg) {
    const v = this.vaisseau;
    const energie = v ? `<div class="chiffres">
        <div class="chiffre"><b>⚡ ${v.energie}</b><span>énergie perso</span></div>
        <div class="chiffre"><b>${v.quarts}</b><span>jour${v.quarts > 1 ? "s" : ""} de visite</span></div>
        <div class="chiffre"><b>${v.serie}</b><span>jour${v.serie > 1 ? "s" : ""} de suite</span></div>
        <div class="chiffre decompte"><b id="decompte-eclair">${Compte.texteDecompte()}</b><span>avant le prochain ⚡</span></div>
      </div>
      <p class="aide">${v.nouveau ? "+1 ⚡ pour votre visite d'aujourd'hui." : "Votre ⚡ du jour est déjà compté."} Le prochain arrive à minuit (heure de Paris) : il suffit de passer à bord une fois dans la journée.</p>`
      : `<div class="message info">${this.sqlManquant ? "Le compteur d'énergie perso n'est pas encore installé à bord." : "Compteur d'énergie perso momentanément injoignable."}</div>`;
    el.innerHTML = `<h3>Mon accès</h3>
      <p class="aide">Connecté en tant que <b>${esc(this.pseudo)}</b>${this.user.email ? ` (${esc(this.user.email)})` : ""}.</p>
      ${msg}
      <div class="bloc"><h4>Énergie perso</h4>${energie}</div>
      ${Journaux.actifs() ? `<div id="journaux-acces"></div>` : `<div class="bloc"><h4>Bonus</h4>
        <div class="bonus"><span class="cadenas">🔒</span><span><b>Archives du bord</b><br>Bientôt disponibles avec votre énergie perso.</span></div>
      </div>`}
      <div class="bloc"><h4>Inventaire</h4><div id="inventaire-acces"></div></div>
      <div class="bloc"><h4>Applis du bord</h4>
        <p class="aide" style="margin:0">Aucune appli pour l'instant. Votre progression y sera enregistrée sur cet accès dès leur création.</p>
      </div>
      <div class="actions">
        <button class="btn" id="b-sortir">Se déconnecter</button>
        <button class="btn alerte" id="b-supprimer">Supprimer mon accès</button>
      </div>
      ${this.confirmerSuppression ? `<div class="message erreur" style="margin-top:1rem">Supprimer définitivement cet accès ? Votre énergie perso et votre progression
        dans toutes les applis reliées à cet accès seront effacées. Impossible de revenir en arrière.
        <div class="actions"><button class="btn alerte" id="b-confirmer">Oui, supprimer définitivement</button><button class="btn" id="b-annuler">Annuler</button></div></div>` : ""}`;
    Journaux.acces(el.querySelector("#journaux-acces"));
    if (window.Inventaire) Inventaire.rendre(el.querySelector("#inventaire-acces"));
    if (v) this.suivreDecompte();
    el.querySelector("#b-sortir").onclick = () => this.sortir();
    el.querySelector("#b-supprimer").onclick = () => { this.confirmerSuppression = true; this.rendre(el); };
    const c = el.querySelector("#b-confirmer");
    if (c) {
      c.onclick = () => this.supprimer(el);
      el.querySelector("#b-annuler").onclick = () => { this.confirmerSuppression = false; this.rendre(el); };
    }
  },

  /* ---------- Actions ---------- */
  async envoyer(d, el) {
    if (this.occupe) return;
    this.occupe = true; this.message = null;
    const fin = (type, html) => { this.occupe = false; this.message = type ? { type, html } : null; this.rendre(el); };
    try {
      const email = String(d.email || "").trim();
      if (this.mode === "creer") {
        const pseudo = String(d.pseudo || "").trim();
        if (pseudo.length < 3 || pseudo.length > 20 || /[@<>\u0000-\u001f]/.test(pseudo)) return fin("erreur", "Pseudo : entre 3 et 20 caractères, sans @, &lt; ni &gt;.");
        const libre = await this.sb.rpc("username_available", { p_name: pseudo });
        if (libre.error) throw libre.error;
        if (libre.data === false) return fin("erreur", "Ce pseudo est déjà pris à bord. Essayez-en un autre.");
        const { data, error } = await this.sb.auth.signUp({
          email, password: d.pass,
          options: { data: { username: pseudo, avatar: "🛰️" }, emailRedirectTo: location.origin + location.pathname },
        });
        if (error) throw error;
        if (data.session) { this.occupe = false; this.message = { type: "ok", html: "Accès créé. Bienvenue à bord !" }; return this.connecte(data.user); }
        return fin("ok", "Accès créé. Un e-mail de confirmation vient de partir : ouvrez le lien qu'il contient, puis connectez-vous ici.");
      }
      if (this.mode === "oubli") {
        const { error } = await this.sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
        if (error) throw error;
        return fin("ok", "Si cet e-mail correspond à un accès, un lien pour changer le mot de passe vient de partir.");
      }
      const { data, error } = await this.sb.auth.signInWithPassword({ email, password: d.pass });
      if (error) throw error;
      this.occupe = false;
      return this.connecte(data.user);
    } catch (e) {
      fin("erreur", esc(traduireErreur(e)));
    }
  },

  async nouveauMotDePasse(pass) {
    this.occupe = true;
    const { error } = await this.sb.auth.updateUser({ password: pass });
    this.occupe = false;
    if (error) { this.message = { type: "erreur", html: esc(traduireErreur(error)) }; return this.rafraichir(); }
    this.recuperation = false;
    this.message = { type: "ok", html: "Mot de passe changé." };
    const { data } = await this.sb.auth.getSession();
    if (data && data.session) this.connecte(data.session.user);
  },

  async sortir() {
    try { await this.sb.auth.signOut({ scope: "local" }); } catch (e) { /* hors ligne */ }
    this.user = null; this.vaisseau = null; this.message = { type: "info", html: "Vous êtes déconnecté. La visite reste ouverte." };
    this.majBarre(); this.rafraichir();
  },

  async supprimer(el) {
    try {
      const r = await this.sb.rpc("delete_my_account");
      if (r.error) throw r.error;
      await this.sb.auth.signOut({ scope: "local" }).catch(() => {});
      this.user = null; this.vaisseau = null; this.confirmerSuppression = false;
      this.message = { type: "ok", html: "Accès supprimé, avec toutes ses données." };
    } catch (e) {
      this.message = { type: "erreur", html: esc(traduireErreur(e)) };
    }
    this.majBarre(); this.rendre(el);
  },
};

function traduireErreur(e) {
  const m = String((e && e.message) || e || "");
  if (/invalid login credentials/i.test(m)) return "E-mail ou mot de passe incorrect.";
  if (/email not confirmed/i.test(m)) return "Cet e-mail n'est pas encore confirmé : ouvrez le lien reçu par e-mail.";
  if (/already registered|already exists/i.test(m)) return "Un accès existe déjà avec cet e-mail. Connectez-vous, ou utilisez « Mot de passe oublié ».";
  if (/password.*(at least|short|6)/i.test(m)) return "Mot de passe trop court : 6 caractères au minimum.";
  if (/rate limit|too many/i.test(m)) return "Trop de tentatives. Patientez quelques minutes.";
  if (/failed to fetch|network/i.test(m)) return "Le relais ne répond pas. Vérifiez votre connexion internet.";
  return "Le relais a refusé la demande : " + m;
}

window.Compte = Compte;
