package com.maia.backend.viagem;

import java.time.LocalDate;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;

@Entity
@Table(name = "viagens")
public class Viagem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long usuarioId;

    @Column(nullable = false)
    private String destino;

    private String cidade;

    private String estado;

    private String pais;

    private Double latitude;

    private Double longitude;

    @Column(nullable = false)
    private LocalDate dataInicio;

    @Column(nullable = false)
    private LocalDate dataFim;

    @Column(nullable = false)
    private boolean cancelada = false;

    @Column(nullable = false)
    private LocalDateTime criadaEm;

    @Column(nullable = false)
    private boolean avaliada = false;

    public Viagem() {
    }

    @PrePersist
    public void antesDeSalvar() {

        if (criadaEm == null) {
            criadaEm =
                    LocalDateTime.now();
        }
    }

    @Transient
    public StatusViagem getStatus() {

        if (cancelada) {
            return StatusViagem.CANCELADA;
        }

        LocalDate hoje =
                LocalDate.now();

        if (hoje.isBefore(dataInicio)) {
            return StatusViagem.PLANEJADA;
        }

        if (
                !hoje.isBefore(dataInicio)
                &&
                !hoje.isAfter(dataFim)
        ) {
            return StatusViagem.EM_ANDAMENTO;
        }

        return StatusViagem.FINALIZADA;
    }

    public Long getId() {
        return id;
    }

    public void setId(
            Long id
    ) {
        this.id = id;
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

    public String getDestino() {
        return destino;
    }

    public void setDestino(
            String destino
    ) {
        this.destino =
                destino;
    }

    public String getCidade() {
        return cidade;
    }

    public void setCidade(
            String cidade
    ) {
        this.cidade =
                cidade;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(
            String estado
    ) {
        this.estado =
                estado;
    }

    public String getPais() {
        return pais;
    }

    public void setPais(
            String pais
    ) {
        this.pais =
                pais;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(
            Double latitude
    ) {
        this.latitude =
                latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(
            Double longitude
    ) {
        this.longitude =
                longitude;
    }

    public LocalDate getDataInicio() {
        return dataInicio;
    }

    public void setDataInicio(
            LocalDate dataInicio
    ) {
        this.dataInicio =
                dataInicio;
    }

    public LocalDate getDataFim() {
        return dataFim;
    }

    public void setDataFim(
            LocalDate dataFim
    ) {
        this.dataFim =
                dataFim;
    }

    public boolean isCancelada() {
        return cancelada;
    }

    public void setCancelada(
            boolean cancelada
    ) {
        this.cancelada =
                cancelada;
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

    public boolean isAvaliada() {
        return avaliada;
    }

    public void setAvaliada(
            boolean avaliada
    ) {
        this.avaliada =
                avaliada;
    }
}