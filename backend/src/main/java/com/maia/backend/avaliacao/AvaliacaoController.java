package com.maia.backend.avaliacao;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/avaliacoes")
public class AvaliacaoController {

    private final AvaliacaoService avaliacaoService;

    public AvaliacaoController(
            AvaliacaoService avaliacaoService
    ) {
        this.avaliacaoService = avaliacaoService;
    }

    @PostMapping
    public ResponseEntity<?> criarAvaliacao(
            @RequestBody Avaliacao avaliacao
    ) {

        try {

            Avaliacao avaliacaoSalva =
                    avaliacaoService.criarAvaliacao(
                            avaliacao
                    );

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(avaliacaoSalva);

        } catch (IllegalArgumentException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());

        } catch (IllegalStateException e) {

            return ResponseEntity
                    .status(HttpStatus.CONFLICT)
                    .body(e.getMessage());
        }
    }

    @GetMapping("/local/{localId}")
    public ResponseEntity<List<Avaliacao>> buscarPorLocal(
            @PathVariable String localId
    ) {

        return ResponseEntity.ok(
                avaliacaoService.buscarPorLocal(
                        localId
                )
        );
    }

    @GetMapping("/minhas")
public ResponseEntity<List<AvaliacaoResponse>> buscarMinhasAvaliacoes(
        @RequestParam Long usuarioId
) {

    return ResponseEntity.ok(
            avaliacaoService.buscarMinhasAvaliacoes(
                    usuarioId
            )
    );
}

    }