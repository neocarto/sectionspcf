import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { csv } from "d3-fetch";

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
img.style.width = "140px";
img.style.height = "auto";
link.appendChild(img);
contribute.appendChild(link);

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
});

const stylePopups = document.createElement("style");

stylePopups.textContent = `
  .maplibregl-marker {
    z-index: 1;
  }

  .maplibregl-popup {
    z-index: 10000 !important;
  }
`;

document.head.appendChild(stylePopups);

// -------
// STYLE
// -------

map.on("style.load", () => {
  map.getStyle().layers.forEach(({ id }) => {
    const lid = id.toLowerCase();

    if (
      lid.includes("routier") ||
      lid.includes("autoroute") ||
      lid.includes("nationale")
    ) {
      map.setLayoutProperty(id, "visibility", "none");
    }

    if (lid.includes("toponyme localite")) {
      map.setLayerZoomRange(id, 0, 7);
    }
  });
});

// -------
// CONTROLES
// -------

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
nav._container.style.marginTop = "60px";
// Forcer la fermeture après l'initialisation
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
  let lieux;

  try {
    lieux = await csv(`${import.meta.env.BASE_URL}data/pcf.csv`);

    // Ne conserver que les sections et les fédérations
    lieux = lieux.filter((d) =>
      ["section", "fédération"].includes(d.type?.trim().toLowerCase()),
    );

    console.log("Nombre de lieux :", lieux.length);
  } catch (error) {
    console.error("Erreur lors du chargement du CSV :", error);
    return;
  }

  // -------
  // DEPARTMENTS
  // -------

  try {
    const response = await fetch("data/departement.geojson");

    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status}`);
    }

    const departementsGeoJSON = await response.json();

    const sel = [...new Set(lieux.map((d) => d.département))];

    const features = departementsGeoJSON.features.filter((d) => {
      return sel.includes(d.properties.DEP);
    });

    const selection = {
      type: "FeatureCollection",
      features: features,
    };

    console.log("Départements sélectionnés :", selection.features.length);

    map.addSource("departements-pcf", {
      type: "geojson",
      data: selection,
    });

    const couches = map.getStyle().layers;

    const premiereCoucheRoutiere = couches.find(({ id }) =>
      id.toLowerCase().includes("routier"),
    );

    map.addLayer(
      {
        id: "departements-pcf-fill",
        type: "fill",
        source: "departements-pcf",
        minzoom: 0,
        maxzoom: 7,
        paint: {
          "fill-color": "#e31a1c",
          "fill-opacity": 0.35,
          "fill-outline-color": "#b51217",
        },
      },
      premiereCoucheRoutiere?.id,
    );
  } catch (error) {
    console.error("Erreur lors du chargement des départements :", error);
  }

  // -------
  // MARKS
  // -------

  let popupActive = null;

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

    const el = document.createElement("img");

    const type = lieu.type?.trim().toLowerCase();
    const estFederation = type === "fédération";

    el.src = estFederation ? "images/fede.svg" : "images/section.svg";

    el.alt = lieu.nom || (estFederation ? "Fédération" : "Section");

    el.style.width = "30px";
    el.style.height = "30px";
    el.style.cursor = "pointer";

    el.style.zIndex = estFederation ? "1000" : "1";

    const lignes = champs
      .filter(({ key }) => lieu[key]?.trim())
      .map(({ key, label }) => `${label} : ${lieu[key]}`);

    const txt_popup = `
      <strong>${lieu.nom || ""}</strong>
      ${lignes.length ? "<br>" + lignes.join("<br>") : ""}
    `;

    new maplibregl.Marker({
      element: el,
      anchor: "bottom",
    })
      .setLngLat([longitude, latitude])
      .addTo(map);

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
});
