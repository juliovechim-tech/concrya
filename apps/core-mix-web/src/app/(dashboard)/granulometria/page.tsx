import { Card } from "@/components/ui/Card";

const SIEVES = [19, 12.5, 9.5, 6.3, 4.75, 2.36, 1.18, 0.6, 0.3, 0.15, 0];

export default function GranulometriaPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Granulometria</h1>
          <p className="text-sm text-muted mt-1">
            Ensaios de distribuicao granulometrica dos agregados
          </p>
        </div>
        <button className="bg-accent hover:bg-accent-hover text-black font-medium px-4 py-2 rounded-lg text-sm transition-colors">
          + Novo Ensaio
        </button>
      </div>

      <Card>
        <h2 className="text-sm font-semibold mb-4 uppercase tracking-wider">
          Peneiras Padrao (mm)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border text-muted text-xs">
                <th className="text-left py-2 px-3">Peneira (mm)</th>
                <th className="text-right py-2 px-3">Massa Retida (g)</th>
                <th className="text-right py-2 px-3">% Retida</th>
                <th className="text-right py-2 px-3">% Ret. Acumulada</th>
                <th className="text-right py-2 px-3">% Passante</th>
              </tr>
            </thead>
            <tbody>
              {SIEVES.map((s) => (
                <tr
                  key={s}
                  className="border-b border-card-border/50 hover:bg-card-border/20"
                >
                  <td className="py-2 px-3 font-mono">
                    {s === 0 ? "Fundo" : s}
                  </td>
                  <td className="py-2 px-3 text-right text-muted">--</td>
                  <td className="py-2 px-3 text-right text-muted">--</td>
                  <td className="py-2 px-3 text-right text-muted">--</td>
                  <td className="py-2 px-3 text-right text-muted">--</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h2 className="text-sm font-semibold mb-3 uppercase tracking-wider">
            Curva Granulometrica
          </h2>
          <div className="h-48 flex items-center justify-center border border-dashed border-card-border rounded-lg">
            <p className="text-xs text-muted">
              Grafico de curva granulometrica sera exibido aqui
            </p>
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold mb-3 uppercase tracking-wider">
            Resultados
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-card-border">
              <span className="text-muted">Modulo de Finura (MF)</span>
              <span className="font-mono">--</span>
            </div>
            <div className="flex justify-between py-2 border-b border-card-border">
              <span className="text-muted">Dimensao Maxima (Dmax)</span>
              <span className="font-mono">-- mm</span>
            </div>
            <div className="flex justify-between py-2 border-b border-card-border">
              <span className="text-muted">Classificacao</span>
              <span className="font-mono">--</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted">Material</span>
              <span className="font-mono">Selecionar</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
