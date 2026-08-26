
create or replace function match_document_chunks (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id integer,
  document_name text,
  content text,
  similarity float
)
language sql stable
as $$
  select
    ia_nery.id,
    ia_nery.title as document_name,
    ia_nery.content,
    1 - (ia_nery.embedding <=> query_embedding) as similarity
  from ia_nery
  where 1 - (ia_nery.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;
