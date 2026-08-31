package com.maia.backend.avaliacao;

import java.time.LocalDateTime;
import java.util.ArrayList;
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

        if (
                avaliacao.getNotaGeral() == null ||
                avaliacao.getNotaGeral() < 1 ||
                avaliacao.getNotaGeral() > 5
        ) {
            throw new IllegalArgumentException(
                    "A nota geral deve ser de 1 a 5."
            );
        }

        if (
                avaliacao.getSeguranca() == null ||
                avaliacao.getSeguranca() < 1 ||
                avaliacao.getSeguranca() > 5
        ) {
            throw new IllegalArgumentException(
                    "A nota de segurança deve ser de 1 a 5."
            );
        }

        if (avaliacao.getIriaSozinha() == null) {
            throw new IllegalArgumentException(
                    "Informe se você se sentiria confortável vindo sozinha."
            );
        }

        if (
                avaliacao.getPercepcaoEntorno() == null ||
                avaliacao.getPercepcaoEntorno().isBlank()
        ) {
            throw new IllegalArgumentException(
                    "Informe como foi o entorno do local."
            );
        }

        avaliacao.setId(null);

        avaliacao.setUsuarioId(
                visita.getUsuarioId()
        );

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

    public List<AvaliacaoResponse> buscarMinhasAvaliacoes(
            Long usuarioId
    ) {

        List<Avaliacao> avaliacoes =
                avaliacaoRepository
                        .findByUsuarioIdOrderByCriadaEmDesc(
                                usuarioId
                        );

        List<AvaliacaoResponse> respostas =
                new ArrayList<>();

        for (Avaliacao avaliacao : avaliacoes) {

            Optional<Visita> visitaEncontrada =
                    visitaRepository.findById(
                            avaliacao.getVisitaId()
                    );

            if (visitaEncontrada.isEmpty()) {
                continue;
            }

            Visita visita =
                    visitaEncontrada.get();

            AvaliacaoResponse resposta =
                    new AvaliacaoResponse();

            resposta.setId(
                    avaliacao.getId()
            );

            resposta.setVisitaId(
                    avaliacao.getVisitaId()
            );

            resposta.setUsuarioId(
                    avaliacao.getUsuarioId()
            );

            resposta.setNomeLocal(
                    visita.getNomeLocal()
            );

            resposta.setCategoria(
                    visita.getCategoria()
            );

            resposta.setEndereco(
                    visita.getEndereco()
            );

            resposta.setNotaGeral(
                    avaliacao.getNotaGeral()
            );

            resposta.setSeguranca(
                    avaliacao.getSeguranca()
            );

            resposta.setIriaSozinha(
                    avaliacao.getIriaSozinha()
            );

            resposta.setPercepcaoEntorno(
                    avaliacao.getPercepcaoEntorno()
            );

            resposta.setComentario(
                    avaliacao.getComentario()
            );

            resposta.setCriadaEm(
                    avaliacao.getCriadaEm()
            );

            respostas.add(
                    resposta
            );
        }

        return respostas;
    }
}