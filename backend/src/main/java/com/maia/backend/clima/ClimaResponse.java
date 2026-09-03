package com.maia.backend.clima;

public record ClimaResponse(
        Double temperatura,
        Double sensacaoTermica,
        Double temperaturaMaxima,
        Double temperaturaMinima,
        Integer probabilidadeChuva,
        Double vento,
        Double rajadas,
        Double neve,
        Integer codigoClima,
        Integer isDay
) {
}