package com.maia.backend.avaliacao;

import java.time.LocalDateTime;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "avaliacoes")
public class Avaliacao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long visitaId;

    private Integer notaGeral;

    private Integer seguranca;

    private Boolean voltaria;

    private Boolean iriaSozinha;

    private String comentario;

    private LocalDateTime criadaEm;

    public Avaliacao() {
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

    public Boolean getVoltaria() {
        return voltaria;
    }

    public void setVoltaria(Boolean voltaria) {
        this.voltaria = voltaria;
    }

    public Boolean getIriaSozinha() {
        return iriaSozinha;
    }

    public void setIriaSozinha(Boolean iriaSozinha) {
        this.iriaSozinha = iriaSozinha;
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