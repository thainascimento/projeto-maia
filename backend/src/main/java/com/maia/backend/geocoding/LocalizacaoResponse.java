package com.maia.backend.geocoding;

public record LocalizacaoResponse(
        String cidade,
        String estado,
        String pais,
        String enderecoFormatado,
        double latitude,
        double longitude
) {
}