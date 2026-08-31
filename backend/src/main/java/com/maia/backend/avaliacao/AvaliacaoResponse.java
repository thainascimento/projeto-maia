package com.maia.backend.avaliacao;

import java.time.LocalDateTime;

public class AvaliacaoResponse {

    private Long id;
    private Long visitaId;
    private Long usuarioId;

    private String nomeLocal;
    private String categoria;
    private String endereco;

    private Integer notaGeral;
    private Integer seguranca;
    private Boolean iriaSozinha;
    private String percepcaoEntorno;
    private String comentario;
    private LocalDateTime criadaEm;

    public AvaliacaoResponse() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getVisitaId() {
        return visitaId;
    }

    public void setVisitaId(Long visitaId) {
        this.visitaId = visitaId;
    }

    public Long getUsuarioId() {
        return usuarioId;
    }

    public void setUsuarioId(Long usuarioId) {
        this.usuarioId = usuarioId;
    }

    public String getNomeLocal() {
        return nomeLocal;
    }

    public void setNomeLocal(String nomeLocal) {
        this.nomeLocal = nomeLocal;
    }

    public String getCategoria() {
        return categoria;
    }

    public void setCategoria(String categoria) {
        this.categoria = categoria;
    }

    public String getEndereco() {
        return endereco;
    }

    public void setEndereco(String endereco) {
        this.endereco = endereco;
    }

    public Integer getNotaGeral() {
        return notaGeral;
    }

    public void setNotaGeral(Integer notaGeral) {
        this.notaGeral = notaGeral;
    }

    public Integer getSeguranca() {
        return seguranca;
    }

    public void setSeguranca(Integer seguranca) {
        this.seguranca = seguranca;
    }

    public Boolean getIriaSozinha() {
        return iriaSozinha;
    }

    public void setIriaSozinha(Boolean iriaSozinha) {
        this.iriaSozinha = iriaSozinha;
    }

    public String getPercepcaoEntorno() {
        return percepcaoEntorno;
    }

    public void setPercepcaoEntorno(String percepcaoEntorno) {
        this.percepcaoEntorno = percepcaoEntorno;
    }

    public String getComentario() {
        return comentario;
    }

    public void setComentario(String comentario) {
        this.comentario = comentario;
    }

    public LocalDateTime getCriadaEm() {
        return criadaEm;
    }

    public void setCriadaEm(LocalDateTime criadaEm) {
        this.criadaEm = criadaEm;
    }
}