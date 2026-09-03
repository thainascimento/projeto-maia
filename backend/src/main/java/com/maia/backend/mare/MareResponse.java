package com.maia.backend.mare;

import java.util.List;

public record MareResponse(
        Double latitude,
        Double longitude,
        String estacao,
        String datum,
        MareEventoResponse proximaMareBaixa,
        MareEventoResponse proximaMareAlta,
        List<MareEventoResponse> eventos
) {
}