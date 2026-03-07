/**
 * @file app/lifeengine/page.tsx
 * @description Painel LifeEngine — Vida Util Probabilistica + VPL
 */

import { PainelLifeEngine } from "../../components/PainelLifeEngine";

export const metadata = {
  title: "LifeEngine — Vida Util + Monte Carlo + VPL | CORE MIX PRO",
};

export default function LifeEnginePage() {
  return <PainelLifeEngine />;
}
