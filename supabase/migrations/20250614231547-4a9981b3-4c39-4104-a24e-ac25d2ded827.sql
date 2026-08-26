
-- Remove a função de busca de documentos existente para podermos recriá-la
DROP FUNCTION IF EXISTS public.match_documents(vector, double precision, integer);

-- Recria a função de busca de documentos sem a coluna 'metadata'
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id bigint,
  title text,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
#variable_conflict use_variable
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.title,
    documents.content,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY documents.embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$$;
