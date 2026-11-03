package com.maia.backend.usuario;

public class AtualizarPerfilRequest {
    private String nome;
    private String email;
    private String senhaAtual;
    private String telefone;
    private String contatoEmergenciaNome;
    private String contatoEmergenciaTelefone;
    private String contatoEmergenciaRelacao;

    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getSenhaAtual() { return senhaAtual; }
    public void setSenhaAtual(String senhaAtual) { this.senhaAtual = senhaAtual; }
    public String getTelefone() { return telefone; }
    public void setTelefone(String telefone) { this.telefone = telefone; }
    public String getContatoEmergenciaNome() { return contatoEmergenciaNome; }
    public void setContatoEmergenciaNome(String contatoEmergenciaNome) { this.contatoEmergenciaNome = contatoEmergenciaNome; }
    public String getContatoEmergenciaTelefone() { return contatoEmergenciaTelefone; }
    public void setContatoEmergenciaTelefone(String contatoEmergenciaTelefone) { this.contatoEmergenciaTelefone = contatoEmergenciaTelefone; }
    public String getContatoEmergenciaRelacao() { return contatoEmergenciaRelacao; }
    public void setContatoEmergenciaRelacao(String contatoEmergenciaRelacao) { this.contatoEmergenciaRelacao = contatoEmergenciaRelacao; }
}
