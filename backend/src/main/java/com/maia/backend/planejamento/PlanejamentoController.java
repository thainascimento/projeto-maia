package com.maia.backend.planejamento;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.maia.backend.ia.GroqService;
import com.maia.backend.planejamento.dto.RecomendacaoResponse;

@RestController
@RequestMapping("/planejamentos")
public class PlanejamentoController {

    private final GroqService groqService;

    public PlanejamentoController(
            GroqService groqService
    ) {
        this.groqService = groqService;
    }

    @PostMapping
    public ResponseEntity<?> receberPlanejamento(
            @RequestBody PlanejamentoRequest planejamento
    ) {

        if (planejamento.getUsuarioId() == null) {
            return ResponseEntity
                    .badRequest()
                    .body(
                            "Usuária não informada."
                    );
        }

        if (
                planejamento.getOrigem() == null ||
                planejamento.getOrigem().isBlank()
        ) {
            return ResponseEntity
                    .badRequest()
                    .body(
                            "Origem não informada."
                    );
        }

        if (
                planejamento.getPeriodo() == null ||
                planejamento.getPeriodo().isBlank()
        ) {
            return ResponseEntity
                    .badRequest()
                    .body(
                            "Período não informado."
                    );
        }

        if (
                planejamento.getInteresses() == null ||
                planejamento.getInteresses().isEmpty()
        ) {
            return ResponseEntity
                    .badRequest()
                    .body(
                            "Informe pelo menos um interesse."
                    );
        }

        if (
                planejamento.getPrioridades() == null ||
                planejamento.getPrioridades().isEmpty()
        ) {
            return ResponseEntity
                    .badRequest()
                    .body(
                            "Informe pelo menos uma prioridade."
                    );
        }

        try {

            RecomendacaoResponse recomendacoes =
                    groqService.recomendarDestinos(
                            planejamento
                    );

            return ResponseEntity.ok(
                    recomendacoes
            );

        } catch (IllegalStateException e) {

            return ResponseEntity
                    .internalServerError()
                    .body(
                            e.getMessage()
                    );
        }
    }
}