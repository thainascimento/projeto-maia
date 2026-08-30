package com.maia.backend.avaliacao;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.maia.backend.visita.Visita;
import com.maia.backend.visita.VisitaRepository;

@Service
public class AvaliacaoService {

    private final AvaliacaoRepository avaliacaoRepository;
    private final VisitaRepository visitaRepository;

    public AvaliacaoService(
            AvaliacaoRepository avaliacaoRepository,
            VisitaRepository visitaRepository
    ) {
        this.avaliacaoRepository = avaliacaoRepository;
        this.visitaRepository = visitaRepository;
    }

    public Avaliacao criarAvaliacao(
            Avaliacao avaliacao
    ) {

        if (avaliacao.getVisitaId() == null) {
            throw new IllegalArgumentException(
                    "Visita não informada."
            );
        }

        Optional<Visita> visitaEncontrada =
                visitaRepository.findById(
                        avaliacao.getVisitaId()
                );

        if (visitaEncontrada.isEmpty()) {
            throw new IllegalArgumentException(
                    "Visita não encontrada."
            );
        }

        Visita visita =
                visitaEncontrada.get();

        if (visita.getCheckOut() == null) {
            throw new IllegalStateException(
                    "A visita ainda não possui check-out."
            );
        }

        if (visita.isAvaliada()) {
            throw new IllegalStateException(
                    "Esta visita já foi avaliada."
            );
        }

        avaliacao.setId(null);

        avaliacao.setCriadaEm(
                LocalDateTime.now()
        );

        Avaliacao avaliacaoSalva =
                avaliacaoRepository.save(
                        avaliacao
                );

        visita.setAvaliada(true);

        visitaRepository.save(
                visita
        );

        return avaliacaoSalva;
    }
    public List<Avaliacao> buscarPorLocal(
        String localId
) {

    List<Visita> visitas =
            visitaRepository.findByLocalId(
                    localId
            );

    if (visitas.isEmpty()) {
        return List.of();
    }

    List<Long> visitaIds =
            visitas.stream()
                    .map(Visita::getId)
                    .toList();

    return avaliacaoRepository
            .findByVisitaIdIn(
                    visitaIds
            );
        }
}