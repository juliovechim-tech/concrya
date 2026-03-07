import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState, useMemo } from "react";
import { 
  ArrowLeft, 
  Users, 
  Download, 
  RefreshCw, 
  Search, 
  Mail, 
  Calendar,
  TrendingUp,
  Target,
  Filter,
  FileSpreadsheet,
  AlertTriangle
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function AdminLeads() {
  const { data: user } = trpc.auth.me.useQuery();
  const { data: leadsData, refetch: refetchLeads, isLoading } = trpc.leads.list.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [filterOrigem, setFilterOrigem] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Filtrar leads
  const filteredLeads = useMemo(() => {
    if (!leadsData) return [];
    
    return leadsData.filter((lead) => {
      const matchesSearch = 
        lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
      
      const matchesOrigem = filterOrigem === "all" || lead.origem === filterOrigem;
      const matchesStatus = filterStatus === "all" || lead.status === filterStatus;
      
      return matchesSearch && matchesOrigem && matchesStatus;
    });
  }, [leadsData, searchTerm, filterOrigem, filterStatus]);

  // Estatísticas
  const stats = useMemo(() => {
    if (!leadsData) return { total: 0, novos: 0, convertidos: 0, taxaConversao: 0 };
    
    const total = leadsData.length;
    const novos = leadsData.filter(l => l.status === "novo").length;
    const convertidos = leadsData.filter(l => l.status === "convertido").length;
    const taxaConversao = total > 0 ? ((convertidos / total) * 100).toFixed(1) : 0;
    
    return { total, novos, convertidos, taxaConversao };
  }, [leadsData]);

  // Origens únicas para filtro
  const origensUnicas = useMemo(() => {
    if (!leadsData) return [];
    return Array.from(new Set(leadsData.map(l => l.origem)));
  }, [leadsData]);

  // Exportar para CSV
  const exportToCSV = () => {
    if (!filteredLeads.length) {
      toast.error("Nenhum lead para exportar");
      return;
    }

    const headers = ["Email", "Nome", "Telefone", "Origem", "Ferramenta", "Status", "Data de Cadastro"];
    const rows = filteredLeads.map(lead => [
      lead.email,
      lead.nome || "",
      lead.telefone || "",
      lead.origem,
      lead.ferramenta || "",
      lead.status,
      new Date(lead.createdAt).toLocaleDateString("pt-BR")
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `leads_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`${filteredLeads.length} leads exportados!`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "novo":
        return <Badge className="bg-blue-500">Novo</Badge>;
      case "contatado":
        return <Badge className="bg-yellow-500">Contatado</Badge>;
      case "qualificado":
        return <Badge className="bg-green-500">Qualificado</Badge>;
      case "convertido":
        return <Badge className="bg-purple-500">Convertido</Badge>;
      case "descartado":
        return <Badge variant="secondary">Descartado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getOrigemBadge = (origem: string) => {
    switch (origem) {
      case "ferramenta_gratuita":
        return <Badge variant="outline" className="border-green-500 text-green-500">Ferramenta Grátis</Badge>;
      case "landing_page":
        return <Badge variant="outline" className="border-orange-500 text-orange-500">Landing Page</Badge>;
      default:
        return <Badge variant="outline">{origem}</Badge>;
    }
  };

  // Verificar se é admin - APÓS todos os hooks
  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Acesso Negado
            </CardTitle>
            <CardDescription>
              Você não tem permissão para acessar esta área.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button className="w-full">Voltar ao Início</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-gradient-to-r from-green-500/10 to-blue-500/10 sticky top-0 z-50 backdrop-blur">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold uppercase tracking-tight">Gestão de Leads</h1>
                <p className="text-xs text-muted-foreground">Captura e conversão de clientes</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetchLeads()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
            <Button size="sm" onClick={exportToCSV}>
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total de Leads</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.novos}</p>
                  <p className="text-xs text-muted-foreground">Leads Novos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.convertidos}</p>
                  <p className="text-xs text-muted-foreground">Convertidos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.taxaConversao}%</p>
                  <p className="text-xs text-muted-foreground">Taxa de Conversão</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por email ou nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterOrigem} onValueChange={setFilterOrigem}>
                <SelectTrigger className="w-full md:w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Origens</SelectItem>
                  {origensUnicas.map((origem) => (
                    <SelectItem key={origem} value={origem}>{origem}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="novo">Novo</SelectItem>
                  <SelectItem value="contatado">Contatado</SelectItem>
                  <SelectItem value="qualificado">Qualificado</SelectItem>
                  <SelectItem value="convertido">Convertido</SelectItem>
                  <SelectItem value="descartado">Descartado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Leads */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5" />
                  Lista de Leads
                </CardTitle>
                <CardDescription>
                  {filteredLeads.length} lead{filteredLeads.length !== 1 ? "s" : ""} encontrado{filteredLeads.length !== 1 ? "s" : ""}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando leads...
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum lead encontrado
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Ferramenta</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">{lead.email}</TableCell>
                        <TableCell>{lead.nome || "-"}</TableCell>
                        <TableCell>{getOrigemBadge(lead.origem)}</TableCell>
                        <TableCell>{lead.ferramenta || "-"}</TableCell>
                        <TableCell>{getStatusBadge(lead.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground text-sm">
                            <Calendar className="w-3 h-3" />
                            {new Date(lead.createdAt).toLocaleDateString("pt-BR")}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
