import { csv } from "d3-fetch";
import config from "./config.json";

function normaliserDepartement(valeur) {
  const dep = String(valeur ?? "")
    .trim()
    .toUpperCase();

  if (!dep) {
    return "";
  }

  return /^\d$/.test(dep) ? dep.padStart(2, "0") : dep;
}

export async function fetch_data() {
  const files = ["fede.csv", ...config.map((d) => d.file)];
  const all = await Promise.all(
    files.map(async (file) => {
      const data = await csv(`data/${file}`);
      const estFederation = file === "fede.csv";
      const type = estFederation ? "fédération" : "section";
      const dep = estFederation ? null : file.replace(".csv", "");

      return data.map((d) => ({
        ...d,
        type,
        dep: dep ?? normaliserDepartement(d.département),
      }));
    }),
  );
  return all.flat();
}
