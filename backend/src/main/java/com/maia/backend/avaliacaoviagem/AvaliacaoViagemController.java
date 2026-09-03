package com.maia.backend.avaliacaoviagem;

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

import com.maia.backend.viagem.StatusViagem;
import com.maia.backend.viagem.Viagem;
import com.maia.backend.viagem.ViagemRepository;

@RestController
@RequestMapping(
        "/avaliacoes-viagens"
)
public class AvaliacaoViagemController {

    private final AvaliacaoViagemRepository
            avaliacaoViagemRepository;

    private final ViagemRepository
            viagemRepository;

    public AvaliacaoViagemController(
            AvaliacaoViagemRepository avaliacaoViagemRepository,
            ViagemRepository viagemRepository
    ) {

        this.avaliacaoViagemRepository =
                avaliacaoViagemRepository;

        this.viagemRepository =
                viagemRepository;
    }

    @PostMapping
    public ResponseEntity<?> criarAvaliacao(
            @RequestBody AvaliacaoViagem avaliacao
    ) {

        if (
                avaliacao.getViagemId() == null ||
                avaliacao.getUsuarioId() == null
        ) {
            return ResponseEntity
                    .badRequest()
                    .body(
                            "Viagem e usuária são obrigatórias."
                    );
        }

        Optional<Viagem> viagemEncontrada =
                viagemRepository
                        .findById(
                                avaliacao.getViagemId()
                        );

        if (
                viagemEncontrada.isEmpty()
        ) {
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

        if (
                !viagem.getUsuarioId()
                        .equals(
                                avaliacao.getUsuarioId()
                        )
        ) {
            return ResponseEntity
                    .status(
                            HttpStatus.FORBIDDEN
                    )
                    .body(
                            "Esta viagem não pertence à usuária informada."
                    );
        }

        if (
                viagem.getStatus() !=
                        StatusViagem.FINALIZADA
        ) {
            return ResponseEntity
                    .status(
                            HttpStatus.CONFLICT
                    )
                    .body(
                            "A viagem ainda não foi finalizada."
                    );
        }

        if (
                avaliacaoViagemRepository
                        .existsByViagemId(
                                viagem.getId()
                        )
        ) {
            return ResponseEntity
                    .status(
                            HttpStatus.CONFLICT
                    )
                    .body(
                            "Esta viagem já foi avaliada."
                    );
        }

        if (
                avaliacao.getNotaGeral() == null ||
                avaliacao.getNotaGeral() < 1 ||
                avaliacao.getNotaGeral() > 5
        ) {
            return ResponseEntity
                    .badRequest()
                    .body(
                            "A nota geral deve ser de 1 a 5."
                    );
        }

        if (
                avaliacao.getSeguranca() == null ||
                avaliacao.getSeguranca() < 1 ||
                avaliacao.getSeguranca() > 5
        ) {
            return ResponseEntity
                    .badRequest()
                    .body(
                            "A nota de segurança deve ser de 1 a 5."
                    );
        }

        avaliacao.setId(null);

        AvaliacaoViagem avaliacaoSalva =
                avaliacaoViagemRepository
                        .save(
                                avaliacao
                        );

        viagem.setAvaliada(
                true
        );

        viagemRepository.save(
                viagem
        );

        return ResponseEntity
                .status(
                        HttpStatus.CREATED
                )
                .body(
                        avaliacaoSalva
                );
    }

    @GetMapping("/pendentes")
    public List<Viagem>
            listarPendentes(
                    @RequestParam Long usuarioId
            ) {

        return viagemRepository
                .findByUsuarioIdAndCanceladaFalseAndAvaliadaFalseOrderByDataFimDesc(
                        usuarioId
                )
                .stream()
                .filter(
                        viagem ->
                                viagem.getStatus()
                                ==
                                StatusViagem.FINALIZADA
                )
                .toList();
    }

    @GetMapping("/minhas")
    public List<AvaliacaoViagem>
            listarMinhasAvaliacoes(
                    @RequestParam Long usuarioId
            ) {

        return avaliacaoViagemRepository
                .findByUsuarioIdOrderByCriadaEmDesc(
                        usuarioId
                );
    }

    @GetMapping("/viagem/{viagemId}")
    public ResponseEntity<?> buscarPorViagem(
            @PathVariable Long viagemId
    ) {

        Optional<AvaliacaoViagem> avaliacao =
                avaliacaoViagemRepository
                        .findByViagemId(
                                viagemId
                        );

        if (
                avaliacao.isEmpty()
        ) {
            return ResponseEntity
                    .noContent()
                    .build();
        }

        return ResponseEntity.ok(
                avaliacao.get()
        );
    }
}