# src/lib — Motores Físico-Matemáticos CONCRYA AION

Esta pasta contém os motores puros do ENGINE. Cada arquivo é um módulo científico independente.

## Regra absoluta

**Zero dependências externas.** Funções puras TypeScript. Sem React, sem Prisma, sem tRPC aqui.

## Padrão obrigatório (baseado em thermocore.ts)

```typescript
// 1. Bloco de referências bibliográficas ABNT no topo (JSDoc PhD-level)
// 2. Constantes físicas exportadas com unidade no nome
// 3. Interfaces explícitas: EntradaXxx, ResultadoXxx, ParamsXxx
// 4. Helpers internos: _validar(cond, msg), _ar(v, n)
// 5. Defaults calibrados: CALIBRACAO_DEFAULT por tipo de cimento
// 6. Testes: __tests__/nomemodulo.test.ts, cobertura 100%
```

## Módulos presentes

| Arquivo         | Módulo      | Status     | Descrição                                    |
|----------------|-------------|-----------|----------------------------------------------|
| thermocore.ts  | ThermoCore  | ✅ COMPLETO | Maturidade Arrhenius + fck(t) + desforma      |
| hydra4d.ts  | Hydra4D Engine  | ✅ COMPLETO | Calorimetria semi-adiabática + banco cimentos |
| iceengine.ts   | IceEngine   | ✅ COMPLETO | Concreto massa Fourier 1D + gelo/LN2          |
| rheocore.ts    | RheoCore    | ✅ COMPLETO | Reometria Bingham + ADS1115 torque            |
| microengine.ts | MicroEngine | ✅ COMPLETO | Powers gel-space + ITZ + difusão Fick         |
| lifeengine.ts  | LifeEngine  | 🔲 PENDENTE | Tuutti + Monte Carlo + VPL 50 anos            |
| abrams.ts      | Abrams      | ✅ COMPLETO | Lei de Abrams + regressão OLS + CEB-FIP MC90  |
| empacotamento.ts | CPM       | ✅ COMPLETO | CPM de Larrard + L-BFGS                      |
| dosagem.ts     | Dosagem     | ✅ COMPLETO | Método IPT-EPUSP volumes absolutos            |
| granulometria.ts | Granulo   | ✅ COMPLETO | Andreasen · Fuller · AIM · WLS                |

## Import correto (nunca cruzar)

```typescript
import { DADOS_GRANULO_DPCON_DEFAULT } from "./granulometria"; // NÃO de constants
import { PERFIS_LASER_CIMENTICIO }     from "./constants";
```
