#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Registra o job semanal de relatório AION no Windows Task Scheduler.

.DESCRIPTION
    Cria (ou atualiza) a tarefa "AION - Relatorio Semanal" que executa
    toda segunda-feira às 07:00 usando o launcher run_weekly_report.bat.

.PARAMETER ProjectRoot
    Caminho raiz do projeto. Default: C:\dev\aion

.PARAMETER PlantId
    Identificador da planta (AION_PLANT_ID). Default: PLANTA-01

.PARAMETER Hour
    Hora de disparo (0-23). Default: 7

.PARAMETER Minute
    Minuto de disparo (0-59). Default: 0

.EXAMPLE
    # Executar com privilégios de administrador:
    PowerShell -ExecutionPolicy Bypass -File "C:\dev\aion\jobs\setup_task_scheduler.ps1"

    # Customizar:
    PowerShell -ExecutionPolicy Bypass -File "C:\dev\aion\jobs\setup_task_scheduler.ps1" `
        -ProjectRoot "D:\projetos\aion" -PlantId "PLANTA-02" -Hour 6
#>

param(
    [string] $ProjectRoot = "C:\dev\aion",
    [string] $PlantId     = "PLANTA-01",
    [int]    $Hour        = 7,
    [int]    $Minute      = 0
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ── Configurações ─────────────────────────────────────────────────────────────
$TaskName    = "AION - Relatorio Semanal"
$TaskDesc    = "CONCRYA AION CORE 1.0 — Gera o relatório semanal de resistência do concreto toda segunda-feira."
$BatFile     = Join-Path $ProjectRoot "jobs\run_weekly_report.bat"
$LogDir      = Join-Path $ProjectRoot "logs"

# ── Pré-verificações ──────────────────────────────────────────────────────────
if (-not (Test-Path $ProjectRoot)) {
    Write-Error "Diretório do projeto não encontrado: $ProjectRoot"
    exit 1
}
if (-not (Test-Path $BatFile)) {
    Write-Error "Launcher não encontrado: $BatFile`nExecute este script a partir da raiz do projeto."
    exit 1
}

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

# ── Variável de ambiente AION_PLANT_ID ───────────────────────────────────────
[System.Environment]::SetEnvironmentVariable(
    "AION_PLANT_ID", $PlantId, [System.EnvironmentVariableTarget]::Machine
)
Write-Host "AION_PLANT_ID=$PlantId definida (escopo Machine)."

# ── Montar a tarefa ───────────────────────────────────────────────────────────
$trigger = New-ScheduledTaskTrigger `
    -Weekly `
    -DaysOfWeek Monday `
    -At ([datetime]::Today.AddHours($Hour).AddMinutes($Minute))

$action = New-ScheduledTaskAction `
    -Execute "cmd.exe" `
    -Argument "/c `"$BatFile`"" `
    -WorkingDirectory $ProjectRoot

$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Hours 1) `
    -StartWhenAvailable `          # dispara mesmo se o PC estava desligado no horário
    -RunOnlyIfNetworkAvailable:$false `
    -MultipleInstances IgnoreNew

$principal = New-ScheduledTaskPrincipal `
    -UserId "SYSTEM" `
    -LogonType ServiceAccount `
    -RunLevel Highest

# ── Registrar (ou sobrescrever) ───────────────────────────────────────────────
$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Tarefa existente removida."
}

Register-ScheduledTask `
    -TaskName  $TaskName `
    -Description $TaskDesc `
    -Trigger   $trigger `
    -Action    $action `
    -Settings  $settings `
    -Principal $principal | Out-Null

Write-Host ""
Write-Host "======================================================"
Write-Host " Tarefa agendada com sucesso!"
Write-Host "======================================================"
Write-Host " Nome    : $TaskName"
Write-Host " Disparo : Toda segunda-feira às $($Hour.ToString('D2')):$($Minute.ToString('D2'))"
Write-Host " Planta  : $PlantId"
Write-Host " Launcher: $BatFile"
Write-Host " Logs    : $LogDir\weekly_report_job.log"
Write-Host "======================================================"
Write-Host ""
Write-Host "Para testar agora:"
Write-Host "  Start-ScheduledTask -TaskName '$TaskName'"
Write-Host ""
Write-Host "Para ver o status:"
Write-Host "  Get-ScheduledTaskInfo -TaskName '$TaskName'"
