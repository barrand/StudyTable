import { mkdir, writeFile } from "node:fs/promises";
const dir = ".cache/sources";
await mkdir(dir, { recursive: true });
for (const id of ["engwebp", "eng-kjv"]) {
  const url = `https://ebible.org/Scriptures/${id}_usfm.zip`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  await writeFile(
    `${dir}/${id}.zip`,
    Buffer.from(await response.arrayBuffer()),
  );
  console.log(`Downloaded ${id}`);
}
const sha = "89ece29525e3c51d61850b28b4d4cf27ef9cd321";
const response = await fetch(
  `https://api.github.com/repos/STEPBible/STEPBible-Data/git/trees/${sha}?recursive=1`,
);
const tree = (await response.json()) as { tree: { path: string }[] };
const paths = tree.tree
  .map((x) => x.path)
  .filter((p) =>
    /^(Translators Amalgamated OT\+NT\/(TAGNT|TAHOT)|Lexicons\/TBES[GH]|Morphology codes\/TE[GH]MC)/.test(
      p,
    ),
  );
await writeFile(`${dir}/step-files.json`, JSON.stringify(paths, null, 2));
for (const path of paths) {
  const url = `https://raw.githubusercontent.com/STEPBible/STEPBible-Data/${sha}/${path.split("/").map(encodeURIComponent).join("/")}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  await writeFile(`${dir}/${path.split("/").at(-1)}`, await response.text());
  console.log(`Downloaded ${path}`);
}
