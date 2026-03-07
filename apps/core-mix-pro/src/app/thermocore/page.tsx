/**
 * @file app/thermocore/page.tsx
 * @description Painel de monitoramento ThermoCore — Maturidade ao Vivo
 */

import { PainelThermoCore } from "../../components/PainelThermoCore";

export const metadata = {
  title: "ThermoCore — Maturidade ao Vivo | CORE MIX PRO",
};

export default function ThermoCorePage() {
  return <PainelThermoCore />;
}
