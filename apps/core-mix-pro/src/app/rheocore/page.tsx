/**
 * @file app/rheocore/page.tsx
 * @description Painel de Reometria RheoCore — Bingham + Correlações
 */

import { PainelRheoCore } from "../../components/PainelRheoCore";

export const metadata = {
  title: "RheoCore — Reometria Rotacional | CORE MIX PRO",
};

export default function RheoCorePage() {
  return <PainelRheoCore />;
}
