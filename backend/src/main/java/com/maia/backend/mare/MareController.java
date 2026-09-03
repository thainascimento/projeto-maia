package com.maia.backend.mare;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/mare")
public class MareController {

    private final MareService mareService;

    public MareController(
            MareService mareService
    ) {
        this.mareService =
                mareService;
    }

    @GetMapping
    public MareResponse buscarMare(
            @RequestParam double lat,
            @RequestParam double lon
    ) {

        return mareService
                .buscarMare(
                        lat,
                        lon
                );
    }
}