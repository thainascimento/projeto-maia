package com.maia.backend.planejamento.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)

public class DestinoRecomendado {

    private String cidade;

    private String estadoOuRegiao;

    private String pais;

    private String resumo;

    private String porQueCombina;

    private Integer compatibilidade;

    private String seguranca;

    private String mobilidade;

    private String clima;

    private String melhorRegiaoParaFicar;

    private List<String> caracteristicasRelevantes;

    private List<String> pontosPositivos;

    private List<String> pontosDeAtencao;

    public DestinoRecomendado() {
    }

    public Long getId() {
        return null;
    }

    public String getCidade() {
        return cidade;
    }

    public void setCidade(String cidade) {
        this.cidade = cidade;
    }

    public String getEstadoOuRegiao() {
        return estadoOuRegiao;
    }

    public void setEstadoOuRegiao(
            String estadoOuRegiao
    ) {
        this.estadoOuRegiao =
                estadoOuRegiao;
    }

    public String getPais() {
        return pais;
    }

    public void setPais(String pais) {
        this.pais = pais;
    }

    public String getResumo() {
        return resumo;
    }

    public void setResumo(String resumo) {
        this.resumo = resumo;
    }

    public String getPorQueCombina() {
        return porQueCombina;
    }

    public void setPorQueCombina(
            String porQueCombina
    ) {
        this.porQueCombina =
                porQueCombina;
    }

    public Integer getCompatibilidade() {
        return compatibilidade;
    }

    public void setCompatibilidade(
            Integer compatibilidade
    ) {
        this.compatibilidade =
                compatibilidade;
    }

    public String getSeguranca() {
        return seguranca;
    }

    public void setSeguranca(
            String seguranca
    ) {
        this.seguranca = seguranca;
    }

    public String getMobilidade() {
        return mobilidade;
    }

    public void setMobilidade(
            String mobilidade
    ) {
        this.mobilidade = mobilidade;
    }

    public String getClima() {
        return clima;
    }

    public void setClima(String clima) {
        this.clima = clima;
    }

    public String getMelhorRegiaoParaFicar() {
        return melhorRegiaoParaFicar;
    }

    public void setMelhorRegiaoParaFicar(
            String melhorRegiaoParaFicar
    ) {
        this.melhorRegiaoParaFicar =
                melhorRegiaoParaFicar;
    }

    public List<String> getCaracteristicasRelevantes() {
        return caracteristicasRelevantes;
    }

    public void setCaracteristicasRelevantes(
            List<String> caracteristicasRelevantes
    ) {
        this.caracteristicasRelevantes =
                caracteristicasRelevantes;
    }

    public List<String> getPontosPositivos() {
        return pontosPositivos;
    }

    public void setPontosPositivos(
            List<String> pontosPositivos
    ) {
        this.pontosPositivos =
                pontosPositivos;
    }

    public List<String> getPontosDeAtencao() {
        return pontosDeAtencao;
    }

    public void setPontosDeAtencao(
            List<String> pontosDeAtencao
    ) {
        this.pontosDeAtencao =
                pontosDeAtencao;
    }
}