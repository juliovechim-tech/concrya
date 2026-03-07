import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface Traco {
  id: number;
  nome: string;
  tipoConcreto: string;
  fckAlvo: number | null;
  updatedAt: Date | string;
  [key: string]: any;
}

interface TracoSelectProps {
  tracos: Traco[] | undefined;
  isLoading: boolean;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export default function TracoSelect({
  tracos,
  isLoading,
  value,
  onValueChange,
  placeholder = "Selecione um traço...",
}: TracoSelectProps) {
  const [busca, setBusca] = useState("");
  const [ordenacao, setOrdenacao] = useState<"nome" | "data" | "tipo">("data");

  const tracosFiltrados = useMemo(() => {
    if (!tracos) return [];

    let filtrados = [...tracos];

    // Filtrar por busca
    if (busca.trim()) {
      const termo = busca.toLowerCase();
      filtrados = filtrados.filter(
        (t) =>
          t.nome.toLowerCase().includes(termo) ||
          t.tipoConcreto.toLowerCase().includes(termo) ||
          (t.fckAlvo && `${t.fckAlvo}`.includes(termo))
      );
    }

    // Ordenar
    filtrados.sort((a, b) => {
      if (ordenacao === "nome") return a.nome.localeCompare(b.nome);
      if (ordenacao === "tipo") return a.tipoConcreto.localeCompare(b.tipoConcreto);
      // data (mais recente primeiro)
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return filtrados;
  }, [tracos, busca, ordenacao]);

  return (
    <div className="space-y-3">
      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, tipo ou fck..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {/* Ordenação */}
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground whitespace-nowrap">Ordenar:</Label>
        <div className="flex gap-1">
          {([
            { key: "data", label: "Recentes" },
            { key: "nome", label: "Nome" },
            { key: "tipo", label: "Tipo" },
          ] as const).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setOrdenacao(opt.key)}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                ordenacao === opt.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Select */}
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {isLoading ? (
            <SelectItem value="loading" disabled>
              Carregando...
            </SelectItem>
          ) : tracosFiltrados.length > 0 ? (
            tracosFiltrados.map((traco) => (
              <SelectItem key={traco.id} value={traco.id.toString()}>
                <div className="flex items-center gap-2">
                  <span>{traco.nome}</span>
                  <span className="text-xs text-muted-foreground">
                    ({traco.tipoConcreto}
                    {traco.fckAlvo ? ` · ${traco.fckAlvo} MPa` : ""})
                  </span>
                </div>
              </SelectItem>
            ))
          ) : busca ? (
            <SelectItem value="no-results" disabled>
              Nenhum traço encontrado para "{busca}"
            </SelectItem>
          ) : (
            <SelectItem value="empty" disabled>
              Nenhum traço cadastrado
            </SelectItem>
          )}
        </SelectContent>
      </Select>

      {/* Contador */}
      {tracos && tracos.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {tracosFiltrados.length} de {tracos.length} traço{tracos.length !== 1 ? "s" : ""}
          {busca ? ` (filtrado)` : ""}
        </p>
      )}
    </div>
  );
}
