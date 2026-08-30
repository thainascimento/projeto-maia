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

    // Inicia uma nova visita.
    // Chamado quando a usuária toca em "ESTOU AQUI".
    @PostMapping("/check-in")
    public ResponseEntity<?> checkIn(
            @RequestBody Visita visita
    ) {

        // Verifica se já existe uma visita ativa
        // para este mesmo local.
        Optional<Visita> visitaAtiva =
                visitaRepository
                        .findFirstByLocalIdAndCheckOutIsNullOrderByCheckInDesc(
                                visita.getLocalId()
                        );

        if (visitaAtiva.isPresent()) {
            return ResponseEntity
                    .status(HttpStatus.CONFLICT)
                    .body(
                            "Já existe uma visita ativa neste local."
                    );
        }

        // O backend controla esses campos.
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

    // Busca uma visita ainda ativa daquele local.
    // Isso permite que o botão continue mostrando
    // "CHECK-OUT" mesmo se a usuária sair da tela
    // e depois voltar.
    @GetMapping("/ativa/{localId}")
    public ResponseEntity<?> buscarVisitaAtiva(
            @PathVariable String localId
    ) {

        Optional<Visita> visitaAtiva =
                visitaRepository
                        .findFirstByLocalIdAndCheckOutIsNullOrderByCheckInDesc(
                                localId
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

    // Finaliza uma visita.
    // Chamado quando a usuária toca em "FAZER CHECK-OUT".
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

        if (
                visita.getCheckOut() != null
        ) {
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

    // Lista todas as visitas que já tiveram check-out,
    // mas ainda não foram avaliadas.
    // Futuramente esta lista alimentará o "EU CONTO!".
    @GetMapping("/pendentes")
    public List<Visita>
            listarPendentesDeAvaliacao() {

        return visitaRepository
                .findByAvaliadaFalseAndCheckOutIsNotNull();
    }
}