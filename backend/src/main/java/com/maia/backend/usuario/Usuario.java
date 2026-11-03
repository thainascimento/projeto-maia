package com.maia.backend.usuario;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "usuarios")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String senha;

    private String telefone;

    @Column(name = "foto_uri")
    private String fotoUri;

    @Column(name = "contato_emergencia_nome")
    private String contatoEmergenciaNome;

    @Column(name = "contato_emergencia_telefone")
    private String contatoEmergenciaTelefone;

    @Column(name = "contato_emergencia_relacao")
    private String contatoEmergenciaRelacao;

    public Usuario() {
    }

    public Usuario(
            String nome,
            String email,
            String senha
    ) {
        this.nome = nome;
        this.email = email;
        this.senha = senha;
    }

    public Long getId() {
        return id;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getSenha() {
        return senha;
    }

    public void setSenha(String senha) {
        this.senha = senha;
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

    public String getFotoUri() {
        return fotoUri;
    }

    public void setFotoUri(String fotoUri) {
        this.fotoUri = fotoUri;
    }

}