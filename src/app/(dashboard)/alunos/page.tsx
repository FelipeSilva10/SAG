"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Trash2, Users, UserPlus } from "lucide-react";
import { useAlunos } from "@/hooks/useAlunos";
import { useEscolas } from "@/hooks/useEscolas";
import { useSessionStore } from "@/store/session";
import {
  Badge,
  Button,
  Input,
  Select,
  SidePanel,
  PageHeader,
  Table,
  type Column,
  EmptyState,
  useConfirmDialog,
} from "@/components/ui";
import type { Aluno, Turma } from "@/lib/types";
import toast from "react-hot-toast";

type FormMode = "new" | "edit" | "lote";

export default function AlunosPage() {
  const { alunos, loading, criar, atualizar, excluir, fetchAlunos } = useAlunos();
  const { escolas } = useEscolas();
  const { isAdmin } = useSessionStore();
  const confirm = useConfirmDialog();
  const admin = isAdmin();

  const [busca, setBusca] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("new");
  const [editTarget, setEditTarget] = useState<Aluno | null>(null);

  // Estados dos Selects
  const [turmasDisponiveis, setTurmasDisponiveis] = useState<Turma[]>([]);
  const [escolaIdForm, setEscolaIdForm] = useState("");

  // Estados Form Individual
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [turmaIdForm, setTurmaIdForm] = useState("");

  // Estados Form Lote
  const [nomesLote, setNomesLote] = useState("");
  const [previewLote, setPreviewLote] = useState<{ nome: string; email: string; conflito: boolean }[]>([]);
  const [saving, setSaving] = useState(false);

  // Busca turmas quando a escola selecionada no form muda
  useEffect(() => {
    if (escolaIdForm) {
      fetch(`/api/turmas?escolaId=${escolaIdForm}`)
        .then(res => res.json())
        .then(setTurmasDisponiveis)
        .catch(console.error);
    } else {
      setTurmasDisponiveis([]);
      setTurmaIdForm("");
    }
  }, [escolaIdForm]);

  const alunosFiltrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return alunos;
    return alunos.filter(a =>
      a.nome.toLowerCase().includes(t) ||
      (a.email && a.email.toLowerCase().includes(t)) ||
      a.escolaNome.toLowerCase().includes(t) ||
      a.turmaNome.toLowerCase().includes(t)
    );
  }, [alunos, busca]);

  function abrirNovo() {
    setFormMode("new");
    setEditTarget(null);
    setNome(""); setEmail(""); setSenha("");
    setEscolaIdForm(""); setTurmaIdForm("");
    setPanelOpen(true);
  }

  function abrirDetalhe(aluno: Aluno) {
    setFormMode("edit");
    setEditTarget(aluno);
    setNome(aluno.nome);
    setEmail(aluno.email);
    // A API nunca devolve a senha. Campo vazio na edição mantém a atual.
    setSenha("");

    // Auto-seleciona escola baseada no aluno para carregar turmas
    const escolaMatch = escolas.find(e => e.nome === aluno.escolaNome);
    if (escolaMatch) {
      setEscolaIdForm(escolaMatch.id);
      setTimeout(() => setTurmaIdForm(aluno.turmaId), 200); // Espera as turmas carregarem
    }
    setPanelOpen(true);
  }

  function abrirLote() {
    setFormMode("lote");
    setNomesLote("");
    setSenha("");
    setEscolaIdForm("");
    setTurmaIdForm("");
    setPreviewLote([]);
    setPanelOpen(true);
  }

  async function handleSalvarIndividual() {
    if (!nome || !email || (formMode === "new" && !senha) || !turmaIdForm) {
      toast.error(formMode === "new" ? "Preencha os dados, a senha inicial e selecione a turma." : "Preencha os dados e selecione a turma.");
      return;
    }
    if (senha && senha.length < 6) return toast.error("Senha mínima de 6 caracteres.");

    setSaving(true);
    try {
      if (formMode === "new") {
        await criar({ nome, email, senha, turmaId: turmaIdForm });
        toast.success("Aluno cadastrado com sucesso!");
      } else if (editTarget) {
        await atualizar(editTarget.id, { nome, email, senha, turmaId: turmaIdForm });
        toast.success("Aluno atualizado!");
      }
      setPanelOpen(false);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleExcluir(aluno: Aluno) {
    const ok = await confirm({
      title: "Excluir aluno",
      description: `Excluir o aluno "${aluno.nome}"?`,
      confirmLabel: "Excluir",
      danger: true,
    });
    if (!ok) return;
    try {
      await excluir(aluno.id);
      toast.success("Aluno removido.");
      if (editTarget?.id === aluno.id) setPanelOpen(false);
    } catch {
      toast.error("Erro ao excluir aluno.");
    }
  }

  // --- Lógica do Cadastro em Lote (Equivalente ao Java) ---
  function gerarPreviewLote() {
    if (!nomesLote.trim()) return toast.error("Cole pelo menos um nome.");

    const emailsExistentes = new Set(alunos.map(a => a.email.toLowerCase()));
    const emailsNoLote = new Set<string>();
    const gerados: { nome: string; email: string; conflito: boolean }[] = [];

    const linhas = nomesLote.split("\n").map(l => l.trim()).filter(l => l.length > 0);

    for (const nomeAluno of linhas) {
      // Normaliza: remove acentos e espaços
      const base = nomeAluno.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
      let emailFinal = `${base}@sag.com`;
      let sufixo = 2;

      while (emailsExistentes.has(emailFinal) || emailsNoLote.has(emailFinal)) {
        emailFinal = `${base}${sufixo}@sag.com`;
        sufixo++;
      }

      emailsNoLote.add(emailFinal);
      gerados.push({
        nome: nomeAluno,
        email: emailFinal,
        conflito: emailsExistentes.has(emailFinal), // Fica vermelho se bater com o banco
      });
    }
    setPreviewLote(gerados);
  }

  async function handleSalvarLote() {
    if (previewLote.length === 0) return toast.error("Gere o preview primeiro.");
    if (!turmaIdForm) return toast.error("Selecione a turma de destino.");
    if (senha.length < 6) return toast.error("Senha padrão deve ter mín. 6 caracteres.");

    const ok = await confirm({
      title: "Cadastrar alunos em lote",
      description: `Cadastrar ${previewLote.length} alunos na turma selecionada?`,
      confirmLabel: "Cadastrar",
    });
    if (!ok) return;

    setSaving(true);
    let sucesso = 0;
    let erros = 0;

    // Cadastra um por um (como as Threads do Java)
    for (const al of previewLote) {
      try {
        await criar({ nome: al.nome, email: al.email, senha, turmaId: turmaIdForm });
        sucesso++;
      } catch {
        erros++;
      }
    }

    setSaving(false);
    setPanelOpen(false);
    fetchAlunos();

    if (erros === 0) toast.success(`${sucesso} alunos cadastrados com sucesso!`);
    else toast.error(`${sucesso} cadastrados, ${erros} falhas. Verifique duplicatas.`);
  }

  const columns: Column<Aluno>[] = [
    {
      key: "nome",
      header: "Nome",
      render: (a) => <span className="font-semibold text-[#1f2d3a]">{a.nome}</span>,
    },
    { key: "email", header: "E-mail" },
    ...(admin
      ? [
          {
            key: "situacao",
            header: "Situação",
            render: (a: Aluno) => (
              <Badge variant={a.accessStatus === "ATIVO" ? "green" : "red"} dot>
                {a.mustChangeSenha ? "Troca pendente" : a.accessStatus === "ATIVO" ? "Acesso ativo" : "Acesso suspenso"}
              </Badge>
            ),
          },
        ]
      : []),
    { key: "escolaNome", header: "Escola" },
    { key: "turmaNome", header: "Turma" },
    ...(admin
      ? [
          {
            key: "acoes",
            header: "",
            width: "w-16",
            render: (a: Aluno) => (
              <div onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => handleExcluir(a)}
                  className="rounded p-1.5 text-[#8ea0b0] transition hover:bg-red-50 hover:text-red-600"
                  aria-label="Excluir aluno"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col overflow-hidden">
        <PageHeader
          title="Alunos"
          searchValue={busca}
          onSearchChange={setBusca}
          searchPlaceholder="Buscar aluno, escola…"
          actions={
            admin && (
              <>
                <Button onClick={abrirNovo} size="md">
                  <Plus size={14} /> Novo Aluno
                </Button>
                <Button onClick={abrirLote} size="md" variant="purple">
                  <UserPlus size={14} /> Lote
                </Button>
              </>
            )
          }
        />

        <div className="flex-1 overflow-auto p-4 sm:p-6">
          {alunosFiltrados.length === 0 && !loading ? (
            <EmptyState icon={<Users size={22} />} title="Nenhum aluno encontrado" />
          ) : (
            <Table<Aluno>
              columns={columns}
              data={alunosFiltrados}
              rowKey={(a) => a.id}
              loading={loading}
              onRowClick={abrirDetalhe}
              pageSize={20}
            />
          )}
        </div>
      </div>

      {/* Painel Lateral */}
      <SidePanel
        title={formMode === "lote" ? "Cadastro em Lote" : formMode === "new" ? "Novo Aluno" : "Detalhes do Aluno"}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
      >
        {formMode === "lote" ? (
          // --- FORMULÁRIO DE LOTE ---
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-[#45566a]">Nomes (um por linha)</label>
              <textarea
                value={nomesLote}
                onChange={(e) => setNomesLote(e.target.value)}
                className="h-32 w-full rounded border border-[#d4e1e9] p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#23638c]/20"
                placeholder={"Ex:\nAna Laura\nJoão Silva"}
              />
            </div>

            <Select label="Escola" value={escolaIdForm} onChange={(e) => setEscolaIdForm(e.target.value)}
              options={[{value:"", label:"Selecione a escola..."}, ...escolas.map(e => ({ value: e.id, label: e.nome }))]}
            />
            <Select label="Turma" value={turmaIdForm} onChange={(e) => setTurmaIdForm(e.target.value)} disabled={turmasDisponiveis.length === 0}
              options={[{value:"", label:"Selecione a turma..."}, ...turmasDisponiveis.map(t => ({ value: t.id, label: t.nome }))]}
            />

            <Input label="Senha padrão para todos" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Min. 6 caracteres" />

            <Button onClick={gerarPreviewLote} variant="secondary" className="w-full justify-center">Pré-visualizar E-mails</Button>

            {previewLote.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-lg border border-[#e3ebf1]">
                <div className="max-h-48 overflow-y-auto bg-[#f3f7fa] text-xs">
                  {previewLote.map((p, i) => (
                    <div key={i} className={`flex justify-between border-b border-[#e3ebf1] p-2 ${p.conflito ? "bg-red-50 text-red-700" : "text-[#45566a]"}`}>
                      <span className="truncate font-semibold">{p.nome}</span>
                      <span>{p.email}</span>
                    </div>
                  ))}
                </div>
                <Button onClick={handleSalvarLote} loading={saving} variant="success" className="w-full justify-center rounded-none">
                  ✓ Cadastrar Todos
                </Button>
              </div>
            )}
          </div>
        ) : (
          // --- FORMULÁRIO INDIVIDUAL ---
          <div className="space-y-4">
            <Input label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} disabled={!admin} />
            <Input label="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!admin || formMode === "edit"} />

            {admin && (
              <Input label={formMode === "new" ? "Senha inicial" : "Nova senha (opcional)"} type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder={formMode === "new" ? "Mínimo de 6 caracteres" : "Deixe em branco para manter"} />
            )}

            <div className="border-t border-[#e3ebf1] pt-2">
              <Select label="Escola" value={escolaIdForm} onChange={(e) => setEscolaIdForm(e.target.value)} disabled={!admin}
                options={[{value:"", label:"Selecione a escola..."}, ...escolas.map(e => ({ value: e.id, label: e.nome }))]}
              />
              <Select label="Turma" value={turmaIdForm} onChange={(e) => setTurmaIdForm(e.target.value)} disabled={!admin || turmasDisponiveis.length === 0}
                options={[{value:"", label:"Selecione a turma..."}, ...turmasDisponiveis.map(t => ({ value: t.id, label: t.nome }))]}
              />
            </div>

            {admin && (
              <div className="pt-4">
                <Button onClick={handleSalvarIndividual} loading={saving} className="w-full justify-center">
                  {formMode === "new" ? "Cadastrar Aluno" : "Salvar Alterações"}
                </Button>
              </div>
            )}
          </div>
        )}
      </SidePanel>
    </div>
  );
}
