package com.maia.backend.usuario;

public class AtualizarPerfilRequest {

    private String nome;

    private String telefone;

    private String contatoEmergenciaNome;

    private String contatoEmergenciaTelefone;

    private String contatoEmergenciaRelacao;

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getTelefone() {
        return telefone;
    }

    public void setTelefone(String telefone) {
        this.telefone = telefone;
    }

    public String getContatoEmergenciaNome() {
        return contatoEmergenciaNome;
    }

    public void setContatoEmergenciaNome(
            String contatoEmergenciaNome
    ) {
        this.contatoEmergenciaNome =
                contatoEmergenciaNome;
    }

    public String getContatoEmergenciaTelefone() {
        return contatoEmergenciaTelefone;
    }

    public void setContatoEmergenciaTelefone(
            String contatoEmergenciaTelefone
    ) {
        this.contatoEmergenciaTelefone =
                contatoEmergenciaTelefone;
    }

    public String getContatoEmergenciaRelacao() {
        return contatoEmergenciaRelacao;
    }

    public void setContatoEmergenciaRelacao(
            String contatoEmergenciaRelacao
    ) {
        this.contatoEmergenciaRelacao =
                contatoEmergenciaRelacao;
    }
}