
-- Drop old objects to prevent conflicts
DROP FUNCTION IF EXISTS public.match_documents(query_embedding vector, match_threshold double precision, match_count integer);
DROP TABLE IF EXISTS public.documents;

-- Recreate tables based on your new schema
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding VECTOR(768),
  chunk_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_document_chunks_document_id ON document_chunks (document_id);
CREATE INDEX idx_document_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create the new search function, improved to include the document name for context
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding VECTOR(768),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  document_name TEXT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    d.name as document_name,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM
    document_chunks dc
  JOIN
    documents d ON dc.document_id = d.id
  WHERE 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
