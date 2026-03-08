# MIGRATION NOTE — core-mix-pro

## Status: ARQUIVADO (pendente migração)

Os engines locais em `src/lib/` (~600 KB, 20 arquivos) contêm lógica científica
que será gradualmente substituída pelos packages compartilhados do monorepo:

| Engine local (`src/lib/`)     | Package destino (`packages/`)       |
|-------------------------------|-------------------------------------|
| abrams.ts, dosagem.ts         | @concrya/engine                     |
| empacotamento.ts              | @concrya/engine (CPM/Fuller/Faury)  |
| granulometria.ts              | @concrya/engine                     |
| thermocore.ts                 | @concrya/nexus                      |
| rheocore.ts                   | @concrya/nivelix                    |
| lifeengine.ts                 | @concrya/ecorisk                    |
| hydra4d.ts, microengine.ts    | @concrya/aion (futuro QUANTUM)      |
| laboratorio.ts, comparativo.ts| @concrya/engine                     |

## Prazo estimado: Q3 2026

## Regras
- **NÃO apagar** este app até que todos os engines estejam migrados e testados
- **NÃO adicionar** features novas aqui — desenvolver em `packages/`
- Quando migrar um engine, manter o arquivo local como referência até validação
