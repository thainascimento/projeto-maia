package com.maia.backend.geocoding;

public record GeocodingResponse(
        String nome,
        Double latitude,
        Double longitude
) {
}