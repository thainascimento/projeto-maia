package com.maia.backend.geocoding;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.maia.backend.local.LocalResponse;

@RestController
@RequestMapping("/geoapify-places")
public class GeoapifyPlacesController {

    private final GeoapifyPlacesService geoapifyPlacesService;

    public GeoapifyPlacesController(
            GeoapifyPlacesService geoapifyPlacesService
    ) {
        this.geoapifyPlacesService =
                geoapifyPlacesService;
    }

    @GetMapping("/proximos")
    public List<LocalResponse> buscarLocais(
            @RequestParam double lat,
            @RequestParam double lon,
            @RequestParam String categoria
    ) {

        return geoapifyPlacesService
                .buscarLocais(
                        lat,
                        lon,
                        categoria
                );
    }
}