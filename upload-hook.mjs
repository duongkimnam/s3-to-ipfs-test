import fs from 'fs-extra';
import path from 'path';
import { create } from 'ipfs-http-client';
import { fileURLToPath } from 'url';

const ipfs = create();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, 'uploads');
const mappingFile = path.join(__dirname, 'mappings.json');

await fs.ensureFile(mappingFile);
if (!fs.readFileSync(mappingFile).toString()) await fs.writeJson(mappingFile, {});

async function handleNewFiles() {
  const files = await fs.readdir(uploadsDir);
  const mappings = await fs.readJson(mappingFile);

  for (const file of files) {
    if (mappings[file]) continue;
    const buffer = await fs.readFile(path.join(uploadsDir, file));
    const result = await ipfs.add(buffer);
    console.log(`${file} uploaded to CID: ${result.cid.toString()}`);
    mappings[file] = result.cid.toString();
    await fs.writeJson(mappingFile, mappings, { spaces: 2 });
  }
}

await handleNewFiles();

