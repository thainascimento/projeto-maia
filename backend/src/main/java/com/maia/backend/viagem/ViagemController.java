package com.maia.backend.viagem;

import java.time.LocalDate;
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
@RequestMapping("/viagens")
public class ViagemController {

    private final ViagemRepository viagemRepository;

    public ViagemController(
            ViagemRepository viagemRepository
    ) {
        this.viagemRepository =
                viagemRepository;
    }

    // Cria uma nova viagem.
    @PostMapping
    public ResponseEntity<?> criarViagem(
            @RequestBody Viagem viagem
    ) {
        System.out.println("=== ENTROU NO POST /VIAGENS ===");
        System.out.println("usuarioId: " + viagem.getUsuarioId());
        System.out.println("destino: " + viagem.getDestino());
        System.out.println("dataInicio: " + viagem.getDataInicio());
        System.out.println("dataFim: " + viagem.getDataFim());

        if (viagem.getUsuarioId() == null) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Usuária não informada."
                    );
        }

        if (
                viagem.getDestino() == null
                ||
                viagem.getDestino()
                        .isBlank()
        ) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Destino não informado."
                    );
        }

        if (
                viagem.getDataInicio() == null
                ||
                viagem.getDataFim() == null
        ) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "As datas da viagem são obrigatórias."
                    );
        }

        if (
                viagem.getDataFim()
                        .isBefore(
                                viagem.getDataInicio()
                        )
        ) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "A data final não pode ser anterior à data inicial."
                    );
        }

        viagem.setId(null);

        viagem.setCancelada(false);

        Viagem viagemSalva =
                viagemRepository.save(
                        viagem
                );

        return ResponseEntity
                .status(
                        HttpStatus.CREATED
                )
                .body(
                        viagemSalva
                );
    }

    // Lista todas as viagens da usuária.
    @GetMapping
    public List<Viagem> listarViagens(
            @RequestParam Long usuarioId
    ) {

        return viagemRepository
                .findByUsuarioIdOrderByDataInicioDesc(
                        usuarioId
                );
    }

    // Busca uma viagem pelo ID.
    @GetMapping("/{id}")
    public ResponseEntity<?> buscarPorId(
            @PathVariable Long id
    ) {

        Optional<Viagem> viagem =
                viagemRepository
                        .findById(id);

        if (viagem.isEmpty()) {

            return ResponseEntity
                    .status(
                            HttpStatus.NOT_FOUND
                    )
                    .body(
                            "Viagem não encontrada."
                    );
        }

        return ResponseEntity.ok(
                viagem.get()
        );
    }

    // Busca a viagem que está acontecendo neste momento.
    @GetMapping("/ativa")
    public ResponseEntity<?> buscarViagemAtiva(
            @RequestParam Long usuarioId
    ) {

        LocalDate hoje =
                LocalDate.now();

        Optional<Viagem> viagemAtiva =
                viagemRepository
                        .findFirstByUsuarioIdAndCanceladaFalseAndDataInicioLessThanEqualAndDataFimGreaterThanEqualOrderByDataInicioDesc(
                                usuarioId,
                                hoje,
                                hoje
                        );

        if (viagemAtiva.isEmpty()) {

            return ResponseEntity
                    .noContent()
                    .build();
        }

        return ResponseEntity.ok(
                viagemAtiva.get()
        );
    }

    // Lista as próximas viagens da usuária.
    @GetMapping("/proximas")
    public List<Viagem> listarProximasViagens(
            @RequestParam Long usuarioId
    ) {

        LocalDate hoje =
                LocalDate.now();

        return viagemRepository
                .findByUsuarioIdAndCanceladaFalseAndDataInicioGreaterThanEqualOrderByDataInicioAsc(
                        usuarioId,
                        hoje
                );
    }

    // Cancela uma viagem.
    @PostMapping("/{id}/cancelar")
    public ResponseEntity<?> cancelarViagem(
            @PathVariable Long id
    ) {

        Optional<Viagem> viagemEncontrada =
                viagemRepository
                        .findById(id);

        if (viagemEncontrada.isEmpty()) {

            return ResponseEntity
                    .status(
                            HttpStatus.NOT_FOUND
                    )
                    .body(
                            "Viagem não encontrada."
                    );
        }

        Viagem viagem =
                viagemEncontrada.get();

        if (viagem.isCancelada()) {

            return ResponseEntity
                    .status(
                            HttpStatus.CONFLICT
                    )
                    .body(
                            "Esta viagem já está cancelada."
                    );
        }

        viagem.setCancelada(true);

        Viagem viagemSalva =
                viagemRepository.save(
                        viagem
                );

        return ResponseEntity.ok(
                viagemSalva
        );
    }
}