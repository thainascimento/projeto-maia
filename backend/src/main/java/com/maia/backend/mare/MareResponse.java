package com.maia.backend.mare;

import java.util.List;

public record MareResponse(

        boolean disponivel,

        Double latitude,
        Double longitude,

        String estacao,
        String datum,

        MareEventoResponse proximaMareBaixa,
        MareEventoResponse proximaMareAlta,

        List<MareEventoResponse> eventos

) {

    public static MareResponse indisponivel() {
        return new MareResponse(
                false,
                null,
                null,
                null,
                null,
                null,
                null,
                List.of()
        );
    }

    public static MareResponse disponivel(
            Double latitude,
            Double longitude,
            String estacao,
            String datum,
            MareEventoResponse proximaMareBaixa,
            MareEventoResponse proximaMareAlta,
            List<MareEventoResponse> eventos
    ) {
        return new MareResponse(
                true,
                latitude,
                longitude,
                estacao,
                datum,
                proximaMareBaixa,
                proximaMareAlta,
                eventos == null ? List.of() : eventos
        );
    }
}