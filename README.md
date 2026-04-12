# 🌻 Rede Girassol — Gestão de Relatórios de Produção

**App web para automatizar o preenchimento, revisão e registo de relatórios da Direcção de Produção da Rede Girassol.**

---

## ✅ Funcionalidades Implementadas

### 4 Formulários Digitais Completos
| Relatório | Campos/Secções | Tabelas Dinâmicas |
|---|---|---|
| **Relatório de Pauta** | Identificação, Pautas Confirmadas, Pendentes, Canceladas, Equipas | 4 tabelas |
| **Relatório de Programas Diários** | Identificação, Programas do Dia, Falhas/Incidentes | 2 tabelas |
| **Relatório de Programas Gravados** | Identificação, Conteúdo Gravado, Equipa Técnica, Artística, Incidentes, Materiais | 5 tabelas |
| **Relatório Semanal de Produção** | Identificação, Gravações, Emissões Directas, Pendências, RH, Equipamentos, Indicadores | 4 tabelas |

### Funcionalidades Gerais
- ✅ **Dashboard** com contadores e acesso rápido a todos os relatórios
- ✅ **Tabelas dinâmicas** com adição e remoção de linhas em todos os formulários
- ✅ **Pré-visualização** antes do envio com modal de confirmação
- ✅ **Guardar rascunho** — guarda sem marcar como enviado
- ✅ **Envio definitivo** — marca o relatório como "Enviado" na base de dados
- ✅ **Histórico de envios** com lista de todos os relatórios (rascunhos e enviados)
- ✅ **Pesquisa e filtragem** no histórico por tipo, estado e texto
- ✅ **Visualização** de qualquer relatório do histórico
- ✅ **Eliminação** de registos no histórico
- ✅ **Design responsivo** — funciona em desktop, tablet e telemóvel
- ✅ **Notificações toast** para feedback de acções

---

## 🔗 Páginas / Rotas

| Página | Acesso | Descrição |
|---|---|---|
| `/` | Dashboard | Painel principal com estatísticas e acesso rápido |
| `#dashboard` | Dashboard | Painel com últimos envios |
| `#pauta` | Relatório de Pauta | Formulário completo de pauta |
| `#programas-diarios` | Programas Diários | Formulário de emissão diária |
| `#programas-gravados` | Programas Gravados | Formulário de sessão de gravação |
| `#semanal` | Relatório Semanal | Formulário de relatório semanal |
| `#historico` | Histórico | Todos os relatórios registados |

---

## 🗄️ Modelos de Dados (API Tables)

### `relatorios_pauta`
| Campo | Tipo | Descrição |
|---|---|---|
| `data_referencia` | text | Data do dia de referência |
| `data_envio` | text | Data de envio do relatório |
| `elaborado_por` | text | Nome do responsável |
| `cargo_funcao` | text | Cargo/função |
| `pautas_confirmadas` | rich_text | JSON com lista de pautas confirmadas |
| `pautas_pendentes` | rich_text | JSON com pautas pendentes |
| `pautas_canceladas` | rich_text | JSON com pautas canceladas/adiadas |
| `equipas_tecnicas` | rich_text | JSON com equipas destacadas |
| `notas_gerais` | rich_text | Observações livres |
| `status` | text | `rascunho` ou `enviado` |

### `relatorios_programas_diarios`
| Campo | Tipo | Descrição |
|---|---|---|
| `data_emissao` | text | Data da emissão |
| `programas` | rich_text | JSON com lista de programas emitidos |
| `incidentes` | rich_text | JSON com falhas/incidentes |
| `observacoes_gerais` | rich_text | Notas finais |
| `status` | text | `rascunho` ou `enviado` |

### `relatorios_programas_gravados`
| Campo | Tipo | Descrição |
|---|---|---|
| `nome_programa` | text | Nome do programa gravado |
| `data_gravacao` | text | Data da sessão |
| `local_gravacao` | text | Local (estúdio/exteriores) |
| `conteudo_gravado` | rich_text | JSON com episódios/segmentos |
| `equipa_tecnica` | rich_text | JSON com equipa técnica |
| `equipa_artistica` | rich_text | JSON com elenco |
| `incidentes` | rich_text | JSON com ocorrências |
| `materiais_utilizados` | rich_text | JSON com equipamentos |
| `status` | text | `rascunho` ou `enviado` |

### `relatorios_semanais`
| Campo | Tipo | Descrição |
|---|---|---|
| `semana_referencia` | text | Período da semana |
| `numero_semana` | text | Número da semana |
| `gravacoes_semana` | rich_text | JSON com gravações |
| `programas_emitidos` | rich_text | JSON com emissões directas |
| `pendencias` | rich_text | JSON com pendências |
| `recursos_humanos` | rich_text | JSON com dados de RH |
| `equipamentos` | rich_text | JSON com estado de equipamentos |
| `indicadores` | rich_text | JSON com KPIs da semana |
| `status` | text | `rascunho` ou `enviado` |

---

## 🚧 Funcionalidades Não Implementadas (Próximos Passos)

- [ ] **Exportação para PDF** — imprimir/descarregar relatório formatado
- [ ] **Exportação para Excel/CSV** — exportar dados tabelares
- [ ] **Envio por e-mail** — integração com serviço de e-mail
- [ ] **Autenticação de utilizadores** — login por colaborador
- [ ] **Notificações e lembretes** — alertas de relatórios em atraso
- [ ] **Edição de rascunhos** — retomar preenchimento de um rascunho guardado
- [ ] **Duplicar relatório** — usar um relatório anterior como modelo
- [ ] **Assinatura digital** — campo de validação/assinatura

---

## 🛠️ Tecnologias Utilizadas

- **HTML5, CSS3, JavaScript (ES6+)** — sem frameworks
- **Font Awesome 6** via CDN — ícones
- **Google Fonts (Inter)** — tipografia
- **RESTful Table API** — persistência de dados

---

## 📁 Estrutura de Ficheiros

```
index.html          — Ponto de entrada da aplicação
css/
  style.css         — Estilos completos da aplicação
js/
  app.js            — Toda a lógica do app (navegação, formulários, API)
README.md           — Documentação
```
