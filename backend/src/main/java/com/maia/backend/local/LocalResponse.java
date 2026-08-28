package com.maia.backend.local;

public class LocalResponse {

    private String id;
    private String nome;
    private String categoria;
    private double latitude;
    private double longitude;
    private String endereco;

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

    public String getId() {
        return id;
    }

    public String getNome() {
        return nome;
    }

    public String getCategoria() {
        return categoria;
    }

    public double getLatitude() {
        return latitude;
    }

    public double getLongitude() {
        return longitude;
    }

    public String getEndereco() {
        return endereco;
    }
}