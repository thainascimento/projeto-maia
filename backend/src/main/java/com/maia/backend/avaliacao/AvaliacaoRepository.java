package com.maia.backend.avaliacao;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AvaliacaoRepository
        extends JpaRepository<Avaliacao, Long> {

    // Busca avaliações relacionadas a uma lista de visitas.
    // Usamos isso para mostrar as avaliações públicas de um local.
    List<Avaliacao> findByVisitaIdIn(
            List<Long> visitaIds
    );

    // Busca todas as avaliações feitas por uma usuária.
    // Usaremos isso em "Minhas avaliações".
    List<Avaliacao> findByUsuarioIdOrderByCriadaEmDesc(
            Long usuarioId
    );
}