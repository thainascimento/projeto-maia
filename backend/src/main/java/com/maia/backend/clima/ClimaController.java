package com.maia.backend.clima;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/clima")
public class ClimaController {

    private final ClimaService climaService;

    public ClimaController(
            ClimaService climaService
    ) {
        this.climaService =
                climaService;
    }

    @GetMapping
    public ClimaResponse buscarClima(
            @RequestParam double lat,
            @RequestParam double lon
    ) {

        return climaService
                .buscarClima(
                        lat,
                        lon
                );
    }
}