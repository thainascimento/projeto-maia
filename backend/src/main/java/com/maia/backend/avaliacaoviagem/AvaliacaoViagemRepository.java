package com.maia.backend.avaliacaoviagem;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AvaliacaoViagemRepository
        extends JpaRepository<
                AvaliacaoViagem,
                Long
        > {

    List<AvaliacaoViagem>
            findByUsuarioIdOrderByCriadaEmDesc(
                    Long usuarioId
            );

    Optional<AvaliacaoViagem>
            findByViagemId(
                    Long viagemId
            );

    boolean existsByViagemId(
            Long viagemId
    );
}