
package com.maia.backend.avaliacao;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    @Transactional
    public Avaliacao criarAvaliacao(
            Avaliacao avaliacao,
            Long usuarioIdAutenticado
    ) {

        if (usuarioIdAutenticado == null) {
            throw new AccessDeniedException(
                    "Usuária não autenticada."
            );
        }

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

        Visita visita = visitaEncontrada.get();

        // Verifica se a visita pertence à usuária autenticada.
        if (!usuarioIdAutenticado.equals(
                visita.getUsuarioId()
        )) {
            throw new AccessDeniedException(
                    "Você não pode avaliar a visita de outra usuária."
            );
        }

        // A visita precisa ter sido finalizada.
        if (visita.getCheckOut() == null) {
            throw new IllegalStateException(
                    "A visita ainda não possui check-out."
            );
        }

        // Impede avaliar novamente uma visita já avaliada.
        if (visita.isAvaliada()) {
            throw new IllegalStateException(
                    "Esta visita já foi avaliada."
            );
        }

        // Valida a nota geral.
        if (
                avaliacao.getNotaGeral() == null ||
                avaliacao.getNotaGeral() < 1 ||
                avaliacao.getNotaGeral() > 5
        ) {
            throw new IllegalArgumentException(
                    "A nota geral deve ser de 1 a 5."
            );
        }

        // Valida a nota de segurança.
        if (
                avaliacao.getSeguranca() == null ||
                avaliacao.getSeguranca() < 1 ||
                avaliacao.getSeguranca() > 5
        ) {
            throw new IllegalArgumentException(
                    "A nota de segurança deve ser de 1 a 5."
            );
        }

        // Verifica se a usuária informou se iria sozinha.
        if (avaliacao.getIriaSozinha() == null) {
            throw new IllegalArgumentException(
                    "Informe se você se sentiria confortável vindo sozinha."
            );
        }

        // Verifica a percepção do entorno.
        if (
                avaliacao.getPercepcaoEntorno() == null ||
                avaliacao.getPercepcaoEntorno().isBlank()
        ) {
            throw new IllegalArgumentException(
                    "Informe como foi o entorno do local."
            );
        }

        // O backend controla os campos internos.
        avaliacao.setId(null);

        avaliacao.setUsuarioId(
                usuarioIdAutenticado
        );

        avaliacao.setCriadaEm(
                LocalDateTime.now()
        );

        // Salva a avaliação.
        Avaliacao avaliacaoSalva =
                avaliacaoRepository.save(
                        avaliacao
                );

        // Marca a visita como avaliada.
        visita.setAvaliada(true);

        visitaRepository.save(
                visita
        );

        return avaliacaoSalva;
    }

    // Busca avaliações relacionadas a um local.
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

    // Busca as avaliações da usuária.
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
