@echo off
REM ============================================================
REM  CONCRYA AION — Launcher para Windows Task Scheduler
REM
REM  Configurar tarefa agendada via PowerShell:
REM    PowerShell -ExecutionPolicy Bypass -File "C:\dev\aion\jobs\setup_task_scheduler.ps1"
REM
REM  Ou manualmente no Task Scheduler:
REM    Programa/script : C:\dev\aion\jobs\run_weekly_report.bat
REM    Iniciar em      : C:\dev\aion
REM    Disparador      : Toda segunda-feira às 07:00
REM ============================================================

cd /d C:\dev\aion

REM Ativa o ambiente virtual
call venv\Scripts\activate.bat

REM Cria pasta de logs se não existir
if not exist logs mkdir logs

REM Executa o job — saída vai para o log rotativo interno do script Python
python -m jobs.weekly_report_job >> logs\weekly_report_job_bat.log 2>&1

REM Captura o código de saída para o Task Scheduler detectar falhas
exit /b %ERRORLEVEL%
