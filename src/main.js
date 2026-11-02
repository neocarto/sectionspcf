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
title.textContent = "Sections et fédérations PCF";

function fitText() {
  const parentWidth = title.clientWidth;
  let fontSize = 30;

  title.style.fontSize = fontSize + "px";

  while (title.scrollWidth > parentWidth && fontSize > 8) {
    fontSize -= 1;
    title.style.fontSize = fontSize + "px";
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

// Ajouter les éléments au menu
menu.append(labelSections, labelFederations);

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

  if (!id) {
    revenirVueGlobale();
    return;
  }

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

class FlyToDepartementControl {
  onAdd() {
    const container = document.createElement("div");
    container.className = "maplibregl-ctrl maplibregl-ctrl-group";
    container.id = "flyto-ctrl";

    const select = document.createElement("select");
    select.id = "flyto-departement";
    select.setAttribute(
      "aria-label",
      "Choisir un département ou revenir à la vue globale",
    );
    select.title = "Choisir un département ou revenir à la vue globale";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "France entière";
    select.appendChild(placeholder);

    config
      .filter((d) => d.complete)
      .forEach((d) => {
        const option = document.createElement("option");
        option.value = d.id;
        option.textContent = `${d.name} (${d.id})`;
        select.appendChild(option);
      });

    select.addEventListener("change", () => zoomerSurDepartement(select));

    container.appendChild(select);
    this._container = container;

    return container;
  }

  onRemove() {
    this._container.remove();
  }
}

map.addControl(new FlyToDepartementControl(), "top-right");

// Attribution
const attribution = new maplibregl.AttributionControl({
  compact: true,
  customAttribution:
    "<b>Cartographie (partielle et non officielle)<br/>des sections et fédérations du PCF</b><hr/><i>Carte réalisée par la section PCF Brie Sénart<br/>avec MapLibre GL et les données du PCF. Fond de carte : © IGN</i>",
});

map.addControl(attribution, "bottom-right");

map.once("idle", () => {
  const control = document.querySelector(".maplibregl-ctrl-attrib");

  if (control) {
    control.classList.remove("maplibregl-compact-show");
    control.removeAttribute("open");
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
  estFederation && lieu.email?.trim()
    ? `<div class="popup-ligne">
         <img class="popup-icone" src="images/email.png" alt="">
         <a href="mailto:${lieu.email}">${lieu.email}</a>
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
    });

    // Popup au clic
    el.addEventListener("click", (event) => {
      event.stopPropagation();

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
  // FILTRES
  // -------

  function filtrerMarqueurs() {
    const afficherSections = filterSections.checked;
    const afficherFederations = filterFederations.checked;

    markers.forEach(({ marker, estFederation, estSection, dep }) => {
      const visible =
        (estSection && afficherSections) ||
        (estFederation && afficherFederations);

      const element = marker.getElement();
      element.style.display = visible ? "block" : "none";

      const horsDepartement =
        Boolean(departementActif) && dep !== departementActif;

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

  // Réagir aux changements des cases
  filterSections.addEventListener("change", filtrerMarqueurs);
  filterFederations.addEventListener("change", filtrerMarqueurs);

  // Appliquer les filtres dès le départ
  filtrerMarqueurs();
});
