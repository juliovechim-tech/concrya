import { StatCard, Card } from "@/components/ui/Card";

const PRODUCT_FAMILIES = [
  { name: "Pavers", desc: "Pisos intertravados", slump: "0-30mm" },
  { name: "Blocos", desc: "Blocos de concreto", slump: "10-40mm" },
  { name: "Tubos", desc: "Tubos de concreto", slump: "0-20mm" },
  { name: "Meio-fio", desc: "Guias e sarjetas", slump: "20-60mm" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-accent">CONCRYA AION</h1>
        <p className="text-sm text-muted mt-1">
          Dosagem, empacotamento e controle de concretos semi-secos | Slump 0-60mm
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Materiais" value="--" accent />
        <StatCard label="Dosagens Ativas" value="--" />
        <StatCard label="Produtos" value="--" />
        <StatCard label="Lotes (mes)" value="--" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">
            Familias de Produtos
          </h2>
          <div className="space-y-3">
            {PRODUCT_FAMILIES.map((f) => (
              <div
                key={f.name}
                className="flex items-center justify-between py-2 border-b border-card-border last:border-0"
              >
                <div>
                  <p className="text-sm font-medium">{f.name}</p>
                  <p className="text-xs text-muted">{f.desc}</p>
                </div>
                <span className="text-xs bg-accent/15 text-accent px-2 py-1 rounded-full">
                  Slump {f.slump}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">
            Modulos do Sistema
          </h2>
          <div className="space-y-3">
            {[
              { mod: "Granulometria", desc: "Analise e curvas de distribuicao granulometrica" },
              { mod: "Curvas Limite", desc: "Faixas max/min para empacotamento ideal" },
              { mod: "Dosagem", desc: "Tracos com correcao de umidade e proporcoes" },
              { mod: "Controle", desc: "Monitoramento de lotes, slump e densidade" },
            ].map((m) => (
              <div
                key={m.mod}
                className="flex items-center gap-3 py-2 border-b border-card-border last:border-0"
              >
                <div className="w-2 h-2 rounded-full bg-accent" />
                <div>
                  <p className="text-sm font-medium">{m.mod}</p>
                  <p className="text-xs text-muted">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="text-center py-8">
        <p className="text-muted text-sm">
          Peneiras padrao: 19 | 12.5 | 9.5 | 6.3 | 4.75 | 2.36 | 1.18 | 0.6 | 0.3 | 0.15 | Fundo
        </p>
        <p className="text-xs text-muted mt-2">
          Concretos semi-secos para vibroprensados conforme NBR 9781 / NBR 6136
        </p>
      </Card>
    </div>
  );
}
