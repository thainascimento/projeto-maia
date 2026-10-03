package com.maia.backend.geocoding;

public record GeocodingSugestaoResponse(
        String nome,
        String cidade,
        String estado,
        String pais,
        Double latitude,
        Double longitude
) {
}