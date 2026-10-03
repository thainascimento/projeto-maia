package com.maia.backend.geocoding;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/geocoding")
public class GeocodingController {

    private final GeoapifyService geoapifyService;

    public GeocodingController(
            GeoapifyService geoapifyService
    ) {
        this.geoapifyService = geoapifyService;
    }

    @GetMapping("/buscar")
    public GeocodingResponse buscar(
            @RequestParam String texto
    ) {
        return geoapifyService.buscarLocalizacao(
                texto
        );
    }

    @GetMapping("/sugestoes")
    public List<GeocodingSugestaoResponse> buscarSugestoes(
            @RequestParam String texto
    ) {
        return geoapifyService.buscarSugestoes(
                texto
        );
    }
}