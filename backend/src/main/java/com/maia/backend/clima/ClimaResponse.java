package com.maia.backend.clima;

import java.util.List;

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
        Integer isDay,
        String timezone,
        Integer utcOffsetSegundos,
        String dataHoraLocal,
        String periodoDoDia,
        List<PrevisaoHora> previsaoProximasHoras

) {

    public record PrevisaoHora(
            String dataHoraLocal,
            Double temperatura,
            Double sensacaoTermica,
            Integer probabilidadeChuva,
            Double vento,
            Double rajadas,
            Integer codigoClima
    ) {
    }
}
