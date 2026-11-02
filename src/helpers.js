import { csv } from "d3-fetch";
import config from "./config.json";

export async function fetch_data() {
  const files = ["fede.csv", ...config.map((d) => d.file)];
  const all = await Promise.all(
    files.map(async (file) => {
      const data = await csv(`data/${file}`);
      const type = file === "fede.csv" ? "fédération" : "section";
      return data.map((d) => ({ ...d, type }));
    }),
  );
  return all.flat();
}
