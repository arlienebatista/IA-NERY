
-- Habilita a extensão pgvector para trabalhar com embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Cria a tabela para armazenar os trechos de documentos e seus embeddings
CREATE TABLE documents (
  id bigserial PRIMARY KEY,
  content text NOT NULL,
  metadata jsonb,
  embedding vector(768)
);

-- Cria uma função para buscar documentos similares a uma pergunta
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
#variable_conflict use_variable
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY documents.embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$$;
