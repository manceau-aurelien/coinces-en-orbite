(function () {
  "use strict";

  var TABS = ["essentiel", "lois", "terriens", "note-lea", "pistes"];

  var FLOW_DATA = {
    aspiration: {
      youtube: "Lorsque un terrien ouvre YouTube (téléphone rapide à midi, TV le soir), le moteur interroge tout le catalogue pour lui seul, selon ses goûts et son moment.",
      piege: "Croire que YouTube distribue des notes arbitraires aux petites chaînes ou punit une vidéo après une première heure calme.",
      vaisseau: "Nos 8 abonnés ne nous pénalisent pas. Dès qu'une vidéo intéresse un profil précis de spectateur, YouTube peut la proposer devant une grande chaîne."
    },
    seuil: {
      youtube: "En moins d'une demi-seconde, la miniature et le titre doivent créer un écart de curiosité clair : une énigme visuelle ou émotionnelle compréhensible sans contexte.",
      piege: "Écrire « On a besoin de vous » ou montrer un résumé incompréhensible pour quelqu'un qui ne connaît pas encore Léa et Byte.",
      vaisseau: "C'est l'explication exacte de nos 0,0 % de clics sur les 87 premiers affichages de notre journal n° 1 : je demandais un service avant de montrer une énigme."
    },
    preuve: {
      youtube: "Dès le clic (ou pendant l'aperçu muet sur l'accueil), les 15 à 20 premières secondes doivent montrer immédiatement ce que la miniature et le titre ont promis.",
      piege: "Faire un long rappel des journaux précédents ou retarder l'objet du mystère : le spectateur quitte avant la première minute.",
      vaisseau: "Sur notre journal n° 1, ceux qui sont venus sont repartis avant la première minute. Dès la première seconde, ce qui se passe à bord doit être sous leurs yeux."
    },
    satisfaction: {
      youtube: "YouTube croise ensuite la durée regardée avec des signaux de plaisir réel : j'aime, abonnements, retours sur la chaîne, sondages post-visionnage et poursuite de la session.",
      piege: "Voler un clic avec un titre exagéré ou du montage bruyant : le terrien se sent trompé et l'algorithme coupe le robinet dès le lendemain.",
      vaisseau: "Notre force est l'authenticité du vaisseau : tenir la promesse, poser une vraie question fermée à la fin, et donner envie de revenir voir la suite."
    }
  };

  var STATE = {
    tab: "essentiel",
    theme: "clair",
    fontSize: 17,
    showExamples: false
  };

  function safeReadStorage(key) {
    try {
      return window.localStorage ? window.localStorage.getItem(key) : null;
    } catch (e) {
      return null;
    }
  }

  function safeWriteStorage(key, val) {
    try {
      if (window.localStorage) {
        window.localStorage.setItem(key, val);
      }
    } catch (e) {
      /* Ignore en mode file:/// restreint */
    }
  }

  function setTheme(theme) {
    STATE.theme = theme === "soir" ? "soir" : "clair";
    document.documentElement.setAttribute("data-theme", STATE.theme);
    var btn = document.getElementById("btn-theme");
    if (btn) {
      btn.textContent = STATE.theme === "soir" ? "☀️ Mode Clair" : "🌙 Mode Soir";
      btn.setAttribute("aria-pressed", String(STATE.theme === "soir"));
    }
    safeWriteStorage("ep03_guide_theme", STATE.theme);
  }

  function setTab(tabId, scrollTop) {
    if (TABS.indexOf(tabId) === -1) {
      tabId = "essentiel";
    }
    STATE.tab = tabId;

    var tabButtons = document.querySelectorAll(".tab-btn[data-tab]");
    tabButtons.forEach(function (btn) {
      var active = btn.getAttribute("data-tab") === tabId;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", String(active));
    });

    var panels = document.querySelectorAll(".tab-panel[data-panel]");
    panels.forEach(function (panel) {
      var active = panel.getAttribute("data-panel") === tabId;
      panel.classList.toggle("is-active", active);
      panel.hidden = !active;
    });

    safeWriteStorage("ep03_guide_tab", tabId);
    if (scrollTop !== false) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function setFlowStep(stepId) {
    var data = FLOW_DATA[stepId];
    if (!data) {
      return;
    }
    document.querySelectorAll(".flow-btn[data-step]").forEach(function (btn) {
      var active = btn.getAttribute("data-step") === stepId;
      btn.classList.toggle("is-selected", active);
      btn.setAttribute("aria-pressed", String(active));
    });

    var elYt = document.getElementById("flow-youtube");
    var elTrap = document.getElementById("flow-piege");
    var elShip = document.getElementById("flow-vaisseau");
    if (elYt) elYt.textContent = data.youtube;
    if (elTrap) elTrap.textContent = data.piege;
    if (elShip) elShip.textContent = data.vaisseau;
  }

  function filterDuel(topic) {
    document.querySelectorAll(".filter-btn[data-topic]").forEach(function (btn) {
      var active = btn.getAttribute("data-topic") === topic;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });

    document.querySelectorAll(".duel-row[data-topic]").forEach(function (row) {
      var match = topic === "tous" || row.getAttribute("data-topic") === topic;
      row.hidden = !match;
    });
  }

  function setNoteFontSize(sizePx) {
    var clamped = Math.max(15, Math.min(20, Number(sizePx) || 17));
    STATE.fontSize = clamped;
    document.documentElement.style.setProperty("--note-size", clamped + "px");
    document.querySelectorAll(".font-btn[data-size]").forEach(function (btn) {
      var active = Number(btn.getAttribute("data-size")) === clamped;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
    safeWriteStorage("ep03_guide_fontsize", String(clamped));
  }

  function updateChecklistScore() {
    var checks = document.querySelectorAll(".check-input");
    var checked = 0;
    checks.forEach(function (input) {
      var parent = input.closest(".check-item");
      if (parent) {
        parent.classList.toggle("is-checked", input.checked);
      }
      if (input.checked) {
        checked += 1;
      }
    });

    var countEl = document.getElementById("score-count");
    var fillEl = document.getElementById("score-fill");
    if (countEl) {
      countEl.textContent = checked + " / " + checks.length;
    }
    if (fillEl && checks.length > 0) {
      fillEl.style.width = Math.round((checked / checks.length) * 100) + "%";
    }
  }

  function toggleExamples() {
    STATE.showExamples = !STATE.showExamples;
    var list = document.getElementById("checklist-items");
    var btn = document.getElementById("btn-toggle-examples");
    if (list) {
      list.classList.toggle("show-examples", STATE.showExamples);
    }
    if (btn) {
      btn.textContent = STATE.showExamples
        ? "Masquer le journal n° 1"
        : "Voir ce que donne notre journal de bord n° 1";
      btn.setAttribute("aria-pressed", String(STATE.showExamples));
    }
  }

  function initEvents() {
    var themeBtn = document.getElementById("btn-theme");
    if (themeBtn) {
      themeBtn.addEventListener("click", function () {
        setTheme(STATE.theme === "soir" ? "clair" : "soir");
      });
    }

    document.querySelectorAll(".tab-btn[data-tab], .btn-step[data-go]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var target = btn.getAttribute("data-tab") || btn.getAttribute("data-go");
        setTab(target, true);
      });
    });

    document.querySelectorAll(".flow-btn[data-step]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setFlowStep(btn.getAttribute("data-step"));
      });
    });

    document.querySelectorAll(".filter-btn[data-topic]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        filterDuel(btn.getAttribute("data-topic"));
      });
    });

    document.querySelectorAll(".font-btn[data-size]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setNoteFontSize(btn.getAttribute("data-size"));
      });
    });

    document.querySelectorAll(".check-input").forEach(function (input) {
      input.addEventListener("change", updateChecklistScore);
    });

    var btnExamples = document.getElementById("btn-toggle-examples");
    if (btnExamples) {
      btnExamples.addEventListener("click", toggleExamples);
    }

    document.addEventListener("keydown", function (ev) {
      var tag = ev.target && ev.target.tagName ? ev.target.tagName.toLowerCase() : "";
      if (tag === "input" || tag === "textarea" || tag === "select" || ev.target.isContentEditable) {
        return;
      }
      if (ev.altKey || ev.ctrlKey || ev.metaKey) {
        return;
      }
      if (ev.key >= "1" && ev.key <= "5") {
        setTab(TABS[Number(ev.key) - 1], true);
        return;
      }
      var idx = TABS.indexOf(STATE.tab);
      if (ev.key === "ArrowRight" && idx < TABS.length - 1) {
        setTab(TABS[idx + 1], true);
      } else if (ev.key === "ArrowLeft" && idx > 0) {
        setTab(TABS[idx - 1], true);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var savedTheme = safeReadStorage("ep03_guide_theme");
    var savedFont = safeReadStorage("ep03_guide_fontsize");
    setTheme(savedTheme || "clair");
    setNoteFontSize(savedFont || 17);
    setTab("essentiel", false);
    setFlowStep("aspiration");
    filterDuel("tous");
    updateChecklistScore();
    initEvents();
  });
})();
