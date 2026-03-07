import { Card } from "@/components/ui/Card";

const EXAMPLE_MIX = {
  code: "TR-PAVER-001",
  name: "Traco Paver 35MPa",
  targetSlump: 25,
  wcRatio: 0.42,
  cementConsumption: 320,
  components: [
    { material: "CP-V ARI", type: "Cimento", qty: 320, proportion: "1" },
    { material: "Brita 0", type: "Agregado Graudo", qty: 640, proportion: "2" },
    { material: "Po de Pedra", type: "Po de Pedra", qty: 480, proportion: "1.5" },
    { material: "Areia Fina", type: "Areia", qty: 320, proportion: "1" },
    { material: "Pigmento Vermelho", type: "Pigmento", qty: 9.6, proportion: "3%" },
    { material: "Agua", type: "Agua", qty: 134.4, proportion: "a/c 0.42" },
  ],
};

export default function DosagemPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dosagem</h1>
          <p className="text-sm text-muted mt-1">
            Tracos de concreto semi-seco com correcao de umidade
          </p>
        </div>
        <button className="bg-accent hover:bg-accent-hover text-black font-medium px-4 py-2 rounded-lg text-sm transition-colors">
          + Novo Traco
        </button>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold">{EXAMPLE_MIX.code}</h2>
              <span className="text-xs bg-success/15 text-success px-2 py-0.5 rounded-full">
                Ativo
              </span>
            </div>
            <p className="text-sm text-muted">{EXAMPLE_MIX.name}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-background rounded-lg">
            <p className="text-xs text-muted">Slump Alvo</p>
            <p className="text-xl font-bold text-accent">{EXAMPLE_MIX.targetSlump}mm</p>
          </div>
          <div className="text-center p-3 bg-background rounded-lg">
            <p className="text-xs text-muted">Relacao a/c</p>
            <p className="text-xl font-bold">{EXAMPLE_MIX.wcRatio}</p>
          </div>
          <div className="text-center p-3 bg-background rounded-lg">
            <p className="text-xs text-muted">Consumo Cimento</p>
            <p className="text-xl font-bold">{EXAMPLE_MIX.cementConsumption} kg/m3</p>
          </div>
          <div className="text-center p-3 bg-background rounded-lg">
            <p className="text-xs text-muted">Traco</p>
            <p className="text-xl font-bold font-mono">1:2:1.5:1</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border text-muted text-xs">
                <th className="text-left py-2 px-3">Material</th>
                <th className="text-left py-2 px-3">Tipo</th>
                <th className="text-right py-2 px-3">Qtd (kg/m3)</th>
                <th className="text-right py-2 px-3">Proporcao</th>
                <th className="text-right py-2 px-3">Umidade (%)</th>
                <th className="text-right py-2 px-3">Corrigido (kg)</th>
              </tr>
            </thead>
            <tbody>
              {EXAMPLE_MIX.components.map((c) => (
                <tr
                  key={c.material}
                  className="border-b border-card-border/50 hover:bg-card-border/20"
                >
                  <td className="py-2 px-3 font-medium">{c.material}</td>
                  <td className="py-2 px-3 text-muted">{c.type}</td>
                  <td className="py-2 px-3 text-right font-mono">{c.qty}</td>
                  <td className="py-2 px-3 text-right font-mono text-accent">
                    {c.proportion}
                  </td>
                  <td className="py-2 px-3 text-right text-muted">--</td>
                  <td className="py-2 px-3 text-right text-muted">--</td>
                </tr>
              ))}
              <tr className="font-bold">
                <td className="py-2 px-3" colSpan={2}>
                  TOTAL
                </td>
                <td className="py-2 px-3 text-right font-mono">
                  {EXAMPLE_MIX.components.reduce((s, c) => s + c.qty, 0).toFixed(1)}
                </td>
                <td className="py-2 px-3" colSpan={3} />
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h2 className="text-sm font-semibold mb-3 uppercase tracking-wider">
            Correcao de Umidade
          </h2>
          <p className="text-xs text-muted mb-3">
            A umidade dos agregados altera a quantidade de agua efetiva.
            Informe o teor de umidade atual para corrigir automaticamente.
          </p>
          <div className="space-y-2">
            {["Brita 0", "Po de Pedra", "Areia Fina"].map((m) => (
              <div key={m} className="flex items-center justify-between py-2 border-b border-card-border/50">
                <span className="text-sm">{m}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">Umidade:</span>
                  <span className="font-mono text-sm bg-background px-2 py-1 rounded">-- %</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold mb-3 uppercase tracking-wider">
            Pigmentos e Aditivos
          </h2>
          <p className="text-xs text-muted mb-3">
            Pigmentos: dosados como % sobre massa de cimento.
            Aditivos: conforme recomendacao do fabricante.
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 border-b border-card-border/50">
              <span className="text-sm">Pigmento Vermelho</span>
              <span className="font-mono text-sm text-accent">3% s/ cimento = 9.6 kg/m3</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted italic">Nenhum aditivo adicionado</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
