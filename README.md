# AskDocs AI

AskDocs AI is a full-stack, local-first AI documentation chatbot. Users upload PDF documents, the backend extracts and chunks the text, generates embeddings through Ollama, stores vectors in PostgreSQL with `pgvector`, and answers questions through a grounded RAG workflow.

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

### Database
- PostgreSQL
- pgvector

### AI
- Ollama local API
- `llama3` for chat
- `nomic-embed-text` for embeddings

## Folder Structure

```text
.
├── backend
│   ├── package.json
│   └── src
│       ├── app.js
│       ├── server.js
│       ├── config
│       ├── controllers
│       ├── database
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

## Backend Setup

1. Install backend dependencies:

```bash
npm install --prefix backend
```

2. Create the backend environment file:

```bash
cp backend/.env.example backend/.env
```

3. Update `backend/.env` if your PostgreSQL or Ollama setup differs.

Environment variables:

```env
PORT=3000
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=docu_chat_ai
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_CHAT_MODEL=llama3
OLLAMA_EMBED_MODEL=nomic-embed-text
OLLAMA_EMBED_DIMENSION=768
RAG_TOP_K=5
RAG_MIN_SIMILARITY=0.35
CHUNK_SIZE=1200
CHUNK_OVERLAP=200
```

4. Start the backend:

```bash
cd backend
npm run dev
```

The API will run at `http://localhost:3000`.

## Frontend Setup

1. Install frontend dependencies:

```bash
npm install --prefix frontend
```

2. Start the Angular app:

```bash
cd frontend
npm start
```

The UI will run at `http://localhost:4200`.

By default, the frontend calls the backend at `http://localhost:3000/api`. If needed, update [environment.ts](/Users/rohansolse/Documents/askdocs-ai/frontend/src/environments/environment.ts).

## PostgreSQL Setup

1. Create the database:

```bash
createdb -U postgres docu_chat_ai
```

2. Connect to PostgreSQL and enable `pgvector`:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

3. Run the schema script:

```bash
psql -U postgres -d docu_chat_ai -f backend/src/database/schema.sql
```

The schema creates:

- `documents`
- `document_chunks`
- `chats`
- `messages`

The embeddings column is defined as `vector(768)` to match `nomic-embed-text`. If you switch to a model with a different embedding size, update both [schema.sql](/Users/rohansolse/Documents/askdocs-ai/backend/src/database/schema.sql) and `OLLAMA_EMBED_DIMENSION` in `backend/.env`.

## pgvector Enable Command

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

## Ollama Setup

1. Install Ollama locally.
2. Start the Ollama service:

```bash
ollama serve
```

3. Pull the required models:

```bash
ollama pull llama3
ollama pull nomic-embed-text
```

4. Confirm Ollama is reachable at `http://localhost:11434`.

## API Overview

### `POST /api/documents/upload`
- Accepts a PDF file upload using the `file` field.
- Extracts text.
- Splits text into chunks.
- Generates embeddings with Ollama.
- Stores metadata and vectors in PostgreSQL.

### `GET /api/documents`
- Returns the uploaded documents list.

### `POST /api/chat/ask`
- Accepts:

```json
{
  "question": "What does the uploaded document say about the setup?",
  "chatId": 1
}
```

- Generates a question embedding.
- Retrieves the most similar chunks from PostgreSQL.
- Builds a grounded prompt from retrieved chunks only.
- Calls the Ollama chat model.
- Saves user and assistant messages to chat history.

### `GET /api/chat/history`
- Returns saved chats with messages.

## How To Run Everything

Open three terminals.

### Terminal 1: Ollama

```bash
ollama serve
```

### Terminal 2: Backend

```bash
cd backend
npm install
npm run dev
```

### Terminal 3: Frontend

```bash
cd frontend
npm install
npm start
```

## How To Test PDF Upload

1. Open `http://localhost:4200`.
2. Go to the `Documents` page.
3. Choose a PDF file.
4. Click `Upload`.
5. Verify the uploaded document appears in the list.

You can also test the upload endpoint directly:

```bash
curl -X POST http://localhost:3000/api/documents/upload \
  -F "file=@/absolute/path/to/your-document.pdf"
```

## How To Test Chat Flow

1. Upload one or more PDFs first.
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
  -d '{"question":"Summarize the uploaded setup steps."}'
```

## Notes For Future Improvements

- Add document citations in responses.
- Add authentication and multi-user document isolation.
- Add streaming chat responses.
- Add document deletion and re-indexing.
- Add better relevance scoring and chunk metadata.

## Manual Steps Required

- Install PostgreSQL locally.
- Install the `pgvector` extension for your PostgreSQL instance.
- Create the `docu_chat_ai` database.
- Run [schema.sql](/Users/rohansolse/Documents/askdocs-ai/backend/src/database/schema.sql).
- Install Ollama locally and pull the required models.
- Copy `backend/.env.example` to `backend/.env`.
- Install dependencies in both `backend` and `frontend`.

