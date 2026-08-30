package com.maia.backend.avaliacao;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AvaliacaoRepository
        extends JpaRepository<Avaliacao, Long> {

    List<Avaliacao> findByVisitaIdIn(
            List<Long> visitaIds
    );
}