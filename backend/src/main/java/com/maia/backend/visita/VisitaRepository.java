package com.maia.backend.visita;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface VisitaRepository
        extends JpaRepository<Visita, Long> {

    List<Visita> findByAvaliadaFalseAndCheckOutIsNotNull();

    // Busca qualquer visita ativa da usuária.
    Optional<Visita>
            findFirstByUsuarioIdAndCheckOutIsNullOrderByCheckInDesc(
                    Long usuarioId
            );

    // Busca visita ativa da usuária em um local específico.
    Optional<Visita>
            findFirstByUsuarioIdAndLocalIdAndCheckOutIsNullOrderByCheckInDesc(
                    Long usuarioId,
                    String localId
            );

    List<Visita> findByLocalId(
            String localId
    );

    List<Visita> findByUsuarioIdAndAvaliadaFalseAndCheckOutIsNotNull(
            Long usuarioId
);        
   
}