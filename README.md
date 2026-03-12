# AskDocs AI

AskDocs AI is a full-stack, local-first AI documentation chatbot. Users upload supported documents, the backend extracts and chunks the text, generates embeddings through Ollama, stores vectors in PostgreSQL with `pgvector`, and answers questions through a grounded RAG workflow.

The assistant is configured to answer only from uploaded documents. If no relevant context is found, it returns:

`This information is not available in the uploaded documents.`

## Tech Stack

### Frontend
- Angular
- Angular Material
- RxJS

### Backend
- Node.js
- Express
- Multer
- Axios
- pdf-parse
- Mammoth for `.docx`
- Local Tesseract OCR for images

### Database
- PostgreSQL
- pgvector

### AI
- Ollama local API
- `phi3` for local development chat with automatic `mistral` fallback if `phi3` is unavailable
- `nomic-embed-text` for embeddings

## Folder Structure

```text
.
├── package.json
├── backend
│   ├── package.json
│   └── src
│       ├── app.js
│       ├── server.js
│       ├── config
│       ├── controllers
│       ├── database
│       │   ├── bootstrap.sql
│       │   ├── pgadmin-create-database.sql
│       │   └── schema.sql
│       ├── middlewares
│       ├── routes
│       ├── services
│       ├── uploads
│       └── utils
├── frontend
│   ├── angular.json
│   ├── package.json
│   ├── tsconfig.json
│   └── src
│       ├── app
│       │   ├── core/services
│       │   ├── pages/chat
│       │   ├── pages/documents
│       │   └── shared/components/layout
│       ├── environments
│       ├── index.html
│       ├── main.ts
│       └── styles.css
└── README.md
```

## Local Prerequisites

Install these once on your machine:

- Node.js 20+ and npm
- PostgreSQL
- `pgvector` extension for PostgreSQL
- Ollama
- Tesseract OCR for image uploads

Optional but useful:

- pgAdmin for manual database setup

## First-Time Setup

### 1. Install root tooling

Install the root package first so `concurrently` is available:

```bash
npm install
```

### 2. Install frontend and backend dependencies

From the repo root:

```bash
npm run install:all
```

This installs:

- root dev dependency: `concurrently`
- backend dependencies from [backend/package.json](/Users/rohansolse/Documents/askdocs-ai/backend/package.json)
- frontend dependencies from [frontend/package.json](/Users/rohansolse/Documents/askdocs-ai/frontend/package.json)

### 3. Create backend environment file

```bash
cp backend/.env.example backend/.env
```

Default values:

```env
PORT=3000
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=docu_chat_ai
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_CHAT_MODEL=phi3
OLLAMA_EMBED_MODEL=nomic-embed-text
OLLAMA_EMBED_DIMENSION=768
RAG_TOP_K=3
RAG_MIN_SIMILARITY=0.35
CHUNK_SIZE=800
CHUNK_OVERLAP=100
ENABLE_IMAGE_OCR=false
```

## Supported Upload Types

The ingestion pipeline currently supports:

- `.pdf`
- `.docx`
- `.txt`
- `.png`
- `.jpg`
- `.jpeg`

Images are processed locally through Tesseract OCR before chunking and embedding.
OCR can now be left disabled unless you actually need text extraction from direct image uploads.

## PostgreSQL Setup

### Option A: `psql` CLI

```bash
psql -U postgres -d postgres -f backend/src/database/bootstrap.sql
```

This creates the database if needed and applies the schema.

### Option B: pgAdmin

Run this first against your default database, usually `postgres`:

```bash
backend/src/database/pgadmin-create-database.sql
```

That file contains:

```sql
CREATE DATABASE docu_chat_ai;
```

Then connect to `docu_chat_ai` in pgAdmin and run [schema.sql](/Users/rohansolse/Documents/askdocs-ai/backend/src/database/schema.sql).

Important:

- `bootstrap.sql` is for `psql`, not pgAdmin
- pgAdmin does not support `\connect` or `\gexec`
- the backend also auto-runs [schema.sql](/Users/rohansolse/Documents/askdocs-ai/backend/src/database/schema.sql) on startup after it connects, but the database itself must already exist

The schema creates:

- `documents`
- `document_chunks`
- `chats`
- `messages`

The embeddings column is defined as `vector(768)` to match `nomic-embed-text`. If you switch embedding models, update both [schema.sql](/Users/rohansolse/Documents/askdocs-ai/backend/src/database/schema.sql) and `OLLAMA_EMBED_DIMENSION` in `backend/.env`.

## Ollama Setup

### Install Ollama

On macOS:

```bash
brew install --cask ollama
```

Or download it from:

- https://ollama.com/download/mac

### Start Ollama

If you are using the app on macOS, open `Ollama.app` and keep it running.

Or start it from the terminal:

```bash
ollama serve
```

### Pull required models

```bash
ollama pull phi3
ollama pull mistral
ollama pull nomic-embed-text
```

### Verify Ollama is reachable

```bash
curl http://localhost:11434/api/tags
```

### Verify embeddings manually

```bash
curl http://localhost:11434/api/embed \
  -H "Content-Type: application/json" \
  -d '{"model":"nomic-embed-text","input":"hello world"}'
```

If this fails, uploads will also fail.

## Tesseract OCR Setup

