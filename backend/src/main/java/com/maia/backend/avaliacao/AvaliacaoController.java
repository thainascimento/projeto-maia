
package com.maia.backend.avaliacao;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
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

    private Long usuarioAutenticado(Authentication authentication) {
        if (authentication == null
                || !authentication.isAuthenticated()
                || !(authentication.getPrincipal() instanceof Long)) {
            return null;
        }

        return (Long) authentication.getPrincipal();
    }

    @PostMapping
    public ResponseEntity<?> criarAvaliacao(
            @RequestBody Avaliacao avaliacao,
            Authentication authentication
    ) {
        Long usuarioId = usuarioAutenticado(authentication);

        if (usuarioId == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Acesso não autorizado.");
        }

        try {
            Avaliacao avaliacaoSalva =
                    avaliacaoService.criarAvaliacao(
                            avaliacao,
                            usuarioId
                    );

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(avaliacaoSalva);

        } catch (org.springframework.security.access.AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(e.getMessage());

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(e.getMessage());

        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(e.getMessage());
        }
    }

    @GetMapping("/local/{localId}")
    public ResponseEntity<List<Avaliacao>> buscarPorLocal(
            @PathVariable String localId
    ) {
        return ResponseEntity.ok(
                avaliacaoService.buscarPorLocal(localId)
        );
    }

    @GetMapping("/minhas")
    public ResponseEntity<?> buscarMinhasAvaliacoes(
            @RequestParam Long usuarioId,
            Authentication authentication
    ) {
        Long autenticado = usuarioAutenticado(authentication);

        if (autenticado == null || !autenticado.equals(usuarioId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Acesso não autorizado às avaliações.");
        }

        return ResponseEntity.ok(
                avaliacaoService.buscarMinhasAvaliacoes(autenticado)
        );
    }
}
