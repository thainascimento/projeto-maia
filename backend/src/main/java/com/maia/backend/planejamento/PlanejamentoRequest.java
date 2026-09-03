package com.maia.backend.planejamento;

import java.util.List;

public class PlanejamentoRequest {

    private Long usuarioId;

    private String origem;

    private String destino;

    private String periodo;

    private String orcamento;

    private String ritmoDestino;

    private String mobilidade;

    private List<String> interesses;

    private List<String> prioridades;

    private String observacoes;

    private String requisitosIndispensaveis;

    public PlanejamentoRequest() {
    }

    public Long getUsuarioId() {
        return usuarioId;
    }

    public void setUsuarioId(Long usuarioId) {
        this.usuarioId = usuarioId;
    }

    public String getOrigem() {
        return origem;
    }

    public void setOrigem(String origem) {
        this.origem = origem;
    }

    public String getDestino() {
        return destino;
    }

    public void setDestino(String destino) {
        this.destino = destino;
    }

    public String getPeriodo() {
        return periodo;
    }

    public void setPeriodo(String periodo) {
        this.periodo = periodo;
    }

    public String getOrcamento() {
        return orcamento;
    }

    public void setOrcamento(String orcamento) {
        this.orcamento = orcamento;
    }

    public String getRitmoDestino() {
        return ritmoDestino;
    }

    public void setRitmoDestino(String ritmoDestino) {
        this.ritmoDestino = ritmoDestino;
    }

    public String getMobilidade() {
        return mobilidade;
    }

    public void setMobilidade(String mobilidade) {
        this.mobilidade = mobilidade;
    }

    public List<String> getInteresses() {
        return interesses;
    }

    public void setInteresses(List<String> interesses) {
        this.interesses = interesses;
    }

    public List<String> getPrioridades() {
        return prioridades;
    }

    public void setPrioridades(List<String> prioridades) {
        this.prioridades = prioridades;
    }

    public String getObservacoes() {
        return observacoes;
    }

    public void setObservacoes(String observacoes) {
        this.observacoes = observacoes;
    }

    public String getRequisitosIndispensaveis() {
        return requisitosIndispensaveis;
    }

    public void setRequisitosIndispensaveis(
            String requisitosIndispensaveis
    ) {
        this.requisitosIndispensaveis =
                requisitosIndispensaveis;
    }
}