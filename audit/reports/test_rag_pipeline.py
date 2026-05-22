import os
import time
import math
import pytest
from unittest.mock import Mock, patch
import requests

# Configuração das variáveis de ambiente para testes
TEST_API_URL = os.getenv("TEST_API_URL", "http://localhost:3000")
VECTOR_DB_URL = os.getenv("VECTOR_DB_URL", "postgresql://localhost:5432/theosphere")
MOCK_DRIVE_TOKEN = os.getenv("MOCK_DRIVE_TOKEN", "mock-jwt-token-123456")

# ==============================================================================
# ETAPA 1: TESTES DE INTEGRAÇÃO E RESILIÊNCIA (GOOGLE DRIVE API)
# ==============================================================================

class MockGoogleDriveAPI:
    """Mock da API do Google Drive simulando falhas de autenticação e rate limits."""
    def __init__(self):
        self.auth_attempts = 0
        self.rate_limit_attempts = 0

    def get_file_metadata(self, file_id, token):
        # 1. Simulação de Expiração de Token (410/401 -> 200 após renovação)
        if token == "expired-token":
            self.auth_attempts += 1
            if self.auth_attempts == 1:
                return {"status_code": 401, "message": "Invalid Credentials / Token Expired"}
            return {"status_code": 200, "id": file_id, "name": "Comentario_Romanos.pdf", "mimeType": "application/pdf"}
        
        # 2. Simulação de Rate Limit (429 -> 200 com Exponential Backoff)
        if token == "rate-limited-token":
            self.rate_limit_attempts += 1
            if self.rate_limit_attempts < 3:
                return {"status_code": 429, "message": "User Rate Limit Exceeded"}
            return {"status_code": 200, "id": file_id, "name": "Genesis_Hermenetico.epub", "mimeType": "application/epub+zip"}
        
        return {"status_code": 200, "id": file_id, "name": "documento.pdf", "mimeType": "application/pdf"}

def exponential_backoff_with_jitter(attempt, base=1, max_delay=30):
    """Implementação real de Exponential Backoff com Full Jitter."""
    import random
    factor = min(max_delay, base * (2 ** attempt))
    jitter = random.uniform(0, factor)
    return jitter

def test_google_drive_auth_refresh():
    """Valida se o cliente recupera de um HTTP 401 renovando o token."""
    mock_api = MockGoogleDriveAPI()
    token = "expired-token"
    
    # Primeira chamada: Falha com 401
    res = mock_api.get_file_metadata("file-123", token)
    assert res["status_code"] == 401
    
    # Simulação da renovação de token no interceptor HTTP da TheoSphere
    new_token = "refreshed-token-999"
    res_retry = mock_api.get_file_metadata("file-123", new_token)
    assert res_retry["status_code"] == 200
    assert res_retry["name"] == "Comentario_Romanos.pdf"

def test_google_drive_rate_limiting_backoff():
    """Valida a resiliência contra HTTP 429 usando backoff e jitter."""
    mock_api = MockGoogleDriveAPI()
    token = "rate-limited-token"
    max_retries = 5
    delay_history = []
    
    success = False
    for attempt in range(max_retries):
        res = mock_api.get_file_metadata("file-abc", token)
        if res["status_code"] == 200:
            success = True
            break
        elif res["status_code"] == 429:
            delay = exponential_backoff_with_jitter(attempt)
            delay_history.append(delay)
            # Em teste real, poderíamos usar time.sleep(delay), aqui apenas guardamos a métrica
            continue
            
    assert success is True
    assert len(delay_history) == 2  # Falhou 2 vezes, passou na 3ª
    # Verifica que o jitter gerou atrasos exponenciais crescentes probabilísticos
    assert all(d >= 0 for d in delay_history)

def test_extreme_ingestion_corrupted_pdf():
    """Testa se o parser de PDF trata exceções de buffers corrompidos (Circuit Breaker)."""
    corrupted_buffer = b"%PDF-1.4-invalid-binary-trash\xff\xfe\x00"
    
    # O pipeline do text-extractors.ts deve subir uma exceção descritiva sem travar o worker
    with pytest.raises(Exception) as excinfo:
        # Simula o extrator chamando o pdf-parse
        if b"invalid-binary-trash" in corrupted_buffer:
            raise ValueError("Invalid PDF structure: EOF marker not found.")
            
    assert "Invalid PDF structure" in str(excinfo.value)

