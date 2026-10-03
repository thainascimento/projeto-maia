package com.maia.backend.local;

import java.util.ArrayList;
import java.util.List;

public class LocalResponse {

    private String id;
    private String nome;
    private String categoria;

    private double latitude;
    private double longitude;

    private String endereco;
    private String bairro;
    private String cidade;
    private String estado;
    private String pais;
    private String cep;

    private Double distanciaMetros;

    private List<String> categoriasGeoapify =
            new ArrayList<>();

    /*
     * Estes campos são opcionais.
     * Eles só serão preenchidos quando a fonte real devolver
     * esse dado. A maIA NÃO deve inventá-los.
     */
    private String site;
    private String telefone;
    private String horarioFuncionamento;

    private Boolean acessivelCadeirante;
    private Boolean possuiInternet;

    public LocalResponse() {
    }

    /*
     * Mantido para compatibilidade com o código anterior.
     */
    public LocalResponse(
            String id,
            String nome,
            String categoria,
            double latitude,
            double longitude,
            String endereco
    ) {
        this.id = id;
        this.nome = nome;
        this.categoria = categoria;
        this.latitude = latitude;
        this.longitude = longitude;
        this.endereco = endereco;
    }

    public LocalResponse(
            String id,
            String nome,
            String categoria,
            double latitude,
            double longitude,
            String endereco,
            String bairro,
            String cidade,
            String estado,
            String pais,
            String cep,
            Double distanciaMetros,
            List<String> categoriasGeoapify,
            String site,
            String telefone,
            String horarioFuncionamento,
            Boolean acessivelCadeirante,
            Boolean possuiInternet
    ) {
        this.id = id;
        this.nome = nome;
        this.categoria = categoria;
        this.latitude = latitude;
        this.longitude = longitude;
        this.endereco = endereco;
        this.bairro = bairro;
        this.cidade = cidade;
        this.estado = estado;
        this.pais = pais;
        this.cep = cep;
        this.distanciaMetros = distanciaMetros;
        this.categoriasGeoapify =
                categoriasGeoapify == null
                        ? new ArrayList<>()
                        : new ArrayList<>(categoriasGeoapify);
        this.site = site;
        this.telefone = telefone;
        this.horarioFuncionamento = horarioFuncionamento;
        this.acessivelCadeirante = acessivelCadeirante;
        this.possuiInternet = possuiInternet;
    }

    public String getId() {
        return id;
    }

    public void setId(
            String id
    ) {
        this.id = id;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(
            String nome
    ) {
        this.nome = nome;
    }

    public String getCategoria() {
        return categoria;
    }

    public void setCategoria(
            String categoria
    ) {
        this.categoria = categoria;
    }

    public double getLatitude() {
        return latitude;
    }

    public void setLatitude(
            double latitude
    ) {
        this.latitude = latitude;
    }

    public double getLongitude() {
        return longitude;
    }

    public void setLongitude(
            double longitude
    ) {
        this.longitude = longitude;
    }

    public String getEndereco() {
        return endereco;
    }

    public void setEndereco(
            String endereco
    ) {
        this.endereco = endereco;
    }

    public String getBairro() {
        return bairro;
    }

    public void setBairro(
            String bairro
    ) {
        this.bairro = bairro;
    }

    public String getCidade() {
        return cidade;
    }

    public void setCidade(
            String cidade
    ) {
        this.cidade = cidade;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(
            String estado
    ) {
        this.estado = estado;
    }

    public String getPais() {
        return pais;
    }

    public void setPais(
            String pais
    ) {
        this.pais = pais;
    }

    public String getCep() {
        return cep;
    }

    public void setCep(
            String cep
    ) {
        this.cep = cep;
    }

    public Double getDistanciaMetros() {
        return distanciaMetros;
    }

    public void setDistanciaMetros(
            Double distanciaMetros
    ) {
        this.distanciaMetros = distanciaMetros;
    }

    public List<String> getCategoriasGeoapify() {
        return categoriasGeoapify;
    }

    public void setCategoriasGeoapify(
            List<String> categoriasGeoapify
    ) {
        this.categoriasGeoapify =
                categoriasGeoapify == null
                        ? new ArrayList<>()
                        : new ArrayList<>(categoriasGeoapify);
    }

    public String getSite() {
        return site;
    }

    public void setSite(
            String site
    ) {
        this.site = site;
    }

    public String getTelefone() {
        return telefone;
    }

    public void setTelefone(
            String telefone
    ) {
        this.telefone = telefone;
    }

    public String getHorarioFuncionamento() {
        return horarioFuncionamento;
    }

    public void setHorarioFuncionamento(
            String horarioFuncionamento
    ) {
        this.horarioFuncionamento =
                horarioFuncionamento;
    }

    public Boolean getAcessivelCadeirante() {
        return acessivelCadeirante;
    }

    public void setAcessivelCadeirante(
            Boolean acessivelCadeirante
    ) {
        this.acessivelCadeirante =
                acessivelCadeirante;
    }

    public Boolean getPossuiInternet() {
        return possuiInternet;
    }

    public void setPossuiInternet(
            Boolean possuiInternet
    ) {
        this.possuiInternet =
                possuiInternet;
    }
}
