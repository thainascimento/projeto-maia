package com.maia.backend.avaliacaoviagem;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "avaliacoes_viagens")
public class AvaliacaoViagem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long viagemId;

    @Column(nullable = false)
    private Long usuarioId;

    @Column(nullable = false)
    private Integer notaGeral;

    @Column(nullable = false)
    private Integer seguranca;

    private Boolean viajariaSozinhaNovamente;

    private Integer facilidadeLocomocao;

    private String experienciaNoturna;

    private Integer estruturaTuristica;

    private Boolean recomendariaParaMulherSozinha;

    private String melhorRegiaoHospedagem;

    @Column(length = 2000)
    private String pontosPositivos;

    @Column(length = 2000)
    private String pontosAtencao;

    private Boolean sentiuInsegura;

    @Column(length = 2000)
    private String relatoInseguranca;

    @Column(length = 3000)
    private String comentario;

    @Column(nullable = false)
    private LocalDateTime criadaEm;

    public AvaliacaoViagem() {
    }

    @PrePersist
    public void antesDeSalvar() {

        if (criadaEm == null) {
            criadaEm =
                    LocalDateTime.now();
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(
            Long id
    ) {
        this.id = id;
    }

    public Long getViagemId() {
        return viagemId;
    }

    public void setViagemId(
            Long viagemId
    ) {
        this.viagemId =
                viagemId;
    }

    public Long getUsuarioId() {
        return usuarioId;
    }

    public void setUsuarioId(
            Long usuarioId
    ) {
        this.usuarioId =
                usuarioId;
    }

    public Integer getNotaGeral() {
        return notaGeral;
    }

    public void setNotaGeral(
            Integer notaGeral
    ) {
        this.notaGeral =
                notaGeral;
    }

    public Integer getSeguranca() {
        return seguranca;
    }

    public void setSeguranca(
            Integer seguranca
    ) {
        this.seguranca =
                seguranca;
    }

    public Boolean getViajariaSozinhaNovamente() {
        return viajariaSozinhaNovamente;
    }

    public void setViajariaSozinhaNovamente(
            Boolean viajariaSozinhaNovamente
    ) {
        this.viajariaSozinhaNovamente =
                viajariaSozinhaNovamente;
    }

    public Integer getFacilidadeLocomocao() {
        return facilidadeLocomocao;
    }

    public void setFacilidadeLocomocao(
            Integer facilidadeLocomocao
    ) {
        this.facilidadeLocomocao =
                facilidadeLocomocao;
    }

    public String getExperienciaNoturna() {
        return experienciaNoturna;
    }

    public void setExperienciaNoturna(
            String experienciaNoturna
    ) {
        this.experienciaNoturna =
                experienciaNoturna;
    }

    public Integer getEstruturaTuristica() {
        return estruturaTuristica;
    }

    public void setEstruturaTuristica(
            Integer estruturaTuristica
    ) {
        this.estruturaTuristica =
                estruturaTuristica;
    }

    public Boolean getRecomendariaParaMulherSozinha() {
        return recomendariaParaMulherSozinha;
    }

    public void setRecomendariaParaMulherSozinha(
            Boolean recomendariaParaMulherSozinha
    ) {
        this.recomendariaParaMulherSozinha =
                recomendariaParaMulherSozinha;
    }

    public String getMelhorRegiaoHospedagem() {
        return melhorRegiaoHospedagem;
    }

    public void setMelhorRegiaoHospedagem(
            String melhorRegiaoHospedagem
    ) {
        this.melhorRegiaoHospedagem =
                melhorRegiaoHospedagem;
    }

    public String getPontosPositivos() {
        return pontosPositivos;
    }

    public void setPontosPositivos(
            String pontosPositivos
    ) {
        this.pontosPositivos =
                pontosPositivos;
    }

    public String getPontosAtencao() {
        return pontosAtencao;
    }

    public void setPontosAtencao(
            String pontosAtencao
    ) {
        this.pontosAtencao =
                pontosAtencao;
    }

    public Boolean getSentiuInsegura() {
        return sentiuInsegura;
    }

    public void setSentiuInsegura(
            Boolean sentiuInsegura
    ) {
        this.sentiuInsegura =
                sentiuInsegura;
    }

    public String getRelatoInseguranca() {
        return relatoInseguranca;
    }

    public void setRelatoInseguranca(
            String relatoInseguranca
    ) {
        this.relatoInseguranca =
                relatoInseguranca;
    }

    public String getComentario() {
        return comentario;
    }

    public void setComentario(
            String comentario
    ) {
        this.comentario =
                comentario;
    }

    public LocalDateTime getCriadaEm() {
        return criadaEm;
    }

    public void setCriadaEm(
            LocalDateTime criadaEm
    ) {
        this.criadaEm =
                criadaEm;
    }
}