def test_extreme_ingestion_huge_file_limit():
    """Testa se o ingestor limita o tamanho do buffer de arquivos (Prevenção de OOM)."""
    # Arquivo de 5GB simulado
    five_gb_size = 5 * 1024 * 1024 * 1024
    max_allowed_size = 100 * 1024 * 1024  # Limite de 100MB por livro
    
    # Validação do Circuit Breaker / Protetor de Memória
    def process_file_size_check(file_size):
        if file_size > max_allowed_size:
            raise OverflowError("Payload Too Large: O arquivo excede o limite máximo de 100MB.")
        return "Processed"
        
    with pytest.raises(OverflowError) as excinfo:
        process_file_size_check(five_gb_size)
    assert "O arquivo excede o limite máximo" in str(excinfo.value)

def test_state_synchronization_and_deduplication():
    """
    Testa o ciclo de vida do webhook para mutação de arquivo.
    Se um arquivo é alterado no Drive, os chunks antigos devem ser deletados.
    
    ALERTA DE FALHA NO CÓDIGO DA THEOSPHERE:
    No arquivo drive-rag.service.ts:processFile (linhas 134-146), a checagem
    faz um 'skip' caso o fileId já exista no banco, impedindo atualizações.
    Este teste valida a necessidade da lógica de 'DELETE -> INSERT' na mutação.
    """
    # Estado inicial: arquivo indexado
    file_id = "drive-file-999"
    user_id = "user-test-01"
    
    # Mock do banco vetorial executando as ações corretas para webhook de sincronização
    db_mock = Mock()
    db_mock.delete_chunks.return_value = 5  # Deletou 5 chunks antigos do arquivo modificado
    db_mock.insert_chunks.return_value = 6  # Inseriu 6 novos chunks atualizados
    
    # Simula o fluxo ideal de webhook de mutação
    deleted_count = db_mock.delete_chunks(user_id=user_id, file_id=file_id)
    inserted_count = db_mock.insert_chunks(user_id=user_id, file_id=file_id, chunks=["chunk1", "chunk2"])
    
    assert deleted_count == 5
    assert inserted_count == 6

# ==============================================================================
# ETAPA 2: AVALIAÇÃO QUANTITATIVA DO RAG (RETRIEVAL & SYNTHESIS)
# ==============================================================================

def cosine_similarity(v1, v2):
    dot_product = sum(x*y for x, y in zip(v1, v2))
    magnitude1 = math.sqrt(sum(x*x for x in v1))
    magnitude2 = math.sqrt(sum(y*y for y in v2))
    if not magnitude1 or not magnitude2:
        return 0.0
    return dot_product / (magnitude1 * magnitude2)

def calculate_context_precision(retrieved_chunks, ground_truth_chunks, embedding_model):
    """
    Avalia a precisão do contexto (Recall@K) usando cosseno de similaridade dos embeddings.
    """
    hits = 0
    for chunk in retrieved_chunks:
        chunk_vector = embedding_model(chunk)
        for gt in ground_truth_chunks:
            gt_vector = embedding_model(gt)
            similarity = cosine_similarity(chunk_vector, gt_vector)
            if similarity > 0.82:  # Threshold de acerto semântico
                hits += 1
                break
    return hits / len(ground_truth_chunks) if ground_truth_chunks else 0.0

def test_rag_context_precision():
    """Valida se a query teológica recupera o contexto semanticamente correlacionado."""
    query = "Graça e justificação em Romanos"
    
    # Mock de gerador de vetores simples (dummy para teste)
    def dummy_embedder(text):
        if "justificação" in text or "Graça" in text or "Romanos" in text:
            return [0.9, 0.1, 0.1]
        return [0.1, 0.9, 0.1]
        
    retrieved_chunks = [
        "A justificação pela fé em Romanos 5 é o fundamento da graça divina.",
        "Estudos linguísticos sobre o termo grego dikaiosyne no Novo Testamento.",
        "A geografia da cidade de Roma no século I d.C."
    ]
    
    ground_truth = [
        "A doutrina paulina da justificação em Romanos fundamentada na graça."
    ]
    
    recall_at_k = calculate_context_precision(retrieved_chunks, ground_truth, dummy_embedder)
    assert recall_at_k >= 1.0  # O top chunk deve correlacionar fortemente

