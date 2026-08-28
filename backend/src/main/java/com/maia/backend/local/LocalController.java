package com.maia.backend.local;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/locais")
public class LocalController {

    private final OpenStreetMapService openStreetMapService;

    public LocalController(
            OpenStreetMapService openStreetMapService
    ) {
        this.openStreetMapService = openStreetMapService;
    }

    @GetMapping("/proximos")
    public List<LocalResponse> buscarProximos(
            @RequestParam double lat,
            @RequestParam double lon,
            @RequestParam String categoria
    ) {

        return openStreetMapService.buscarLocais(
                lat,
                lon,
                categoria
        );
    }
}