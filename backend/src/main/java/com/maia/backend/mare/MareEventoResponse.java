package com.maia.backend.mare;

public record MareEventoResponse(
        String tipo,
        String dataHora,
        Double altura
) {
}
