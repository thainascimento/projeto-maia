package com.maia.backend.planejamento.dto;

import java.util.List;

public class RecomendacaoResponse {

    private List<DestinoRecomendado> destinos;

    public RecomendacaoResponse() {
    }

    public List<DestinoRecomendado> getDestinos() {
        return destinos;
    }

    public void setDestinos(
            List<DestinoRecomendado> destinos
    ) {
        this.destinos = destinos;
    }
}