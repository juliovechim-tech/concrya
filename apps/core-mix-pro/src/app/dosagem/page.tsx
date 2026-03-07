/**
 * @file app/dosagem/page.tsx
 * @description Página do Motor de Empacotamento Granulométrico.
 * Componente de interface em OtimizadorEmpacotamento.tsx.
 */

import { OtimizadorEmpacotamento } from "../../components/OtimizadorEmpacotamento";

export const metadata = {
  title: "Motor de Empacotamento — CORE MIX PRO",
};

export default function DosagemPage() {
  return <OtimizadorEmpacotamento />;
}
