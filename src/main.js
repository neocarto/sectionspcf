import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { fetch_data } from "./helpers.js";
import { json } from "d3-fetch";
import config from "./config.json";

// -------
// LAYOUT
// -------

// Title
const title = document.getElementById("title");
const titreTexte = document.createElement("span");
titreTexte.className = "titre-texte";
titreTexte.textContent = "Les sections du PCF";

const titreBadge = document.createElement("span");
titreBadge.className = "titre-badge";
titreBadge.textContent = "En construction";
titreBadge.title =
  "Carte en construction : les données sont en cours de vérification.";

title.replaceChildren(titreTexte, titreBadge);

function fitText() {
  const style = window.getComputedStyle(title);
  const paddingX =
    Number.parseFloat(style.paddingLeft) +
    Number.parseFloat(style.paddingRight);
  const gap = Number.parseFloat(style.gap) || 0;
  const largeurDisponible =
    title.clientWidth - paddingX - titreBadge.offsetWidth - gap;

  let fontSize = 30;

  titreTexte.style.fontSize = fontSize + "px";

  while (titreTexte.scrollWidth + 2 > largeurDisponible && fontSize > 8) {
    fontSize -= 1;
    titreTexte.style.fontSize = fontSize + "px";
  }
}

fitText();
window.addEventListener("resize", fitText);

// Contribute
const URL_FORMULAIRE_CONTRIBUTION =
  "https://framaforms.org/la-carte-du-pcf-1792163113";

// Le formulaire peut préremplir ces champs s'ils sont configurés côté Framaforms
// avec les valeurs par défaut [current-page:query:structure] et
// [current-page:query:departement].
function creerUrlContribution(lieu) {
  const url = new URL(URL_FORMULAIRE_CONTRIBUTION);
  const nom = String(lieu.nom ?? "").trim();
  const departement = String(lieu.dep ?? "").trim();

  if (nom) {
    url.searchParams.set("structure", nom);
  }

  if (departement) {
    url.searchParams.set("departement", departement);
  }

  return url.toString();
}

const contribute = document.getElementById("contribute");
const link = document.createElement("a");

link.href = URL_FORMULAIRE_CONTRIBUTION;
link.target = "_blank";
link.rel = "noopener noreferrer";

const img = document.createElement("img");
img.src = "images/contribuez.svg";
img.alt = "Contribuez";
img.style.height = "40px";
img.style.width = "auto";

link.appendChild(img);
contribute.appendChild(link);

// Adherez
const adherez = document.getElementById("adherez");
const link2 = document.createElement("a");

link2.href = "https://www.pcf.fr/adherer";
link2.target = "_blank";
link2.rel = "noopener noreferrer";

const img2 = document.createElement("img");
img2.src = "images/adherez.svg";
img2.alt = "Adhérez";
img2.style.height = "40px";
img2.style.width = "auto";

link2.appendChild(img2);
adherez.appendChild(link2);

// -------
// MENU
// -------

const menu = document.getElementById("menu");

// Choix Sections / Fédérations (exclusif)
const labelSections = document.createElement("label");
const filterSections = document.createElement("input");

filterSections.type = "radio";
filterSections.name = "type-structure";
filterSections.value = "sections";
filterSections.checked = true;

labelSections.appendChild(filterSections);
labelSections.append(" Sections");

// Case Fédérations
const labelFederations = document.createElement("label");
const filterFederations = document.createElement("input");

filterFederations.type = "radio";
filterFederations.name = "type-structure";
filterFederations.value = "federations";
filterFederations.checked = false;

labelFederations.appendChild(filterFederations);
labelFederations.append(" Fédérations");

// Regrouper les deux choix sur une même ligne
const choixType = document.createElement("div");
choixType.className = "menu-choix-type";
choixType.append(labelSections, labelFederations);

// Ajouter les éléments au menu
menu.append(choixType);

// En-tête du menu sur mobile, avec bouton de fermeture
const enteteMenuMobile = document.createElement("div");
enteteMenuMobile.className = "menu-entete-mobile";

const titreMenuMobile = document.createElement("span");
titreMenuMobile.className = "menu-entete-mobile-titre";
titreMenuMobile.textContent = "Filtres et recherche";

const boutonFermerMenu = document.createElement("button");
boutonFermerMenu.type = "button";
boutonFermerMenu.id = "menu-fermer";
boutonFermerMenu.className = "menu-fermer";
boutonFermerMenu.textContent = "×";
boutonFermerMenu.setAttribute("aria-label", "Fermer le menu");

enteteMenuMobile.append(titreMenuMobile, boutonFermerMenu);
menu.prepend(enteteMenuMobile);

