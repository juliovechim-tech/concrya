import { Card } from "@/components/ui/Card";

const SIEVES = [19, 12.5, 9.5, 6.3, 4.75, 2.36, 1.18, 0.6, 0.3, 0.15];

const EXAMPLE_CURVES = [
  {
    name: "Faixa Ideal Paver 8cm",
    family: "PAVER",
    limits: [
      { mm: 19, min: 100, max: 100 },
      { mm: 12.5, min: 95, max: 100 },
      { mm: 9.5, min: 80, max: 100 },
      { mm: 6.3, min: 55, max: 85 },
      { mm: 4.75, min: 40, max: 75 },
      { mm: 2.36, min: 25, max: 55 },
      { mm: 1.18, min: 18, max: 42 },
      { mm: 0.6, min: 12, max: 32 },
      { mm: 0.3, min: 7, max: 22 },
      { mm: 0.15, min: 2, max: 12 },
    ],
  },
  {
    name: "Faixa Ideal Bloco 14cm",
    family: "BLOCK",
    limits: [
      { mm: 19, min: 100, max: 100 },
      { mm: 12.5, min: 100, max: 100 },
      { mm: 9.5, min: 85, max: 100 },
      { mm: 6.3, min: 60, max: 90 },
      { mm: 4.75, min: 45, max: 80 },
      { mm: 2.36, min: 30, max: 60 },
      { mm: 1.18, min: 20, max: 45 },
      { mm: 0.6, min: 14, max: 35 },
      { mm: 0.3, min: 8, max: 25 },
      { mm: 0.15, min: 3, max: 15 },
    ],
  },
];

export default function CurvasPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Curvas Limite</h1>
          <p className="text-sm text-muted mt-1">
            Faixas granulometricas de maximo e minimo para empacotamento
          </p>
        </div>
        <button className="bg-accent hover:bg-accent-hover text-black font-medium px-4 py-2 rounded-lg text-sm transition-colors">
          + Nova Curva
        </button>
      </div>

      {EXAMPLE_CURVES.map((curve) => (
        <Card key={curve.name}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold">{curve.name}</h2>
              <span className="text-xs bg-accent/15 text-accent px-2 py-0.5 rounded-full">
                {curve.family}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-border text-muted text-xs">
                  <th className="text-left py-2 px-3">Peneira (mm)</th>
                  {SIEVES.map((s) => (
                    <th key={s} className="text-center py-2 px-2 font-mono">
                      {s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-card-border/50">
                  <td className="py-2 px-3 text-xs text-success font-medium">
                    % Passante MAX
                  </td>
                  {curve.limits.map((l) => (
                    <td
                      key={l.mm}
                      className="text-center py-2 px-2 font-mono text-success"
                    >
                      {l.max}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-card-border/50">
                  <td className="py-2 px-3 text-xs text-danger font-medium">
                    % Passante MIN
                  </td>
                  {curve.limits.map((l) => (
                    <td
                      key={l.mm}
                      className="text-center py-2 px-2 font-mono text-danger"
                    >
                      {l.min}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 h-32 flex items-center justify-center border border-dashed border-card-border rounded-lg">
            <p className="text-xs text-muted">
              Grafico de faixa (area entre MIN e MAX) sera renderizado aqui
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}
