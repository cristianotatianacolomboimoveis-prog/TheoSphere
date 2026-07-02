#!/usr/bin/env python3
import os
import sys
import argparse
import asyncio
import subprocess
import logging
from datetime import datetime
from google.antigravity import Agent, LocalAgentConfig, CapabilitiesConfig
from google.antigravity.triggers import every, TriggerContext
from google.antigravity.hooks import policy
from dotenv import load_dotenv

# Configuração do Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)

WORKSPACE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(WORKSPACE_ROOT, "backend")
FRONTEND_DIR = os.path.join(WORKSPACE_ROOT, "frontend-v2")
REPORTS_DIR = os.path.join(WORKSPACE_ROOT, "audit", "reports", "daily")

# Carrega variáveis de ambiente do arquivo .env do backend
backend_env_path = os.path.join(BACKEND_DIR, ".env")
if os.path.exists(backend_env_path):
    load_dotenv(backend_env_path)
else:
    load_dotenv()

# Garante que o diretório de relatórios diários exista
os.makedirs(REPORTS_DIR, exist_ok=True)

class TestResult:
    def __init__(self, component, command, success, stdout, stderr):
        self.component = component
        self.command = command
        self.success = success
        self.stdout = stdout
        self.stderr = stderr

def run_command(cwd, cmd_list):
    """Executa um comando e captura saída e status."""
    logging.info(f"Executando '{' '.join(cmd_list)}' em {cwd}")
    try:
        res = subprocess.run(
            cmd_list,
            cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=300 # 5 minutos limite por passo
        )
        return res.returncode == 0, res.stdout, res.stderr
    except subprocess.TimeoutExpired as e:
        return False, e.stdout or "", f"Timeout expirado: {str(e)}"
    except Exception as e:
        return False, "", str(e)

def execute_verification_suite():
    """Roda toda a suíte de testes/lint/build no backend e frontend."""
    results = []

    # 1. Backend Linting
    ok, out, err = run_command(BACKEND_DIR, ["npm", "run", "lint"])
    results.append(TestResult("Backend", "npm run lint", ok, out, err))

    # 2. Backend Unit/Integration Tests
    ok, out, err = run_command(BACKEND_DIR, ["npm", "run", "test"])
    results.append(TestResult("Backend", "npm run test", ok, out, err))

    # 3. Backend Build
    ok, out, err = run_command(BACKEND_DIR, ["npm", "run", "build"])
    results.append(TestResult("Backend", "npm run build", ok, out, err))

    # 4. Frontend Linting
    ok, out, err = run_command(FRONTEND_DIR, ["npm", "run", "lint"])
    results.append(TestResult("Frontend", "npm run lint", ok, out, err))

    # 5. Frontend Tests
    ok, out, err = run_command(FRONTEND_DIR, ["npm", "run", "test"])
    results.append(TestResult("Frontend", "npm run test", ok, out, err))

    # 6. Frontend Build
    ok, out, err = run_command(FRONTEND_DIR, ["npm", "run", "build"])
    results.append(TestResult("Frontend", "npm run build", ok, out, err))

    return results