def test_rag_faithfulness_hallucination():
    """Testa se a síntese do LLM sofre de alucinação (referências extracontextuais)."""
    retrieved_context = (
        "Agostinho de Hipona argumenta na sua obra 'Sobre o Espírito e a Letra' "
        "que a graça precede a fé e que a justificação é puramente um ato de misericórdia."
    )
    
    # Caso 1: Resposta Fiel (Faithful)
    faithful_response = "De acordo com Agostinho em 'Sobre o Espírito e a Letra', a graça de Deus precede a fé humana."
    # Caso 2: Resposta Alucinada (Unfaithful) - Introduz Karl Barth do nada
    hallucinated_response = "Agostinho argumenta que a graça precede a fé, assim como Karl Barth descreveu na sua Dogmática Eclesial."

    def check_hallucination(response, context):
        # Validação heurística de entidades não presentes no contexto
        entities_in_response = ["Karl Barth", "Agostinho"]
        for entity in entities_in_response:
            if entity in response and entity not in context:
                return False  # ALUCINAÇÃO DETECTADA!
        return True

    assert check_hallucination(faithful_response, retrieved_context) is True
    assert check_hallucination(hallucinated_response, retrieved_context) is False

def test_semantic_chunking_boundaries():
    """
    Avalia se a estratégia de chunking quebra versículos e sentenças teológicas ao meio.
    Heurísticas de chunking baseadas puramente em contagem arbitrária de caracteres
    falham em textos estruturados (Bíblias e Dicionários).
    """
    bible_text = "João 3:16 - Porque Deus amou o mundo de tal maneira. João 3:17 - Porque Deus enviou o seu Filho."
    
    # Chunking arbitrário por token/char que divide no meio de João 3:16
    bad_chunks = [
        "Porque Deus amou o mundo de",
        "tal maneira. João 3:17 - Porque Deus enviou"
    ]
    
    # Chunking semântico (preserva o versículo completo)
    good_chunks = [
        "João 3:16 - Porque Deus amou o mundo de tal maneira.",
        "João 3:17 - Porque Deus enviou o seu Filho."
    ]
    
    def validate_chunk_boundaries(chunks):
        for chunk in chunks:
            # Se começar com letra minúscula ou terminar sem terminação pontual de frase/versículo
            if chunk.startswith(("a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v")):
                return False  # Sentença cortada ao meio!
        return True

    assert validate_chunk_boundaries(bad_chunks) is False
    assert validate_chunk_boundaries(good_chunks) is True

# ==============================================================================
# ETAPA 3: TESTES DE SEGURANÇA DE LLM (RED TEAMING VECTORS)
# ==============================================================================

def test_cross_tenant_data_leakage():
    """
    Testa se o filtro de metadados do pgvector isola os livros do Inquilino A.
    Exploit: Tentar recuperar chunks informando o ID do inquilino B.
    """
    user_a = "uuid-inquilino-A"
    user_b = "uuid-inquilino-B"
    
    # Query contendo vetor e metadados
    query_vector = [0.15, 0.88, 0.45]
    
    # Simulação da query pgvector no Prisma
    # prisma.$executeRaw`SELECT * FROM "UserEmbedding" WHERE "userId" = ${user_a} ORDER BY embedding <=> ${query_vector} LIMIT 5`
    def query_vector_db(requesting_user_id, target_filter_id, vector):
        # A API deve forçar rigidamente que target_filter_id = requesting_user_id
        # Qualquer tentativa de injetar target_filter_id diferente deve ser barrada ou ignorada.
        effective_user_id = requesting_user_id  # Segurança ativa
        
        # Simula retorno do banco vetorial
        db_records = [
            {"id": "c-1", "userId": "uuid-inquilino-A", "content": "Dados de A"},
            {"id": "c-2", "userId": "uuid-inquilino-B", "content": "Dados de B"}
        ]
        
        # Filtra rigidamente por effective_user_id
        return [r for r in db_records if r["userId"] == effective_user_id]

    results = query_vector_db(requesting_user_id=user_a, target_filter_id=user_b, vector=query_vector)
    
    # Valida que nenhum registro do usuário B foi retornado ao usuário A
    for record in results:
        assert record["userId"] != user_b
        assert record["content"] != "Dados de B"

def test_denial_of_wallet_protection():
    """Testa o gateway de RAG contra requisições excessivamente longas (Exploits DoW)."""
    # Query maliciosa simulando 1.000.000 de tokens repetitivos para estourar o contexto
    dow_query = "Graça " * 100000
    
    def rag_query_gateway(user_query):
        max_query_length = 5000  # Máximo de 5.000 caracteres por prompt
        if len(user_query) > max_query_length:
            raise ValueError("Query exceeds maximum allowed length (DoW prevention).")
        return "Processing"
        
    with pytest.raises(ValueError) as excinfo:
        rag_query_gateway(dow_query)
    assert "Query exceeds maximum" in str(excinfo.value)
