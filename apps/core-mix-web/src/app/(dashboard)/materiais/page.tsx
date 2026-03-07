import { Card } from "@/components/ui/Card";

const MATERIAL_TYPES = [
  { type: "CITE", label: "Cimento", color: "bg-gray-400" },
  { type: "AGG_COARSE", label: "Agregado Graudo", color: "bg-blue-400" },
  { type: "AGG_FINE", label: "Agregado Miudo (Areia)", color: "bg-yellow-400" },
  { type: "AGG_DUST", label: "Po de Pedra", color: "bg-orange-400" },
  { type: "PIGMENT", label: "Pigmento", color: "bg-red-400" },
  { type: "ADDITIVE", label: "Aditivo", color: "bg-green-400" },
  { type: "WATER", label: "Agua", color: "bg-cyan-400" },
];

export default function MateriaisPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Materiais</h1>
          <p className="text-sm text-muted mt-1">
            Cadastro de materiais com propriedades fisicas e granulometria
          </p>
        </div>
        <button className="bg-accent hover:bg-accent-hover text-black font-medium px-4 py-2 rounded-lg text-sm transition-colors">
          + Novo Material
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {MATERIAL_TYPES.map((mt) => (
          <Card key={mt.type}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-3 h-3 rounded-full ${mt.color}`} />
              <h3 className="text-sm font-semibold">{mt.label}</h3>
            </div>
            <div className="space-y-2 text-xs text-muted">
              <div className="flex justify-between">
                <span>Massa especifica</span>
                <span>-- g/cm3</span>
              </div>
              <div className="flex justify-between">
                <span>Massa unitaria</span>
                <span>-- kg/m3</span>
              </div>
              <div className="flex justify-between">
                <span>Umidade</span>
                <span>-- %</span>
              </div>
              <div className="flex justify-between">
                <span>Absorcao</span>
                <span>-- %</span>
              </div>
              <div className="flex justify-between">
                <span>Modulo de finura</span>
                <span>--</span>
              </div>
            </div>
            <p className="text-[10px] text-muted mt-3 text-center italic">
              Nenhum material cadastrado
            </p>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="text-sm font-semibold mb-3 uppercase tracking-wider">
          Propriedades Importantes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-muted">
          <div>
            <p className="font-medium text-foreground mb-1">Teor de Umidade</p>
            <p>Essencial para correcao de agua na dosagem. Medir diariamente nos agregados.</p>
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">Granulometria</p>
            <p>Distribuicao granulometrica de cada material para compor a curva de empacotamento.</p>
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">Massa Especifica</p>
            <p>Necessaria para conversao volume/massa no calculo do traco.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
