# Project TODO - Mestres do Concreto - Plataforma de Dosagem

## Estrutura de Níveis da Plataforma

### Nível 1 - Básico (Leigos, Pedreiros, Construtores)
- [ ] Traço em medidas práticas (latas, baldes, carrinhos)
- [ ] Tabelas prontas por aplicação (contrapiso, laje, pilar, viga)
- [ ] Calculadora visual simples com ícones
- [ ] Dicas de execução e boas práticas
- [ ] Vídeos tutoriais integrados

### Nível 2 - Técnico (Engenheiros, Concreteiras)
- [ ] Método ABCP/ACI completo
- [ ] Curva de Abrams com calibração
- [ ] Ajuste de umidade dos agregados
- [ ] Controle tecnológico (ensaios)
- [ ] Carta traço para produção
- [ ] Gerador de múltiplos traços por fck
- [ ] Tabela de slumps (0 a 230mm)

### Nível 3 - Avançado (Pré-moldados, CAA, HPC)
- [ ] Teor de argamassa otimizado
- [ ] 2 agregados miúdos + 2 graúdos
- [ ] Até 3 adições (sílica como aglomerante ou filler)
- [ ] CAA com Flow SF1, SF2, SF3
- [ ] Curvas granulométricas (Fuller, Andreassen)
- [ ] Empacotamento de partículas básico

### Nível 4 - Científico (UHPC, Ductal, de Larrard)
- [ ] Modelo de Empacotamento Compressível (MEC) de François de Larrard
- [ ] Metodologia Ductal/Lafarge
- [ ] Curvas de Funk-Dinger com coeficiente q
- [ ] Múltiplos cimentos (até 2)
- [ ] Fillers reativos (até 3) com teor de sólidos/água
- [ ] Fillers inertes (até 3)
- [ ] Agregados miúdos (até 4 para UHPC)
- [ ] Britas/Granilhas (até 3)
- [ ] Aditivos (até 4) com teor de água
- [ ] Fibras (até 2)
- [ ] BET, Blaine, distribuição granulométrica completa
- [ ] Peneiras até #200 (0,075mm)
- [ ] Cálculo de viscosidade da pasta
- [ ] Modelo de resistência por porosidade

### Funcionalidades Gerais
- [x] Login de usuários com OAuth
- [x] Banco de dados de materiais
- [x] Salvamento de traços na nuvem
- [ ] Dashboard de custos com gráficos de evolução
- [x] Integração WhatsApp para envio de fichas
- [x] Exportação CSV/Excel
- [ ] Área de tutoriais com vídeos
- [ ] Captura de leads

### Concluídos
- [x] Estrutura base do projeto
- [x] Identidade visual Mestres do Concreto
- [x] Sistema de autenticação
- [x] Schema do banco de dados
- [x] Routers TRPC para CRUD

## Sistema de Licenças e Admin

- [ ] Schema de licenças (mensal, anual, vitalícia)
- [ ] Painel administrativo exclusivo para o dono
- [ ] Criar/editar/revogar licenças de usuários
- [ ] Visualizar data de expiração e status
- [ ] Banco de materiais pessoal por usuário
- [ ] Salvar traços na nuvem por usuário
- [ ] Volume customizável em todas as calculadoras (padrão 1m³)

## Correção de Planilha e Brinde

- [x] Analisar planilha CAMARGO com erro de sílica
- [x] Corrigir fórmulas de volume quando adiciona sílica
- [x] Corrigir somatório de aglomerantes (cimento + sílica)
- [x] Implementar desconto de água da sílica em suspensão
- [x] Criar versão corrigida da planilha como brinde
- [x] Disponibilizar download no app para atrair usuários

## Nova Planilha Profissional

- [x] Criar planilha com identidade visual Mestres do Concreto
- [x] Aplicar cores laranja, preto e branco
- [x] Inserir logo Mestres do Concreto
- [x] Adicionar hyperlinks (site, Instagram, WhatsApp)
- [x] Implementar proteção por senha (mestres2024)
- [x] Corrigir fórmulas de sílica


