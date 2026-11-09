package com.maia.backend.avaliacaoviagem;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AvaliacaoViagemRepository
        extends JpaRepository<AvaliacaoViagem, Long> {

    List<AvaliacaoViagem> findByUsuarioIdOrderByCriadaEmDesc(Long usuarioId);

    Optional<AvaliacaoViagem> findByViagemId(Long viagemId);

    boolean existsByViagemId(Long viagemId);

    // Avaliações de TODAS as usuárias para a mesma cidade, estado e país.
    // Não restringir por usuarioId: a consulta é comunitária.
    @Query("""
            SELECT a
            FROM AvaliacaoViagem a
            WHERE a.viagemId IN (
                SELECT v.id
                FROM Viagem v
                WHERE LOWER(TRIM(v.cidade)) = LOWER(TRIM(:cidade))
                  AND LOWER(TRIM(v.estado)) = LOWER(TRIM(:estado))
                  AND LOWER(TRIM(v.pais)) = LOWER(TRIM(:pais))
            )
            ORDER BY a.criadaEm DESC
            """)
    List<AvaliacaoViagem> buscarAvaliacoesDoDestino(
            @Param("cidade") String cidade,
            @Param("estado") String estado,
            @Param("pais") String pais
    );
}
