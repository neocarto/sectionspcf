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
const contribute = document.getElementById("contribute");
const link = document.createElement("a");

link.href = "https://framaforms.org/la-carte-du-pcf-1792163113";
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

// Case Sections
const labelSections = document.createElement("label");
const filterSections = document.createElement("input");

filterSections.type = "checkbox";
filterSections.checked = true;

labelSections.appendChild(filterSections);
labelSections.append(" Sections");

// Case Fédérations
const labelFederations = document.createElement("label");
const filterFederations = document.createElement("input");

filterFederations.type = "checkbox";
filterFederations.checked = false;

labelFederations.appendChild(filterFederations);
labelFederations.append(" Fédérations");

// Ajouter les éléments au menu
menu.append(labelSections, labelFederations);

// -------
// MAP
// -------

const map = new maplibregl.Map({
  container: "map",
  attributionControl: false,
  style:
    "https://data.geopf.fr/annexes/ressources/vectorTiles/styles/PLAN.IGN/epure.json",
  center: [2.58, 46.7],
  zoom: 6,
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
      lid.includes("toponyme")
    ) {
      map.setLayoutProperty(id, "visibility", "none");
    }
  });
});

// -------
// CONTROLES
// -------

// Navigation
const nav = new maplibregl.NavigationControl();
map.addControl(nav, "top-right");
nav._container.style.marginTop = "60px";

// Attribution
const attribution = new maplibregl.AttributionControl({
  compact: true,
  customAttribution:
    "<b>Cartographie (partielle et non officielle)<br/>des sections et fédérations du PCF</b><hr/><i>Carte réalisée par Nicolas Lambert (section Brie Sénart)<br/>avec MapLibre GL et les données du PCF. Fond de carte : © IGN</i>",
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

map.on("load", async () => {
  const lieux = await fetch_data();

  // try {
  //   const departementsGeoJSON = await json("data/departement.geojson");

  //   const sel = config.filter((d) => d.complete).map((d) => d.id);

  //   const features = departementsGeoJSON.features.filter((d) =>
  //     sel.includes(d.properties.DEP),
  //   );

  //   const selection = {
  //     type: "FeatureCollection",
  //     features,
  //   };

  //   map.addSource("departements-pcf", {
  //     type: "geojson",
  //     data: selection,
  //   });

  //   const couches = map.getStyle().layers;

  //   const premiereCoucheRoutiere = couches.find(({ id }) =>
  //     id.toLowerCase().includes("routier"),
  //   );

  //   map.addLayer(
  //     {
  //       id: "departements-pcf-fill",
  //       type: "fill",
  //       source: "departements-pcf",
  //       minzoom: 0,
  //       maxzoom: 7,
  //       paint: {
  //         "fill-color": "red",
  //         "fill-opacity": 0.3,
  //         "fill-outline-color": "rgba(0, 0, 0, 0)",
  //       },
  //     },
  //     premiereCoucheRoutiere?.id,
  //   );
  // } catch (error) {
  //   console.error("Erreur lors du chargement des départements :", error);
  // }

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

    el.style.width = "30px";
    el.style.height = "30px";
    el.style.display = "block";
    el.style.cursor = "pointer";

    // Contenu du popup
    const lignes = champs
      .filter(({ key }) => lieu[key]?.trim())
      .map(({ key, label }) => `${label} : ${lieu[key]}`);
    const txt_popup = `
  <strong class="popup-nom">${lieu.nom || ""}</strong>

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

    markers.forEach(({ marker, estFederation, estSection }) => {
      const visible =
        (estSection && afficherSections) ||
        (estFederation && afficherFederations);

      marker.getElement().style.display = visible ? "block" : "none";
    });

    // Fermer le popup si son marqueur est masqué
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

  // Réagir aux changements des cases
  filterSections.addEventListener("change", filtrerMarqueurs);
  filterFederations.addEventListener("change", filtrerMarqueurs);

  // Appliquer les filtres dès le départ
  filtrerMarqueurs();
});
