// gateway.mjs (pin using local IPFS node instead of Pinata)
import express from 'express';
import multer from 'multer';
import { MongoClient } from 'mongodb';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import dotenv from 'dotenv';
import cors from 'cors';
import mime from 'mime-types';
import crypto from 'crypto';
import cron from 'node-cron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGO_URI;
const dbName = 's3ipfs';

app.use(cors());
app.use(express.json());

// Mongo connection
const client = new MongoClient(mongoUri);
await client.connect();
const db = client.db(dbName);
const filesCol = db.collection('files');

const storage = multer.memoryStorage();
const upload = multer({ storage });

const sha256 = (buffer) => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

const pinToLocalIPFS = async (cid) => {
  return new Promise((resolve, reject) => {
    exec(`ipfs pin add ${cid}`, (err, stdout, stderr) => {
      if (err) reject(stderr);
      else resolve(stdout);
    });
  });
};

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { originalname, mimetype, buffer } = req.file;
    const hash = sha256(buffer);

    const existing = await filesCol.findOne({ hash });
    if (existing) {
      return res.status(200).json({ reused: true, cid: existing.cid });
    }

    const tempPath = path.join('/tmp', originalname);
    await fs.writeFile(tempPath, buffer);

    exec(`ipfs add -Q ${tempPath}`, async (err, stdout) => {
      if (err) return res.status(500).send('IPFS add failed');
      const cid = stdout.trim();

      try {
        await pinToLocalIPFS(cid);
        const metadata = {
          key: originalname,
          cid,
          hash,
          contentType: mimetype,
          createdAt: new Date(),
          pinned: true,
        };

        await filesCol.insertOne(metadata);
        res.json({ success: true, cid });
      } catch (pinErr) {
        console.error('Pinning error:', pinErr);
        res.status(500).send('Pinning failed');
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).send('Upload failed');
  }
});

app.get('/files/:key', async (req, res) => {
  const file = await filesCol.findOne({ key: req.params.key });
  if (!file) return res.status(404).send('File not found');
  res.redirect(`https://ipfs.io/ipfs/${file.cid}`);
});

app.get('/list', async (req, res) => {
  const files = await filesCol
    .find({}, { projection: { _id: 0, key: 1, cid: 1, createdAt: 1 } })
    .sort({ createdAt: -1 })
    .toArray();
  res.json(files);
});

app.post('/pin/:cid', async (req, res) => {
  const { cid } = req.params;
  try {
    await pinToLocalIPFS(cid);
    await filesCol.updateOne({ cid }, { $set: { pinned: true } });
    res.json({ success: true, message: `Pinned ${cid}` });
  } catch (err) {
    console.error(err);
    res.status(500).send('Manual pin failed');
  }
});

cron.schedule('*/5 * * * * *', async () => {
  console.log('Running cronjob: checking unpinned files...');
  try {
    const unpinnedFiles = await filesCol.find({ pinned: false }).toArray();
    for (const file of unpinnedFiles) {
      try {
        await pinToLocalIPFS(file.cid);
        await filesCol.updateOne({ _id: file._id }, { $set: { pinned: true } });
        console.log(`Pinned: ${file.cid}`);
      } catch (e) {
        console.warn(`Failed to pin ${file.cid}`, e);
      }
    }
  } catch (e) {
    console.error('Cronjob error:', e);
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

