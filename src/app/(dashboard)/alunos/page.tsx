"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, Plus, Trash2, Pencil, Users, UserPlus } from "lucide-react";
import { useAlunos } from "@/hooks/useAlunos";
import { useEscolas } from "@/hooks/useEscolas";
import { useSessionStore } from "@/store/session";
import { Button, Input, Select, SidePanel, Spinner } from "@/components/ui";
import type { Aluno, Turma } from "@/lib/types";
import toast from "react-hot-toast";

type FormMode = "new" | "edit" | "lote";

export default function AlunosPage() {
  const { alunos, loading, criar, atualizar, excluir, fetchAlunos } = useAlunos();
  const { escolas } = useEscolas();
  const { isAdmin } = useSessionStore();

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
    setSenha(aluno.senha || "");
    
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
    if (!nome || !email || !senha || !turmaIdForm) {
      toast.error("Preencha todos os campos e selecione a turma.");
      return;
    }
    if (senha.length < 6) return toast.error("Senha mínima de 6 caracteres.");

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
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleExcluir(aluno: Aluno) {
    if (!confirm(`Excluir o aluno "${aluno.nome}"?`)) return;
    try {
      await excluir(aluno.id);
      toast.success("Aluno removido.");
      if (editTarget?.id === aluno.id) setPanelOpen(false);
    } catch (err: any) {
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
        conflito: emailsExistentes.has(emailFinal) // Fica vermelho se bater com o banco
      });
    }
    setPreviewLote(gerados);
  }

  async function handleSalvarLote() {
    if (previewLote.length === 0) return toast.error("Gere o preview primeiro.");
    if (!turmaIdForm) return toast.error("Selecione a turma de destino.");
    if (senha.length < 6) return toast.error("Senha padrão deve ter mín. 6 caracteres.");

    if (!confirm(`Cadastrar ${previewLote.length} alunos na turma selecionada?`)) return;

    setSaving(true);
    let ok = 0;
    let erros = 0;

    // Cadastra um por um (como as Threads do Java)
    for (const al of previewLote) {
      try {
        await criar({ nome: al.nome, email: al.email, senha, turmaId: turmaIdForm });
        ok++;
      } catch (e) {
        erros++;
      }
    }

    setSaving(false);
    setPanelOpen(false);
    fetchAlunos();

    if (erros === 0) toast.success(`${ok} alunos cadastrados com sucesso!`);
    else toast.error(`${ok} cadastrados, ${erros} falhas. Verifique duplicatas.`);
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center gap-4 px-6 py-4 bg-white border-b border-gray-200">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Alunos</h1>
            {!isAdmin() && <p className="text-xs text-gray-400 mt-0.5">Exibindo apenas alunos das suas turmas</p>}
          </div>

          <div className="flex-1" />

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar aluno, escola..."
              className="pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-lg w-56 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          {isAdmin() && (
            <>
              <Button onClick={abrirNovo} size="md">
                <Plus size={14} /> Novo Aluno
              </Button>
              <Button onClick={abrirLote} size="md" variant="purple">
                <UserPlus size={14} /> Lote
              </Button>
            </>
          )}
        </div>

        {/* Tabela */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <Spinner />
          ) : alunosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
              <Users size={48} className="opacity-20 mb-2" />
              <p className="text-sm">Nenhum aluno encontrado.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">E-mail</th>
                  {isAdmin() && <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Senha</th>}
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Escola</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Turma</th>
                  {isAdmin() && <th className="px-4 py-3 w-24" />}
                </tr>
              </thead>
              <tbody>
                {alunosFiltrados.map((aluno) => (
                  <tr
                    key={aluno.id}
                    onClick={() => abrirDetalhe(aluno)}
                    className={`border-b border-gray-100 cursor-pointer transition hover:bg-blue-50 ${editTarget?.id === aluno.id ? "bg-blue-50" : ""}`}
                  >
                    <td className="px-6 py-3 font-medium text-gray-900">{aluno.nome}</td>
                    <td className="px-4 py-3 text-gray-600">{aluno.email}</td>
                    {isAdmin() && <td className="px-4 py-3 text-gray-500 font-mono text-xs">{aluno.senha}</td>}
                    <td className="px-4 py-3 text-gray-600">{aluno.escolaNome}</td>
                    <td className="px-4 py-3 text-gray-600">{aluno.turmaNome}</td>
                    {isAdmin() && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => handleExcluir(aluno)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
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
            <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg mb-4">
              Cole os nomes, um por linha. O e-mail será gerado automaticamente (ex: analaura@sag.com).
            </div>
            
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">Nomes (um por linha)</label>
              <textarea 
                value={nomesLote}
                onChange={(e) => setNomesLote(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-lg text-sm h-32 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Ex:&#10;Ana Laura&#10;João Silva"
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
              <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
                <div className="max-h-48 overflow-y-auto bg-gray-50 text-xs">
                  {previewLote.map((p, i) => (
                    <div key={i} className={`flex justify-between p-2 border-b border-gray-100 ${p.conflito ? "bg-red-50 text-red-700" : "text-gray-600"}`}>
                      <span className="font-medium truncate">{p.nome}</span>
                      <span>{p.email}</span>
                    </div>
                  ))}
                </div>
                <Button onClick={handleSalvarLote} loading={saving} className="w-full justify-center rounded-none bg-green-600 hover:bg-green-700">
                  ✓ Cadastrar Todos
                </Button>
              </div>
            )}
          </div>
        ) : (
          // --- FORMULÁRIO INDIVIDUAL ---
          <div className="space-y-4">
            <Input label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} disabled={!isAdmin()} />
            <Input label="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!isAdmin() || formMode === "edit"} />
            
            {isAdmin() && (
              <Input label="Senha" type="text" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Min. 6 caracteres" />
            )}

            <div className="pt-2 border-t border-gray-100">
              <Select label="Escola" value={escolaIdForm} onChange={(e) => setEscolaIdForm(e.target.value)} disabled={!isAdmin()}
                options={[{value:"", label:"Selecione a escola..."}, ...escolas.map(e => ({ value: e.id, label: e.nome }))]} 
              />
              <Select label="Turma" value={turmaIdForm} onChange={(e) => setTurmaIdForm(e.target.value)} disabled={!isAdmin() || turmasDisponiveis.length === 0}
                options={[{value:"", label:"Selecione a turma..."}, ...turmasDisponiveis.map(t => ({ value: t.id, label: t.nome }))]} 
              />
            </div>

            {isAdmin() && (
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