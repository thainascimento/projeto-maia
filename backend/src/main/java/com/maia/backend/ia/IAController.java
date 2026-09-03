package com.maia.backend.ia;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/ia")
public class IAController {

    private final GroqService groqService;

    public IAController(
            GroqService groqService
    ) {
        this.groqService = groqService;
    }

    @GetMapping("/teste")
    public ResponseEntity<?> testarIA() {

        try {

            String resposta =
                    groqService.testarConexao();

            return ResponseEntity.ok(
                    resposta
            );

        } catch (IllegalStateException e) {

            return ResponseEntity
                    .internalServerError()
                    .body(e.getMessage());
        }
    }
}