// Bouton d'ouverture du menu sur mobile
const boutonMenuMobile = document.createElement("button");
boutonMenuMobile.type = "button";
boutonMenuMobile.id = "menu-toggle";
boutonMenuMobile.className = "menu-toggle";
boutonMenuMobile.setAttribute("aria-controls", "menu");
boutonMenuMobile.setAttribute("aria-expanded", "false");
boutonMenuMobile.innerHTML = `
  <svg class="menu-toggle-icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M4 6h16M4 12h16M4 18h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>
  <span>Filtres et recherche</span>
`;
document.body.append(boutonMenuMobile);

const mediaMobile = window.matchMedia(
  "(max-width: 640px), (max-height: 480px)",
);

function ouvrirMenuMobile() {
  menu.classList.add("est-ouvert");
  boutonMenuMobile.hidden = true;
  boutonMenuMobile.setAttribute("aria-expanded", "true");
  boutonFermerMenu.focus();
}

function fermerMenuMobile(rendreFocus = false) {
  const etaitOuvert = menu.classList.contains("est-ouvert");

  menu.classList.remove("est-ouvert");
  boutonMenuMobile.hidden = false;
  boutonMenuMobile.setAttribute("aria-expanded", "false");
  fermerListeRecherche();

  if (rendreFocus && etaitOuvert) {
    boutonMenuMobile.focus();
  }
}

boutonMenuMobile.addEventListener("click", ouvrirMenuMobile);
boutonFermerMenu.addEventListener("click", () => fermerMenuMobile(true));

document.addEventListener("pointerdown", (event) => {
  if (!menu.classList.contains("est-ouvert")) {
    return;
  }

  if (menu.contains(event.target)) {
    return;
  }

  fermerMenuMobile();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menu.classList.contains("est-ouvert")) {
    fermerMenuMobile(true);
  }
});

mediaMobile.addEventListener("change", (event) => {
  if (event.matches) {
    return;
  }

  menu.classList.remove("est-ouvert");
  boutonMenuMobile.hidden = false;
  boutonMenuMobile.setAttribute("aria-expanded", "false");
});

// Type de structure actuellement affiché (les deux cases sont exclusives)
function typeStructureActif() {
  return filterFederations.checked ? "federation" : "section";
}

const LIBELLES_STRUCTURE = {
  section: {
    titre: "Les sections du PCF",
    placeholder: "Rechercher une section",
    liste: "Sections",
    vide: "Aucune section trouvée",
    proche: "Section la plus proche",
  },
  federation: {
    titre: "Les fédérations du PCF",
    placeholder: "Rechercher une fédération",
    liste: "Fédérations",
    vide: "Aucune fédération trouvée",
    proche: "Fédération la plus proche",
  },
};

function mettreAJourTitre() {
  titreTexte.textContent = LIBELLES_STRUCTURE[typeStructureActif()].titre;
  fitText();
}

mettreAJourTitre();

// -------
// MAP
// -------

const VUE_INITIALE = {
  center: [2.58, 46.7],
  zoom: 6,
};

const map = new maplibregl.Map({
  container: "map",
  attributionControl: false,
  style:
    "https://data.geopf.fr/annexes/ressources/vectorTiles/styles/PLAN.IGN/epure.json",
  center: VUE_INITIALE.center,
  zoom: VUE_INITIALE.zoom,
  minZoom: 5,
  maxZoom: 12,
});

// -------
// STYLE
// -------

map.on("style.load", () => {
  map.getStyle().layers.forEach(({ id }) => {
    const lid = id.toLowerCase();

    if (
      lid.includes("routier") ||
      lid.includes("autoroute") ||
      lid.includes("nationale") ||
      lid.includes("toponyme") ||
      lid.includes("ferre")
    ) {
      map.setLayoutProperty(id, "visibility", "none");
    }
  });
});

// -------
// CONTOUR DU DEPARTEMENT
// -------

const SOURCE_ADMIN_EXPRESS = "admin-express";
const COUCHE_CONTOUR_DEPARTEMENT = "departement-actif-contour";

const COUCHES_LIMITES_ADMIN = [
  "limite admin - limite de département bandeau",
  "limite admin - limite de département tiret",
  "limite admin - limite de région bandeau",
  "limite admin - limite de région tiret",
  "limite etat 1",
  "limite etat 2",
  "limite etat conteste",
];

let visibilitesLimitesAdmin = new Map();

function initialiserContourDepartement() {
  if (map.getSource(SOURCE_ADMIN_EXPRESS)) {
    return;
  }

  map.addSource(SOURCE_ADMIN_EXPRESS, {
    type: "vector",
    url: "https://data.geopf.fr/tms/1.0.0/ADMIN_EXPRESS/metadata.json",
  });

  map.addLayer({
    id: COUCHE_CONTOUR_DEPARTEMENT,
    type: "line",
    source: SOURCE_ADMIN_EXPRESS,
    "source-layer": "departement",
    layout: {
      visibility: "none",
      "line-join": "round",
      "line-cap": "round",
    },
    filter: ["==", ["get", "code_insee"], ""],
    paint: {
      "line-color": "#9ca3af",
      "line-width": [
        "interpolate",
        ["linear"],
        ["zoom"],
        5,
        1.5,
        8,
        2.5,
        12,
        4,
      ],
      "line-opacity": 0.95,
    },
  });

  // Mémoriser l'état initial des limites administratives du fond de carte
  visibilitesLimitesAdmin = new Map(
    COUCHES_LIMITES_ADMIN.filter((id) => map.getLayer(id)).map((id) => [
      id,
      map.getLayoutProperty(id, "visibility") ?? "visible",
    ]),
  );

  if (departementActif) {
    afficherContourDepartement(departementActif);
  }
}

