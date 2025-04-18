import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;
const mappingFile = path.join(__dirname, 'mappings.json');

app.get('/files/:key', async (req, res) => {
  const mappings = await fs.readJson(mappingFile);
  const key = req.params.key;

  if (!mappings[key]) {
    return res.status(404).send('Not found');
  }

  const cid = mappings[key];
  res.redirect(`https://ipfs.io/ipfs/${cid}`);
});

app.listen(port, () => {
  console.log(`server listening at port: ${port}`);
});


