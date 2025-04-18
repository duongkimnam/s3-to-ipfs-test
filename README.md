# S3-to-IPFS Gateway (Local IPFS Node Version)

![Architecture Diagram](https://github.com/user-attachments/assets/a3e4e653-927d-4517-98d0-69ea666daeea)

This project is a simple gateway that allows uploading files using an S3-like POST API and automatically stores those files on the IPFS network using a locally running IPFS node. It also supports manual pinning and periodic background pinning of unpinned files.

## ✨ Features

- Upload files via a `POST /upload` API
- Files are saved to local IPFS and pinned using `ipfs pin add`
- MongoDB is used to track file metadata (name, CID, MIME type, hash, createdAt, pin status)
- `GET /files/:key` lets you access files by name (redirects to public IPFS gateway)
- `GET /list` returns all uploaded files
- Manual pinning supported via `POST /pin/:cid`
- Background cron job runs every 5 minutes to pin any unpinned files

## 🛠 Tech Stack

- Node.js + Express
- MongoDB Atlas
- Local IPFS daemon (`ipfs daemon`)
- Cron job using `node-cron`
- File handling with `multer` and in-memory buffer
- Deduplication via SHA-256 hashing

## 🚀 How to Run

### 1. Install dependencies

```bash
npm install
```

### 2. Make sure IPFS is running locally
```bash
ipfs daemon
```

### 3. Setup your .env file
```
PORT=3000
MONGO_URI=mongodb+srv://...
```
### 4. Start the server
```
npm run dev2
```

## API Endpoints
### POST /upload
- Upload a file using `form-data` with key `file`
- Auto-pins to IPFS if not dupicate

### GET files/:key
- Redirects to IPFS public gateway URL for the file with the given name

### GET /list
- Returns metadata for all uploaded files

### POST /pin/:cid
- Manuanally pin a CID using the local IPFS node (if you like :v)

## Cron Job
- Every 5 minutes, the system checks MongoDB for any files not yet pinned and pins them using `ipfs pin add`

## Thought Process & Approach

### 1. Initial POC `server.js`
I began with a basic Express server that could map a file key to its corresponding IPFS CID using a local JSON file. The idea was to simulate a lightweight static gateway: upload elsewhere, manually update a `mappings.json` file, and then redirect access requests to the IPFS public gateway. This helped quickly validate the core idea of routing files stored in IPFS using simple keys.

### 2. Improvements 
As I started testing this basic setup, I quickly realized its limitations. 
There was no upload capability, no automatic CID tracking, and no database — all mappings were hardcoded in a fragile JSON file. There was also no way to ensure CIDs stayed available on the IPFS node without pinning.

### 3. Expansion `index2.js`
From there, I incrementally built out the system:
- First, I added file upload support with `multer` and used SHA256 hashes for deduplication.
- I replaced the static mapping with MongoDB, which allowed more scalable storage and metadata tracking.
- I added IPFS pinning to ensure files wouldn't be garbage collected.
- A background cron job was introduced to retry pinning in case it failed during upload.
- Manual pinning and listing endpoints were added for admin/debug convenience.

### 4. Future Vision (Production-grade)

To bring this project closer to production, I would:

- Replace IPFS CLI with programmatic API (using `ipfs-http-client` or `js-ipfs`)
- Add authentication (JWT, API keys)
- Store files permanently using IPFS Cluster or hybrid (IPFS + Filecoin)
- Add unit tests and health-check endpoints
- Add object versioning (like S3’s `VersionId`)
- Integrate rate-limiting and logging for ops