async def analyze_results_and_write_report(results):
    """Inicializa o agente Antigravity para analisar resultados e escrever relatório."""
    has_errors = any(not r.success for r in results)
    
    # Formata os logs para enviar ao modelo
    summary_data = []
    log_content = ""
    for r in results:
        status = "PASSED" if r.success else "FAILED"
        summary_data.append(f"- {r.component} [{r.command}]: {status}")
        if not r.success:
            log_content += f"\n=== {r.component} [{r.command}] - ERROS ===\n"
            log_content += f"STDOUT:\n{r.stdout[-1500:]}\n"
            log_content += f"STDERR:\n{r.stderr[-1500:]}\n"
            log_content += "========================================\n"

    summary_str = "\n".join(summary_data)
    
    prompt = f"""
Você é o Agente de Verificação Diária do TheoSphere.
Aqui está o resumo da execução dos testes e verificações do projeto hoje:

{summary_str}

{f"Os seguintes logs de erro foram capturados:{log_content}" if has_errors else "Todos os testes e builds passaram com sucesso!"}

Caso haja erros identificados nos passos acima:
1. Analise o erro.
2. Utilize as suas ferramentas (como `edit_file` para modificar o código e `run_command` para rodar novamente o teste/build que falhou) para corrigir as falhas identificadas de forma totalmente autônoma.
3. Teste o projeto novamente para certificar-se de que a sua correção de fato resolveu o problema.
4. Após aplicar as correções e verificar o resultado, escreva um relatório final completo.

Por favor, gere um relatório detalhado no formato markdown (GitHub-flavored Markdown). O relatório deve conter:
1. Status Geral (🟢 para sucesso total ou após correção bem-sucedida, 🟡 para alertas menores, 🔴 para falhas persistentes que não puderam ser corrigidas).
2. Tabela resumo das verificações executadas, indicando se falharam e se foram corrigidas.
3. Detalhes das correções efetuadas (arquivos alterados, diffs e justificativas).
4. Resultados dos testes de verificação pós-correção.

Não adicione textos explicativos no início ou fim fora do formato markdown do relatório. Responda apenas com o conteúdo do relatório markdown.
"""

    logging.info("Iniciando o agente Antigravity para analisar resultados e aplicar correções...")
    
    config = LocalAgentConfig(
        system_instructions="Você é um Engenheiro de Software Sênior especializado em depuração e correção autônoma de erros em NestJS, Next.js, Prisma e TypeScript. Você tem permissão para editar arquivos no projeto e rodar comandos de teste para validar se suas correções funcionaram.",
        capabilities=CapabilitiesConfig(),
        policies=[policy.allow_all()]
    )
    
    async with Agent(config=config) as agent:
        response = await agent.chat(prompt)
        report_text = await response.text()
    
    # Grava o relatório em arquivo
    today_str = datetime.now().strftime("%Y-%m-%d")
    report_file_path = os.path.join(REPORTS_DIR, f"{today_str}_daily_report.md")
    
    with open(report_file_path, "w", encoding="utf-8") as f:
        f.write(report_text)
        
    logging.info(f"Relatório gerado com sucesso em: {report_file_path}")
    return report_file_path

async def run_once():
    """Roda a suíte e gera o relatório uma única vez."""
    logging.info("Iniciando verificação única...")
    results = execute_verification_suite()
    report_path = await analyze_results_and_write_report(results)
    print(f"Sucesso! Relatório salvo em: {report_path}")

async def run_daemon():
    """Roda o agente como um daemon com trigger periódico usando o helper do SDK."""
    logging.info("Iniciando o agente de teste em modo Daemon...")
    
    async def periodic_job(ctx: TriggerContext):
        logging.info("Trigger diário acionado!")
        results = execute_verification_suite()
        report_path = await analyze_results_and_write_report(results)
        await ctx.send(f"Execução diária concluída. Relatório escrito em: {report_path}")

    # Roda a cada 86400 segundos (24 horas)
    daily_trigger = every(86400, periodic_job)
    
    config = LocalAgentConfig(
        system_instructions="Você é o orquestrador do Agente de Testes do TheoSphere.",
        triggers=[daily_trigger]
    )
    
    async with Agent(config=config) as agent:
        logging.info("Daemon rodando. Pressione Ctrl+C para encerrar.")
        # Mantém rodando infinitamente
        while True:
            await asyncio.sleep(3600)

def main():
    parser = argparse.ArgumentParser(description="Agente Autônomo de Verificação Diária")
    parser.add_argument("--once", action="store_true", help="Executa apenas uma vez e encerra.")
    parser.add_argument("--daemon", action="store_true", help="Executa continuamente usando triggers do SDK.")
    
    args = parser.parse_args()
    
    # Se nenhum argumento for passado, o padrão é rodar uma vez.
    if not args.once and not args.daemon:
        args.once = True
        
    if args.once:
        asyncio.run(run_once())
    elif args.daemon:
        try:
            asyncio.run(run_daemon())
        except KeyboardInterrupt:
            logging.info("Processo finalizado pelo usuário.")

if __name__ == "__main__":
    main()