## Laboratório - Melhorias

- [x] Corrigir "Quantidade de Bateladas" para "Volume da Batelada"
- [x] Permitir volumes de 0.5L (500ml) até 1000L (1m³)
- [x] Bateladas de Teste: Selecionar traço salvo para calcular massada
- [x] Corte de Água: Puxar traço salvo e ajustar água por umidade
- [x] Cadastro de Ensaios: Vincular ao traço ensaiado
- [x] Registrar resultados de slump e resistência por idade (R1, R3, R7, R14, R28, R63, R90, R180)
- [ ] Filtrar traços por nome/data para seleção rápida
- [x] Menu Laboratório expansível no header com dropdown

## Bugs Reportados

- [x] Criar página NivelCientifico.tsx (calculadora UHPC/Larrard)
- [x] Atualizar logo do aplicativo com nova identidade visual
- [x] Corrigir erro DialogTitle na página /kits (acessibilidade)
- [x] Usar logo claro (versão light) no header e footer
- [x] Ajustar logo para fundo transparente no tema escuro (usando versão circular)
- [x] Criar página /consultoria (404)
- [x] Adicionar seção de depoimentos na página Consultoria
- [x] Integrar Calendly na página Consultoria para agendamento direto
- [x] Criar página FAQ com dúvidas frequentes

## Monetização e Hotmart

- [x] Criar página de Pricing com 4 planos (Gratuito, Técnico, Avançado, Científico)
- [x] Criar schema de licenças no banco de dados
- [x] Implementar controle de acesso por nível de plano
- [x] Preparar integração Hotmart (webhook e validação)
- [x] Período de trial de 7 dias
- [x] Restrições para plano gratuito (3 traços, sem exportação)

## Landing Page e Menu

- [x] Criar landing page de vendas otimizada para Hotmart/Instagram
- [x] Adicionar link Pricing no menu principal
- [x] Criar página de agradecimento pós-compra com instruções e upsell
- [x] Adicionar link para mestresconcreto.com/consultoria na página de consultoria
- [x] Adicionar Pixel do Facebook (1872294346254749) na página de obrigado
- [x] Adicionar botão de compartilhamento WhatsApp na página de obrigado
- [x] Corrigir erro DialogTitle na página inicial (acessibilidade)
- [x] Corrigir erro DialogTitle na página /laboratorio/bateladas (acessibilidade) - já corrigido no DialogContent base
- [x] Atualizar links Ver Catálogo para mestresconcreto.com/insumos e /kits
- [x] Corrigir erro 404 no botão Começar Agora (direciona para /pricing)
- [x] Adicionar link para mestresconcreto.com no menu/header
- [x] Adicionar botão/banner para mestresconcreto.com na Home
- [x] Adicionar link para mestresconcreto.com no menu/header
- [x] Adicionar botão/banner para mestresconcreto.com na Home
- [x] Atualizar frase "Do Pedreiro ao Cientista da NASA" para "Do Canteiro à NASA"
- [x] Atualizar frase para "Da Betoneira ao Foguete"

## Ferramenta Gratuita - Otimização de Agregados

- [x] Corrigir erro no botão "Começar Agora" 
- [x] Criar página /otimizacao-agregados com ferramenta gratuita
- [x] Integrar sistema HTML de otimização de agregados ao React
- [x] Atualizar botão "Começar Agora" para direcionar à ferramenta gratuita
- [x] Adicionar link no menu para ferramenta gratuita

## Captura de Leads e Upsell

- [x] Criar formulário de captura de e-mail antes de liberar resultados
- [x] Salvar leads no banco de dados
- [x] Criar popup de upsell após uso da ferramenta gratuita
- [x] Mostrar benefícios dos planos premium no popup
- [x] Adicionar botão de CTA para página de pricing

## Painel de Leads no Admin

- [x] Criar página /admin/leads para visualizar leads
- [x] Exibir tabela com todos os leads capturados
- [x] Adicionar filtros por data, origem e status
- [x] Implementar exportação para CSV/Excel
- [x] Adicionar estatísticas de conversão
