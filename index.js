import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = 3000;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, file.originalname),
});
const upload = multer({ storage });
const mappingFile = path.join(__dirname, 'mappings.json');

await fs.ensureFile(mappingFile);
await fs.ensureDir('uploads');

app.post('/upload', upload.single('file'), async (req, res) => {
  const filePath = req.file.path;

  exec(`ipfs add ${filePath}`, async (err, stdout) => {
    if (err) return res.status(500).send('Upload IPFS failed');

    const cid = stdout.split(' ')[1];
    const mappings = await fs.readJson(mappingFile).catch(() => ({}));

    mappings[req.file.originalname] = cid;
    await fs.writeJson(mappingFile, mappings, { spaces: 2 });

    res.json({ key: req.file.originalname, cid });
  });
});

app.get('/files/:key', async (req, res) => {
  const mappings = await fs.readJson(mappingFile).catch(() => ({}));
  const cid = mappings[req.params.key];
  if (!cid) return res.status(404).send('Not found');
  res.redirect(`https://ipfs.io/ipfs/${cid}`);
});

app.listen(port, () => {
  console.log(`Gateway listening at http://localhost:${port}`);
});

