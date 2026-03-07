import { Card } from "@/components/ui/Card";

const PRODUCTS = [
  {
    family: "PAVER",
    label: "Pisos Intertravados",
    items: [
      { name: "Retangular 10x20x6", slump: 25, fck: 35, thickness: 60 },
      { name: "Retangular 10x20x8", slump: 25, fck: 35, thickness: 80 },
      { name: "16 Faces 10x20x8", slump: 30, fck: 35, thickness: 80 },
      { name: "Intertravado 22x11x8", slump: 25, fck: 50, thickness: 80 },
    ],
  },
  {
    family: "BLOCK",
    label: "Blocos de Concreto",
    items: [
      { name: "Bloco 14x19x39", slump: 30, fck: 6, thickness: 140 },
      { name: "Bloco 19x19x39", slump: 30, fck: 6, thickness: 190 },
      { name: "Bloco Estrutural 14x19x39", slump: 25, fck: 12, thickness: 140 },
    ],
  },
  {
    family: "PIPE",
    label: "Tubos de Concreto",
    items: [
      { name: "Tubo D400 L=1000", slump: 15, fck: 25, thickness: 40 },
      { name: "Tubo D600 L=1000", slump: 15, fck: 25, thickness: 50 },
    ],
  },
  {
    family: "CURBSTONE",
    label: "Meio-fio / Guias",
    items: [
      { name: "Meio-fio 100x30x12", slump: 40, fck: 25, thickness: 120 },
    ],
  },
];

export default function ProdutosPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Produtos</h1>
          <p className="text-sm text-muted mt-1">
            Pavers, blocos, tubos e demais pecas vibroprensadas
          </p>
        </div>
        <button className="bg-accent hover:bg-accent-hover text-black font-medium px-4 py-2 rounded-lg text-sm transition-colors">
          + Novo Produto
        </button>
      </div>

      {PRODUCTS.map((group) => (
        <Card key={group.family}>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider">
              {group.label}
            </h2>
            <span className="text-xs bg-info/15 text-info px-2 py-0.5 rounded-full">
              {group.items.length} produtos
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-border text-muted text-xs">
                  <th className="text-left py-2 px-3">Produto</th>
                  <th className="text-center py-2 px-3">Espessura (mm)</th>
                  <th className="text-center py-2 px-3">Slump Alvo (mm)</th>
                  <th className="text-center py-2 px-3">Fck Min (MPa)</th>
                  <th className="text-center py-2 px-3">Traco</th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((item) => (
                  <tr
                    key={item.name}
                    className="border-b border-card-border/50 hover:bg-card-border/20"
                  >
                    <td className="py-2 px-3 font-medium">{item.name}</td>
                    <td className="py-2 px-3 text-center font-mono">
                      {item.thickness}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className="bg-accent/15 text-accent px-2 py-0.5 rounded-full text-xs font-mono">
                        {item.slump}mm
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center font-mono">
                      {item.fck}
                    </td>
                    <td className="py-2 px-3 text-center text-muted">
                      Vincular
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  );
}