function afficherContourDepartement(code) {
  if (!map.getLayer(COUCHE_CONTOUR_DEPARTEMENT)) {
    return;
  }

  map.setFilter(COUCHE_CONTOUR_DEPARTEMENT, [
    "==",
    ["get", "code_insee"],
    code ?? "",
  ]);

  map.setLayoutProperty(
    COUCHE_CONTOUR_DEPARTEMENT,
    "visibility",
    code ? "visible" : "none",
  );

  // Masquer les autres limites administratives du fond de carte
  COUCHES_LIMITES_ADMIN.forEach((id) => {
    if (!map.getLayer(id)) {
      return;
    }

    map.setLayoutProperty(
      id,
      "visibility",
      code ? "none" : (visibilitesLimitesAdmin.get(id) ?? "visible"),
    );
  });
}

// -------
// CONTROLES
// -------

// Navigation
const nav = new maplibregl.NavigationControl();
map.addControl(nav, "top-right");
nav._container.style.marginTop = "60px";

// Flyto vers un département
let departementsPromise = null;
let departementActif = null;
let rafraichirMarqueurs = () => {};

// Recherche par nom
let departementSelect = null;
let rechercheInputElement = null;
let fermerListeRecherche = () => {};
let structureSelectionnee = null;
let rechercherStructures = () => [];
let choisirStructure = () => {};
let effacerSelectionStructure = () => {};
let mettreAJourRechercheStructure = () => {};
let trouverStructureProche = () => {};

