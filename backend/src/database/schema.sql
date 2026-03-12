CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'pdf',
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS file_type TEXT NOT NULL DEFAULT 'pdf';

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS mime_type TEXT NOT NULL DEFAULT 'application/pdf';

CREATE TABLE IF NOT EXISTS document_chunks (
  id SERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(768) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id
  ON document_chunks (document_id);

CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
  ON document_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE TABLE IF NOT EXISTS chats (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_chat_id
  ON messages (chat_id, created_at);
