package com.maia.backend.visita;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

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
@RequestMapping("/visitas")
public class VisitaController {

    private final VisitaRepository visitaRepository;

    public VisitaController(
            VisitaRepository visitaRepository
    ) {
        this.visitaRepository = visitaRepository;
    }

    // Faz o check-in.
    // A usuária só pode ter UMA visita ativa por vez.
    @PostMapping("/check-in")
    public ResponseEntity<?> checkIn(
            @RequestBody Visita visita
    ) {

        if (visita.getUsuarioId() == null) {
            return ResponseEntity
                    .badRequest()
                    .body(
                            "Usuária não informada."
                    );
        }

        Optional<Visita> visitaAtiva =
                visitaRepository
                        .findFirstByUsuarioIdAndCheckOutIsNullOrderByCheckInDesc(
                                visita.getUsuarioId()
                        );

        if (visitaAtiva.isPresent()) {
            return ResponseEntity
                    .status(
                            HttpStatus.CONFLICT
                    )
                    .body(
                            "Você já possui uma visita em andamento. Faça o check-out antes de iniciar outra."
                    );
        }

        visita.setId(null);

        visita.setCheckIn(
                LocalDateTime.now()
        );

        visita.setCheckOut(null);

        visita.setAvaliada(false);

        Visita visitaSalva =
                visitaRepository.save(
                        visita
                );

        return ResponseEntity
                .status(
                        HttpStatus.CREATED
                )
                .body(visitaSalva);
    }

    // Busca qualquer visita ativa da usuária.
    // Não importa em qual local ela esteja.
    @GetMapping("/ativa")
    public ResponseEntity<?> buscarQualquerVisitaAtiva(
            @RequestParam Long usuarioId
    ) {

        Optional<Visita> visitaAtiva =
                visitaRepository
                        .findFirstByUsuarioIdAndCheckOutIsNullOrderByCheckInDesc(
                                usuarioId
                        );

        if (visitaAtiva.isEmpty()) {
            return ResponseEntity
                    .noContent()
                    .build();
        }

        return ResponseEntity.ok(
                visitaAtiva.get()
        );
    }

    // Finaliza a visita ativa.
    @PostMapping("/{id}/check-out")
    public ResponseEntity<?> checkOut(
            @PathVariable Long id
    ) {

        Optional<Visita> visitaEncontrada =
                visitaRepository.findById(
                        id
                );

        if (visitaEncontrada.isEmpty()) {
            return ResponseEntity
                    .status(
                            HttpStatus.NOT_FOUND
                    )
                    .body(
                            "Visita não encontrada."
                    );
        }

        Visita visita =
                visitaEncontrada.get();

        if (visita.getCheckOut() != null) {
            return ResponseEntity
                    .status(
                            HttpStatus.CONFLICT
                    )
                    .body(
                            "Esta visita já possui check-out."
                    );
        }

        visita.setCheckOut(
                LocalDateTime.now()
        );

        Visita visitaSalva =
                visitaRepository.save(
                        visita
                );

        return ResponseEntity.ok(
                visitaSalva
        );
    }

    // Lista visitas que já tiveram check-out
    // e ainda não foram avaliadas.
    @GetMapping("/pendentes")
        public List<Visita> listarPendentesDeAvaliacao(
                @RequestParam Long usuarioId
        ) {

        return visitaRepository
                .findByUsuarioIdAndAvaliadaFalseAndCheckOutIsNotNull(
                        usuarioId
                );
        }
}