Image documents are processed locally with the `tesseract` binary.

On macOS:

```bash
brew install tesseract
```

Verify installation:

```bash
tesseract --version
```

## Running The Project

From the repo root:

```bash
npm run dev
```

This starts:

- backend on `http://localhost:3000`
- frontend on `http://localhost:4200`

Other useful root scripts:

```bash
npm run backend
npm run frontend
```

If you prefer separate terminals:

```bash
npm run backend
npm run frontend
```

By default, the frontend calls the backend at `http://localhost:3000/api`. If needed, update [environment.ts](/Users/rohansolse/Documents/askdocs-ai/frontend/src/environments/environment.ts).

## API Overview

### `POST /api/documents/upload`
- Accepts supported documents using the `files` multipart field.
- Optional multipart field: `enableImageOcr=true` to run OCR for PNG or JPEG uploads.
- Extracts text depending on file type:
  - PDF via `pdf-parse`
  - DOCX via `mammoth`
  - TXT via direct file read
  - image files via local Tesseract OCR when enabled
- Splits text into smaller chunks.
- Generates embeddings with Ollama.
- Stores metadata and vectors in PostgreSQL.
- Logs timing for file parsing, OCR, chunking, embedding generation, and DB insert.

### `GET /api/documents`
- Returns the uploaded documents list.

### `POST /api/chat/ask`
- Accepts:

```json
{
  "question": "What does the uploaded document say about the setup?",
  "chatId": 1,
  "selectedDocumentIds": [1, 2],
  "model": "phi3:latest"
}
```

- Generates a question embedding.
- Retrieves the most similar chunks from PostgreSQL.
- Builds a grounded prompt from retrieved chunks only.
- Calls the Ollama chat model.
- Saves user and assistant messages to chat history.
- Logs timing for vector search and the final LLM response.

### `GET /api/chat/models`
- Returns the installed Ollama chat models for the frontend dropdown.
- Filters out embedding-only models such as `nomic-embed-text`.

### `GET /api/chat/history`
- Returns saved chats with messages.

## How To Run Everything

1. Start PostgreSQL.
2. Start Ollama.
3. Verify the database `docu_chat_ai` exists.
4. Verify the lightweight chat model and embedding model are installed.
5. Run:

```bash
npm run dev
```

## How To Test Document Upload

1. Open `http://localhost:4200`.
2. Go to the `Documents` page.
3. Choose a supported file.
4. Click `Upload`.
5. Verify the uploaded document appears in the list.

You can also test the upload endpoint directly:

```bash
curl -X POST http://localhost:3000/api/documents/upload \
  -F "files=@/absolute/path/to/your-document.pdf"
```

## How To Test Chat Flow

1. Upload one or more supported documents first.
2. Open the `Chat` page.
3. Ask a question that should be answerable from the uploaded documents.
4. Verify the assistant responds with grounded content.
5. Ask a question not covered by the documents.
6. Verify the backend returns:

```text
This information is not available in the uploaded documents.
```

You can also test the chat endpoint directly:

```bash
curl -X POST http://localhost:3000/api/chat/ask \
  -H "Content-Type: application/json" \
  -d '{"question":"Summarize the uploaded setup steps.","selectedDocumentIds":[1]}'
```

## Troubleshooting

### `sh: concurrently: command not found`

You did not install the root package yet.

Run:

```bash
npm install
```

### `database "docu_chat_ai" does not exist`

Create the database first:

```bash
psql -U postgres -d postgres -f backend/src/database/bootstrap.sql
```

Or use pgAdmin with [pgadmin-create-database.sql](/Users/rohansolse/Documents/askdocs-ai/backend/src/database/pgadmin-create-database.sql).

### `relation "documents" does not exist`

The database exists but the schema is missing.

Run:

```bash
psql -U postgres -d docu_chat_ai -f backend/src/database/schema.sql
```

The backend also auto-initializes the schema on startup after a successful DB connection.

### `Failed to connect to localhost port 11434`

Ollama is not running.

Start it:

```bash
ollama serve
```

Or open `Ollama.app` on macOS.

### `model "nomic-embed-text" not found, try pulling it first`

Pull the embedding model:

```bash
ollama pull nomic-embed-text
```

Also install a lightweight chat model:

```bash
ollama pull phi3
ollama pull mistral
```

### `Tesseract OCR is not installed`

Install Tesseract locally:

```bash
brew install tesseract
```

### `CREATE EXTENSION vector` fails

This means the local PostgreSQL server on your machine does not have the `pgvector` extension package installed yet. The project does use `pgvector`; you only need this step if `CREATE EXTENSION vector` fails in your environment. Install `pgvector` for your PostgreSQL version first, then rerun the schema.

## Notes For Future Improvements

- Add document citations in responses.
- Add authentication and multi-user document isolation.
- Add streaming chat responses.
- Add document deletion and re-indexing.
- Add better relevance scoring and chunk metadata.

## Manual Steps Required

- Install PostgreSQL locally.
- Install the `pgvector` extension for your PostgreSQL instance.
- Install Ollama locally.
- Install Tesseract locally if you want image uploads.
- Pull `phi3` or `mistral`, plus `nomic-embed-text`.
- Copy `backend/.env.example` to `backend/.env`.
- Run `npm install`.
- Run `npm run install:all`.
