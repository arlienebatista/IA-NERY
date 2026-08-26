
INSERT INTO public.documents (content, metadata, embedding)
VALUES (
  'A hidratação é fundamental para a saúde. Recomenda-se beber pelo menos 2 litros de água por dia para manter o corpo funcionando corretamente, auxiliar na digestão e prevenir dores de cabeça.',
  '{"source": "exemplo_manual"}',
  CAST('[' || repeat('0.0,', 767) || '0.0]' AS vector)
);
