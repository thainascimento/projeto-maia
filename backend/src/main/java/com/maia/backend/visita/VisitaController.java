
package com.maia.backend.visita;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

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
@RequestMapping("/visitas")
public class VisitaController {

    private final VisitaRepository visitaRepository;

    public VisitaController(
            VisitaRepository visitaRepository
    ) {
        this.visitaRepository = visitaRepository;
    }

    private Long usuarioAutenticado(Authentication authentication) {
        if (authentication == null
                || !authentication.isAuthenticated()
                || !(authentication.getPrincipal() instanceof Long)) {
            return null;
        }

        return (Long) authentication.getPrincipal();
    }

    private ResponseEntity<String> acessoNegado() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body("Acesso não autorizado a esta visita.");
    }

    @PostMapping("/check-in")
    public ResponseEntity<?> checkIn(
            @RequestBody Visita visita,
            Authentication authentication
    ) {
        Long usuarioId = usuarioAutenticado(authentication);

        if (usuarioId == null) {
            return acessoNegado();
        }

        if (visita.getUsuarioId() != null
                && !usuarioId.equals(visita.getUsuarioId())) {
            return acessoNegado();
        }

        Optional<Visita> visitaAtiva =
                visitaRepository
                        .findFirstByUsuarioIdAndCheckOutIsNullOrderByCheckInDesc(
                                usuarioId
                        );

        if (visitaAtiva.isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("Você já possui uma visita em andamento. Faça o check-out antes de iniciar outra.");
        }

        visita.setId(null);
        visita.setUsuarioId(usuarioId);
        visita.setCheckIn(LocalDateTime.now());
        visita.setCheckOut(null);
        visita.setAvaliada(false);

        Visita visitaSalva = visitaRepository.save(visita);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(visitaSalva);
    }

    @GetMapping("/ativa")
    public ResponseEntity<?> buscarQualquerVisitaAtiva(
            @RequestParam Long usuarioId,
            Authentication authentication
    ) {
        Long autenticado = usuarioAutenticado(authentication);

        if (autenticado == null || !autenticado.equals(usuarioId)) {
            return acessoNegado();
        }

        Optional<Visita> visitaAtiva =
                visitaRepository
                        .findFirstByUsuarioIdAndCheckOutIsNullOrderByCheckInDesc(
                                autenticado
                        );

        if (visitaAtiva.isEmpty()) {
            return ResponseEntity.noContent().build();
        }

        return ResponseEntity.ok(visitaAtiva.get());
    }

    @PostMapping("/{id}/check-out")
    public ResponseEntity<?> checkOut(
            @PathVariable Long id,
            Authentication authentication
    ) {
        Long usuarioId = usuarioAutenticado(authentication);

        if (usuarioId == null) {
            return acessoNegado();
        }

        Optional<Visita> visitaEncontrada =
                visitaRepository.findById(id);

        if (visitaEncontrada.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Visita não encontrada.");
        }

        Visita visita = visitaEncontrada.get();

        if (!usuarioId.equals(visita.getUsuarioId())) {
            return acessoNegado();
        }

        if (visita.getCheckOut() != null) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("Esta visita já possui check-out.");
        }

        visita.setCheckOut(LocalDateTime.now());

        Visita visitaSalva = visitaRepository.save(visita);

        return ResponseEntity.ok(visitaSalva);
    }

    @GetMapping("/pendentes")
    public ResponseEntity<?> listarPendentesDeAvaliacao(
            @RequestParam Long usuarioId,
            Authentication authentication
    ) {
        Long autenticado = usuarioAutenticado(authentication);

        if (autenticado == null || !autenticado.equals(usuarioId)) {
            return acessoNegado();
        }

        List<Visita> visitas =
                visitaRepository
                        .findByUsuarioIdAndAvaliadaFalseAndCheckOutIsNotNull(
                                autenticado
                        );

        return ResponseEntity.ok(visitas);
    }
}