function normaliserTexte(texte) {
  return String(texte ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// Distance en kilomètres entre deux points (formule de haversine)
function distanceKm(lat1, lon1, lat2, lon2) {
  const rayonTerre = 6371;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;

  return 2 * rayonTerre * Math.asin(Math.sqrt(a));
}

function reinitialiserRecherche() {
  structureSelectionnee = null;

  if (rechercheInputElement) {
    rechercheInputElement.value = "";
  }

  fermerListeRecherche();
}

function chargerDepartements() {
  if (!departementsPromise) {
    departementsPromise = json("data/departement.geojson");
  }

  return departementsPromise;
}

function etendreBounds(bounds, coordinates) {
  if (typeof coordinates[0] === "number") {
    bounds.extend(coordinates);
  } else {
    coordinates.forEach((coord) => etendreBounds(bounds, coord));
  }
}

function revenirVueGlobale() {
  reinitialiserRecherche();
  departementActif = null;
  afficherContourDepartement(null);
  rafraichirMarqueurs();

  map.flyTo({
    center: VUE_INITIALE.center,
    zoom: VUE_INITIALE.zoom,
    duration: 1400,
  });
}

async function zoomerSurDepartement(select) {
  const id = select.value;

  fermerMenuMobile();

  if (!id) {
    revenirVueGlobale();
    return;
  }

  reinitialiserRecherche();
  rafraichirMarqueurs();

  try {
    const departementsGeoJSON = await chargerDepartements();

    const feature = departementsGeoJSON.features.find(
      (d) => d.properties.DEP === id,
    );

    if (!feature) {
      console.warn(`Département ${id} introuvable dans le GeoJSON`);
      return;
    }

    departementActif = id;
    afficherContourDepartement(id);
    rafraichirMarqueurs();

    const bounds = new maplibregl.LngLatBounds();
    etendreBounds(bounds, feature.geometry.coordinates);

    map.fitBounds(bounds, {
      padding: { top: 90, bottom: 50, left: 50, right: 50 },
      maxZoom: 10,
      duration: 1400,
    });
  } catch (error) {
    console.error("Erreur lors du chargement des départements :", error);
  }
}

function creerRechercheStructure() {
  const conteneur = document.createElement("div");
  conteneur.id = "recherche-structure";
  conteneur.className = "recherche-structure";

  const input = document.createElement("input");
  input.id = "recherche-structure-input";
  input.type = "search";
  input.placeholder = LIBELLES_STRUCTURE.section.placeholder;
  input.autocomplete = "off";
  input.spellcheck = false;
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-label", LIBELLES_STRUCTURE.section.placeholder);
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-haspopup", "listbox");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-controls", "recherche-structure-liste");
  input.title = LIBELLES_STRUCTURE.section.placeholder;

  const liste = document.createElement("ul");
  liste.id = "recherche-structure-liste";
  liste.className = "recherche-structure-liste";
  liste.setAttribute("role", "listbox");
  liste.setAttribute("aria-label", LIBELLES_STRUCTURE.section.liste);
  liste.hidden = true;

  let resultats = [];
  let indexActif = -1;

  const fermerListe = () => {
    liste.hidden = true;
    liste.replaceChildren();
    resultats = [];
    indexActif = -1;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  };

  // Empêcher la liste de dépasser le bas de l'écran, surtout en paysage
  const ajusterHauteurListe = () => {
    if (liste.hidden) {
      return;
    }

    const position = liste.getBoundingClientRect().top;
    const safeAreaBottom =
      Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--safe-area-bottom",
        ),
      ) || 0;
    const hauteurDisponible =
      window.innerHeight - position - 12 - safeAreaBottom;
    liste.style.maxHeight = `${Math.max(
      48,
      Math.min(260, hauteurDisponible),
    )}px`;
  };

  window.addEventListener("resize", ajusterHauteurListe);

  const activerOption = (index) => {
    const options = liste.querySelectorAll(".recherche-structure-option");

    if (!options.length) {
      return;
    }

    indexActif = (index + options.length) % options.length;

    options.forEach((option, i) => {
      const actif = i === indexActif;
      option.classList.toggle("est-active", actif);
      option.setAttribute("aria-selected", String(actif));
    });

    input.setAttribute("aria-activedescendant", options[indexActif].id);
    options[indexActif].scrollIntoView({ block: "nearest" });
  };

  const selectionnerResultat = (structure) => {
    if (!structure) {
      return;
    }

    input.value = structure.nom;
    fermerListe();
    choisirStructure(structure);
  };

  const afficherListe = () => {
    const recherche = input.value.trim();
    resultats = recherche ? rechercherStructures(recherche) : [];
    liste.replaceChildren();
    indexActif = -1;
    input.removeAttribute("aria-activedescendant");

    if (!recherche) {
      fermerListe();
      return;
    }

    if (!resultats.length) {
      const vide = document.createElement("li");
      vide.className = "recherche-structure-vide";
      vide.textContent = LIBELLES_STRUCTURE[typeStructureActif()].vide;
      liste.appendChild(vide);
      liste.hidden = false;
      input.setAttribute("aria-expanded", "true");
      ajusterHauteurListe();
      return;
    }

    resultats.forEach((structure, index) => {
      const option = document.createElement("li");
      option.id = `recherche-structure-option-${index}`;
      option.className = "recherche-structure-option";
      option.dataset.index = String(index);
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", "false");

      const nom = document.createElement("span");
      nom.className = "recherche-structure-nom";
      nom.textContent = structure.nom;

      const meta = document.createElement("span");
      meta.className = "recherche-structure-meta";
      meta.textContent = `${structure.estFederation ? "Fédération" : "Section"} · ${structure.dep}`;

      option.append(nom, meta);
      liste.appendChild(option);
    });

    liste.hidden = false;
    input.setAttribute("aria-expanded", "true");
    ajusterHauteurListe();
  };

  input.addEventListener("input", () => {
    effacerSelectionStructure();
    afficherListe();
  });

  input.addEventListener("search", () => {
    effacerSelectionStructure();
    afficherListe();
  });

  input.addEventListener("focus", () => {
    if (input.value.trim()) {
      afficherListe();
    }
  });

  input.addEventListener("blur", () => {
    window.setTimeout(fermerListe, 160);
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      activerOption(indexActif + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      activerOption(indexActif - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();

      if (resultats.length) {
        selectionnerResultat(resultats[indexActif >= 0 ? indexActif : 0]);
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      fermerListe();
    }
  });

  liste.addEventListener("mousedown", (event) => {
    if (event.target.closest(".recherche-structure-option")) {
      event.preventDefault();
    }
  });

  liste.addEventListener("click", (event) => {
    const option = event.target.closest(".recherche-structure-option");

    if (!option) {
      return;
    }

    selectionnerResultat(resultats[Number(option.dataset.index)]);
  });

  conteneur.append(input, liste);

  rechercheInputElement = input;
  fermerListeRecherche = fermerListe;
  mettreAJourRechercheStructure = () => {
    const libelles = LIBELLES_STRUCTURE[typeStructureActif()];

    input.placeholder = libelles.placeholder;
    input.title = libelles.placeholder;
    input.setAttribute("aria-label", libelles.placeholder);
    liste.setAttribute("aria-label", libelles.liste);
  };
  mettreAJourRechercheStructure();

  return conteneur;
}

// Sélecteur de département (flyto)
const selecteurDepartement = document.createElement("select");
selecteurDepartement.id = "flyto-departement";
selecteurDepartement.setAttribute(
  "aria-label",
  "Choisir un département ou revenir à la vue globale",
);
selecteurDepartement.title =
  "Choisir un département ou revenir à la vue globale";

const placeholder = document.createElement("option");
placeholder.value = "";
placeholder.textContent = "France entière";
selecteurDepartement.appendChild(placeholder);

config
  .filter((d) => d.complete)
  .forEach((d) => {
    const option = document.createElement("option");
    option.value = d.id;
    option.textContent = `${d.name} (${d.id})`;
    selecteurDepartement.appendChild(option);
  });

selecteurDepartement.addEventListener("change", () =>
  zoomerSurDepartement(selecteurDepartement),
);

departementSelect = selecteurDepartement;

// Regrouper le flyto et la recherche dans le menu de gauche
const separateurMenu = document.createElement("div");
separateurMenu.className = "menu-separateur";

menu.append(separateurMenu, selecteurDepartement, creerRechercheStructure());

// Recherche de la structure la plus proche
const boutonStructureProche = document.createElement("button");
boutonStructureProche.type = "button";
boutonStructureProche.id = "structure-proche";
boutonStructureProche.className = "menu-bouton";
boutonStructureProche.innerHTML = `
  <svg class="menu-bouton-icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z" fill="currentColor"/>
  </svg>
  <span class="menu-bouton-texte"></span>
`;
boutonStructureProche.title =
  "Utiliser ma position pour trouver la structure la plus proche";

boutonStructureProche.addEventListener("click", () => trouverStructureProche());

const statutStructureProche = document.createElement("p");
statutStructureProche.id = "structure-proche-statut";
statutStructureProche.className = "menu-statut";
statutStructureProche.setAttribute("role", "status");
statutStructureProche.setAttribute("aria-live", "polite");
statutStructureProche.hidden = true;

menu.append(boutonStructureProche, statutStructureProche);

function afficherStatutStructureProche(message, estErreur = false) {
  statutStructureProche.textContent = message;
  statutStructureProche.hidden = !message;
  statutStructureProche.classList.toggle("est-erreur", estErreur);
}

function mettreAJourBoutonStructureProche() {
  const libelles = LIBELLES_STRUCTURE[typeStructureActif()];

  boutonStructureProche.querySelector(".menu-bouton-texte").textContent =
    libelles.proche;
  boutonStructureProche.setAttribute(
    "aria-label",
    `${libelles.proche} (utilise votre position)`,
  );
}

mettreAJourBoutonStructureProche();

// Changer de type de structure réinitialise la recherche en cours
function changerTypeStructure() {
  reinitialiserRecherche();
  mettreAJourTitre();
  mettreAJourRechercheStructure();
  mettreAJourBoutonStructureProche();
  afficherStatutStructureProche("");
  rafraichirMarqueurs();
}

filterSections.addEventListener("change", changerTypeStructure);
filterFederations.addEventListener("change", changerTypeStructure);

// -------
// À PROPOS
// -------

const boutonAPropos = document.createElement("button");
boutonAPropos.type = "button";
boutonAPropos.id = "a-propos-ctrl";
boutonAPropos.textContent = "i";
boutonAPropos.title = "À propos de cette carte";
boutonAPropos.setAttribute("aria-label", "À propos de cette carte");
boutonAPropos.setAttribute("aria-haspopup", "dialog");
document.body.append(boutonAPropos);

const panneauAPropos = document.createElement("dialog");
panneauAPropos.id = "a-propos";
panneauAPropos.className = "a-propos";
panneauAPropos.setAttribute("aria-labelledby", "a-propos-titre");
panneauAPropos.innerHTML = `
  <header class="a-propos-entete">
    <h2 id="a-propos-titre">À propos de cette carte</h2>
    <button
      type="button"
      class="a-propos-fermer"
      aria-label="Fermer le panneau"
    >×</button>
  </header>

  <div class="a-propos-corps">
    <p class="a-propos-intro">
      Projet non officiel de cartographie des sections et fédérations
      du Parti communiste français. Ce travail est en cours d'élaborartion et les données sont en cours de vérification. N'hésitez pas à signaler toute erreur ou omission via le formulaire de contribution.
    </p>

    <section>
      <h3>Qu’est-ce qu’une section ?</h3>
      <p>
        La <strong>section</strong> est la structure de base du Parti communiste
        français (PCF). Elle rassemble les adhérent·es d’un même territoire ou
        d’un même lieu de travail. Son périmètre peut correspondre à une ou
        plusieurs communes, à un ou plusieurs quartiers ou arrondissements, à
        une zone d’activité ou à une entreprise. Elle organise la vie militante
        locale, permet aux adhérent·es de se retrouver et de mener collectivement
        des actions politiques.
      </p>
    </section>

    <section>
      <h3>Qu’est-ce qu’une fédération ?</h3>
      <p>
        La <strong>fédération</strong> est la structure du PCF à l’échelle d’un
        département. Elle regroupe et coordonne les sections de son territoire.
        Elle anime la vie politique et militante départementale, contribue à la
        mise en œuvre des orientations du Parti et organise les campagnes et
        initiatives communes.
      </p>
    </section>

    <section>
      <h3>Méthodologie</h3>
      <p>
        Ce projet recense les sections et les fédérations du Parti
        communiste français (PCF). La cartographie s’appuie sur des données
        internes au PCF, complétées par des contributions et des informations
        collectées sur le Web, notamment sur les réseaux sociaux. Sur la carte,
        chaque épingle représente une section ou une fédération. La localisation
        des sections est approximative et ne correspond pas nécessairement à une
        adresse postale réelle. Aucune donnée personnelle n’est publiée. Seules
        les coordonnées génériques des structures (adresses électroniques et
        comptes sur les réseaux sociaux) sont renseignées lorsqu’elles sont
        disponibles.
      </p>
    </section>

    <section>
      <h3>Comment contribuer ?</h3>
      <p>
        Pour ajouter une information ou signaler une erreur, vous pouvez utiliser
        l’un des moyens suivants :
      </p>
      <ul class="a-propos-liens">
        <li>
          <a href="${URL_FORMULAIRE_CONTRIBUTION}" target="_blank" rel="noopener noreferrer">
            Utiliser le formulaire de contribution
          </a>
        </li>
        <li>
          <a href="https://github.com/neocarto/sectionspcf/issues" target="_blank" rel="noopener noreferrer">
            Ouvrir une issue sur GitHub
          </a>
        </li>
      </ul>
    </section>

    <section class="a-propos-credits">
      <h3>Crédits</h3>
      <p>Nicolas Lambert, 2026<br/>
        Données : PCF & contributions.<br/>
        Fond de carte : © IGN.</p>
    </section>
  </div>
`;
document.body.append(panneauAPropos);

boutonAPropos.addEventListener("click", () => {
  fermerMenuMobile();
  panneauAPropos.showModal();
});

panneauAPropos
  .querySelector(".a-propos-fermer")
  .addEventListener("click", () => panneauAPropos.close());

panneauAPropos.addEventListener("click", (event) => {
  if (event.target === panneauAPropos) {
    panneauAPropos.close();
  }
});

// -------
// DATA
// -------

map.on("load", () => {
  initialiserContourDepartement();
});

map.on("load", async () => {
  const lieux = await fetch_data();

  // -------
  // MARKS
  // -------

  let popupActive = null;

  // Stockage des marqueurs pour pouvoir les filtrer
  const markers = [];

  // Champs CSV à afficher s'ils sont renseignés
  const champs = [
    // { key: "website", label: "Site web" },
    // { key: "email", label: "Contact" },
    // { key: "facebook", label: "Facebook" },
  ];

  // E-mail de la fédération par département, pour les infobulles des sections
  const emailsFederations = new Map();

  lieux.forEach((lieu) => {
    if (lieu.type?.trim().toLowerCase() !== "fédération") {
      return;
    }

    const dep = String(lieu.dep ?? "").trim();
    const email = String(lieu.email ?? "").trim();

    if (dep && email) {
      emailsFederations.set(dep, email);
    }
  });

  lieux.forEach((lieu) => {
    const latitude = Number(lieu.latitude);
    const longitude = Number(lieu.longitude);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      lieu.latitude?.trim() === "" ||
      lieu.longitude?.trim() === ""
    ) {
      return;
    }

    const type = lieu.type?.trim().toLowerCase();
    const estFederation = type === "fédération";
    const estSection = type === "section";

    // Ne conserver que les sections et les fédérations
    if (!estFederation && !estSection) {
      return;
    }

    // Même épingle pour tous les lieux
    const el = document.createElement("img");

    el.src = "images/section.svg";
    el.alt = lieu.nom || (estFederation ? "Fédération" : "Section");
    el.classList.add("pin");

    el.style.width = "30px";
    el.style.height = "30px";
    el.style.display = "block";
    el.style.cursor = "pointer";

    // Contenu du popup
    const lignes = champs
      .filter(({ key }) => lieu[key]?.trim())
      .map(({ key, label }) => `${label} : ${lieu[key]}`);
    const numeroDepartement = String(lieu.dep ?? "").trim();
    const emailSection = String(lieu.email ?? "").trim();
    const emailFederation = estSection
      ? (emailsFederations.get(numeroDepartement) ?? "")
      : "";
    const urlContribution = creerUrlContribution(lieu);
    const txt_popup = `
  <strong class="popup-nom">${lieu.nom || ""}${
    numeroDepartement
      ? ` <span class="popup-dep">(${numeroDepartement})</span>`
      : ""
  }</strong>

  <div class="popup-infos">
    ${
      lieu.website?.trim()
        ? `<div class="popup-ligne">
             <img class="popup-icone" src="images/url.png" alt="">
             <a href="${lieu.website}" target="_blank" rel="noopener noreferrer">${lieu.website}</a>
           </div>`
        : ""
    }
${
  emailSection
    ? `<div class="popup-ligne">
         <img class="popup-icone" src="images/email.png" alt="">
         <a href="mailto:${emailSection}">${emailSection}</a>
       </div>`
    : ""
}
${
  emailFederation && emailFederation !== emailSection
    ? `<div class="popup-ligne">
         <img class="popup-icone" src="images/email.png" alt="">
         <a href="mailto:${emailFederation}">${emailFederation}</a>
         <span class="popup-libelle">(fédé)</span>
       </div>`
    : ""
}
        ${
          lieu.facebook?.trim()
            ? `<div class="popup-ligne">
             <img class="popup-icone" src="images/facebook.png" alt="">
             <a href="https://www.facebook.com/${lieu.facebook}" target="_blank" rel="noopener noreferrer">${lieu.facebook}</a>
           </div>`
            : ""
        }
        ${
          lieu.twitter?.trim()
            ? `<div class="popup-ligne">
             <img class="popup-icone" src="images/x.png" alt="">
             <a href="https://x.com//${lieu.twitter}" target="_blank" rel="noopener noreferrer">${lieu.twitter}</a>
           </div>`
            : ""
        }
    ${
      lieu.bluesky?.trim()
        ? `<div class="popup-ligne">
             <img class="popup-icone" src="images/bluesky.avif" alt="">
             <a href="https://bsky.app/profile/${lieu.bluesky}" target="_blank" rel="noopener noreferrer">${lieu.bluesky}</a>
           </div>`
        : ""
    }

    ${
      lieu.instagram?.trim()
        ? `<div class="popup-ligne">
             <img class="popup-icone" src="images/insta.png" alt="">
             <a href="https://www.instagram.com/${lieu.instagram}" target="_blank" rel="noopener noreferrer">${lieu.instagram}</a>
           </div>`
        : ""
    }

        ${
          lieu.tiktok?.trim()
            ? `<div class="popup-ligne">
             <img class="popup-icone" src="images/tiktok.jpeg" alt="">
             <a href="https://www.tiktok.com/@${lieu.tiktok}" target="_blank" rel="noopener noreferrer">${lieu.tiktok}</a>
           </div>`
            : ""
        }
          ${
            lieu.youtube?.trim()
              ? `<div class="popup-ligne">
             <img class="popup-icone" src="images/youtube.jpeg" alt="">
             <a href="https://www.youtube.com/@${lieu.youtube}" target="_blank" rel="noopener noreferrer">${lieu.youtube}</a>
           </div>`
              : ""
          }
    ${
      lignes.length
        ? lignes
            .map((ligne) => `<div class="popup-ligne">${ligne}</div>`)
            .join("")
        : ""
    }
  </div>

  <div class="popup-contribution">
    <p class="popup-contribution-texte">
      ${
        estFederation
          ? "Vous militez dans cette fédération ?"
          : "Vous militez dans cette section ?"
      }
    </p>
    <a
      class="popup-contribuer"
      href="${urlContribution}"
      target="_blank"
      rel="noopener noreferrer"
      title="Corriger ou ajouter des informations sur cette structure (nouvel onglet)"
    >
      Corrigez ou ajoutez des infos<br/>(réseau social, site web, etc.)
    </a>
  </div>
`;

    // Créer le marqueur
    const marker = new maplibregl.Marker({
      element: el,
      anchor: "bottom",
    })
      .setLngLat([longitude, latitude])
      .addTo(map);

    // Mémoriser le marqueur et son type
    markers.push({
      marker,
      estFederation,
      estSection,
      dep: lieu.dep,
      nom: String(lieu.nom ?? "").trim(),
      longitude,
      latitude,
    });

    // Popup au clic
    el.addEventListener("click", (event) => {
      event.stopPropagation();
      fermerMenuMobile();

      if (popupActive) {
        popupActive.remove();
        popupActive = null;
      }

      const popup = new maplibregl.Popup({
        offset: 12,
        closeButton: true,
        closeOnClick: false,
        focusAfterOpen: false,
      })
        .setLngLat([longitude, latitude])
        .setHTML(txt_popup)
        .addTo(map);

      popupActive = popup;

      popup.on("close", () => {
        if (popupActive === popup) {
          popupActive = null;
        }
      });
    });
  });

  // -------
  // RECHERCHE
  // -------

  rechercherStructures = (recherche) => {
    const terme = normaliserTexte(recherche);

    if (!terme) {
      return [];
    }

    // Ne chercher que parmi les structures du type actuellement affiché
    const chercherFederations = typeStructureActif() === "federation";

    return markers
      .filter((structure) =>
        chercherFederations ? structure.estFederation : structure.estSection,
      )
      .map((structure) => {
        const nom = normaliserTexte(structure.nom);
        const position = nom.indexOf(terme);

        return { structure, nom, position };
      })
      .filter(({ position }) => position !== -1)
      .sort((a, b) => {
        const debutA = a.position === 0 ? 0 : 1;
        const debutB = b.position === 0 ? 0 : 1;

        return (
          debutA - debutB ||
          a.position - b.position ||
          a.nom.localeCompare(b.nom, "fr")
        );
      })
      .slice(0, 8)
      .map(({ structure }) => structure);
  };

  choisirStructure = (structure) => {
    if (!structure) {
      return;
    }

    fermerMenuMobile();
    structureSelectionnee = structure.marker;
    departementActif = null;

    if (departementSelect) {
      // La carte zoome sur la structure : aucun département n'est sélectionné
      departementSelect.selectedIndex = -1;
    }

    afficherContourDepartement(null);

    if (popupActive) {
      popupActive.remove();
      popupActive = null;
    }

    rafraichirMarqueurs();

    map.flyTo({
      center: [structure.longitude, structure.latitude],
      zoom: 11,
      duration: 1200,
    });
  };

  effacerSelectionStructure = () => {
    if (!structureSelectionnee) {
      return;
    }

    structureSelectionnee = null;
    rafraichirMarqueurs();
  };

  trouverStructureProche = () => {
    const chercherFederations = typeStructureActif() === "federation";
    const structures = markers.filter((structure) =>
      chercherFederations ? structure.estFederation : structure.estSection,
    );

    if (!structures.length) {
      afficherStatutStructureProche("Aucune structure disponible.", true);
      return;
    }

    if (!navigator.geolocation) {
      afficherStatutStructureProche(
        "La géolocalisation n'est pas disponible dans ce navigateur.",
        true,
      );
      return;
    }

    boutonStructureProche.disabled = true;
    afficherStatutStructureProche("Localisation en cours…");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        boutonStructureProche.disabled = false;

        const { latitude, longitude } = position.coords;
        let structurePlusProche = null;
        let distanceMin = Infinity;

        structures.forEach((structure) => {
          const distance = distanceKm(
            latitude,
            longitude,
            structure.latitude,
            structure.longitude,
          );

          if (distance < distanceMin) {
            distanceMin = distance;
            structurePlusProche = structure;
          }
        });

        if (!structurePlusProche) {
          afficherStatutStructureProche(
            "Aucune structure n'a pu être trouvée.",
            true,
          );
          return;
        }

        if (rechercheInputElement) {
          rechercheInputElement.value = structurePlusProche.nom;
        }

        choisirStructure(structurePlusProche);
        afficherStatutStructureProche("");
      },
      (error) => {
        boutonStructureProche.disabled = false;

        const messages = {
          1: "Localisation refusée. Autorisez l'accès à votre position dans le navigateur.",
          2: "Votre position n'a pas pu être déterminée.",
          3: "La localisation a expiré. Réessayez.",
        };

        afficherStatutStructureProche(
          messages[error.code] ?? "La localisation a échoué. Réessayez.",
          true,
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  // -------
  // FILTRES
  // -------

  function filtrerMarqueurs() {
    const afficherSections = filterSections.checked;
    const afficherFederations = filterFederations.checked;

    markers.forEach(({ marker, estFederation, estSection, dep }) => {
      const rechercheActive = Boolean(structureSelectionnee);
      const selectionne = rechercheActive && marker === structureSelectionnee;

      const visible =
        selectionne ||
        (estSection && afficherSections) ||
        (estFederation && afficherFederations);

      const horsSelection = rechercheActive && !selectionne;

      const horsDepartement =
        !selectionne && Boolean(departementActif) && dep !== departementActif;

      const element = marker.getElement();
      element.style.display = visible ? "block" : "none";

      element.classList.toggle("pin-hors-selection", horsSelection);
      element.classList.toggle("pin-selectionnee", selectionne);
      element.classList.toggle("pin-hors-departement", horsDepartement);
      element.classList.toggle(
        "pin-actif-departement",
        Boolean(departementActif) && !horsDepartement,
      );
    });

    // Fermer le popup si son marqueur est masqué par les filtres
    if (popupActive) {
      const positionPopup = popupActive.getLngLat();

      const popupVisible = markers.some(
        ({ marker, estFederation, estSection }) => {
          const position = marker.getLngLat();

          const visible =
            marker === structureSelectionnee ||
            (estSection && afficherSections) ||
            (estFederation && afficherFederations);

          return (
            visible &&
            position.lng === positionPopup.lng &&
            position.lat === positionPopup.lat
          );
        },
      );

      if (!popupVisible) {
        popupActive.remove();
        popupActive = null;
      }
    }
  }

  rafraichirMarqueurs = filtrerMarqueurs;

  // Appliquer les filtres dès le départ
  filtrerMarqueurs();
});
