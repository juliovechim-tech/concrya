import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { ArrowLeft, Shield, Users, Key, Plus, RefreshCw, Ban, CheckCircle, Clock, AlertTriangle, Mail } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function Admin() {
  const { data: user } = trpc.auth.me.useQuery();
  const { data: licencasData, refetch: refetchLicencas } = trpc.licencas.listAll.useQuery(undefined, {
    enabled: user?.role === "admin",
  });
  const { data: usuariosData, refetch: refetchUsuarios } = trpc.admin.listarUsuarios.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const criarLicenca = trpc.licencas.criar.useMutation({
    onSuccess: () => {
      toast.success("Licença criada com sucesso!");
      refetchLicencas();
      setNovaLicencaOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const atualizarLicenca = trpc.licencas.atualizar.useMutation({
    onSuccess: () => {
      toast.success("Licença atualizada!");
      refetchLicencas();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const renovarLicenca = trpc.licencas.renovar.useMutation({
    onSuccess: () => {
      toast.success("Licença renovada!");
      refetchLicencas();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const suspenderLicenca = trpc.licencas.suspender.useMutation({
    onSuccess: () => {
      toast.success("Licença suspensa!");
      refetchLicencas();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const [novaLicencaOpen, setNovaLicencaOpen] = useState(false);
  const [novaLicenca, setNovaLicenca] = useState({
    userId: 0,
    tipo: "mensal" as "mensal" | "anual" | "vitalicia" | "trial",
    nivel: "basico" as "basico" | "tecnico" | "avancado" | "cientifico" | "completo",
    observacoes: "",
  });

  // Verificar se é admin
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ativa":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Ativa</Badge>;
      case "expirada":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Expirada</Badge>;
      case "suspensa":
        return <Badge variant="destructive"><Ban className="w-3 h-3 mr-1" /> Suspensa</Badge>;
      case "cancelada":
        return <Badge variant="outline"><AlertTriangle className="w-3 h-3 mr-1" /> Cancelada</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getNivelBadge = (nivel: string) => {
    const cores: Record<string, string> = {
      basico: "bg-gray-500",
      tecnico: "bg-blue-500",
      avancado: "bg-orange-500",
      cientifico: "bg-purple-500",
      completo: "bg-gradient-to-r from-orange-500 to-purple-500",
    };
    return <Badge className={cores[nivel] || ""}>{nivel.charAt(0).toUpperCase() + nivel.slice(1)}</Badge>;
  };

  const handleCriarLicenca = () => {
    if (!novaLicenca.userId) {
      toast.error("Selecione um usuário");
      return;
    }
    criarLicenca.mutate(novaLicenca);
  };

  // Usuários sem licença
  const usuariosSemLicenca = usuariosData?.filter(
    (u) => !licencasData?.some((l) => l.licenca.userId === u.id)
  ) || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-gradient-to-r from-purple-500/10 to-pink-500/10 sticky top-0 z-50 backdrop-blur">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold uppercase tracking-tight">Painel Admin</h1>
                <p className="text-xs text-muted-foreground">Gerenciamento de Licenças</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/leads">
              <Button variant="outline" size="sm">
                <Mail className="w-4 h-4 mr-2" />
                Leads
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={() => { refetchLicencas(); refetchUsuarios(); }}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
            <Dialog open={novaLicencaOpen} onOpenChange={setNovaLicencaOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Licença
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Nova Licença</DialogTitle>
                  <DialogDescription>
                    Atribua uma licença a um usuário cadastrado.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Usuário</Label>
                    <Select onValueChange={(v) => setNovaLicenca({ ...novaLicenca, userId: Number(v) })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um usuário" />
                      </SelectTrigger>
                      <SelectContent>
                        {usuariosSemLicenca.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            {u.name || u.email || `Usuário #${u.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Tipo</Label>
                      <Select value={novaLicenca.tipo} onValueChange={(v: any) => setNovaLicenca({ ...novaLicenca, tipo: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="trial">Trial (7 dias)</SelectItem>
                          <SelectItem value="mensal">Mensal</SelectItem>
                          <SelectItem value="anual">Anual</SelectItem>
                          <SelectItem value="vitalicia">Vitalícia</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Nível</Label>
                      <Select value={novaLicenca.nivel} onValueChange={(v: any) => setNovaLicenca({ ...novaLicenca, nivel: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basico">Básico</SelectItem>
                          <SelectItem value="tecnico">Técnico</SelectItem>
                          <SelectItem value="avancado">Avançado</SelectItem>
                          <SelectItem value="cientifico">Científico</SelectItem>
                          <SelectItem value="completo">Completo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Observações</Label>
                    <Input
                      value={novaLicenca.observacoes}
                      onChange={(e) => setNovaLicenca({ ...novaLicenca, observacoes: e.target.value })}
                      placeholder="Notas internas..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setNovaLicencaOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCriarLicenca} disabled={criarLicenca.isPending}>
                    {criarLicenca.isPending ? "Criando..." : "Criar Licença"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <Tabs defaultValue="licencas">
          <TabsList className="mb-6">
            <TabsTrigger value="licencas" className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              Licenças ({licencasData?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="usuarios" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Usuários ({usuariosData?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Licenças */}
          <TabsContent value="licencas">
            <div className="grid gap-4">
              {licencasData?.map((item) => (
                <Card key={item.licenca.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                          <Users className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{item.usuario?.name || item.usuario?.email || `Usuário #${item.licenca.userId}`}</h3>
                          <p className="text-sm text-muted-foreground">{item.usuario?.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusBadge(item.licenca.status)}
                            {getNivelBadge(item.licenca.nivel)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {item.licenca.tipo.charAt(0).toUpperCase() + item.licenca.tipo.slice(1)} • 
                            {item.licenca.dataExpiracao
                              ? ` Expira: ${new Date(item.licenca.dataExpiracao).toLocaleDateString("pt-BR")}`
                              : " Sem expiração"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {item.licenca.status === "ativa" && item.licenca.tipo !== "vitalicia" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => renovarLicenca.mutate({ id: item.licenca.id })}
                            >
                              <RefreshCw className="w-4 h-4 mr-1" />
                              Renovar
                            </Button>
                          )}
                          {item.licenca.status === "ativa" && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => suspenderLicenca.mutate({ id: item.licenca.id })}
                            >
                              <Ban className="w-4 h-4 mr-1" />
                              Suspender
                            </Button>
                          )}
                          {item.licenca.status === "suspensa" && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => atualizarLicenca.mutate({ id: item.licenca.id, status: "ativa" })}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Reativar
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(!licencasData || licencasData.length === 0) && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Key className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-semibold mb-2">Nenhuma licença cadastrada</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Crie licenças para permitir que usuários acessem a plataforma.
                    </p>
                    <Button onClick={() => setNovaLicencaOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Primeira Licença
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Usuários */}
          <TabsContent value="usuarios">
            <div className="grid gap-4">
              {usuariosData?.map((u) => {
                const licenca = licencasData?.find((l) => l.licenca.userId === u.id);
                return (
                  <Card key={u.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                            <Users className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{u.name || `Usuário #${u.id}`}</h3>
                            <p className="text-sm text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="flex items-center gap-2 mb-1">
                              {u.role === "admin" && <Badge className="bg-purple-500">Admin</Badge>}
                              {licenca ? getStatusBadge(licenca.licenca.status) : <Badge variant="outline">Sem licença</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Último acesso: {new Date(u.lastSignedIn).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                          {!licenca && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setNovaLicenca({ ...novaLicenca, userId: u.id });
                                setNovaLicencaOpen(true);
                              }}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Criar Licença
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
