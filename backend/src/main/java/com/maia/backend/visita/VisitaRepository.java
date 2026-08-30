package com.maia.backend.visita;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface VisitaRepository
        extends JpaRepository<Visita, Long> {

    List<Visita> findByAvaliadaFalseAndCheckOutIsNotNull();

    Optional<Visita> findFirstByLocalIdAndCheckOutIsNullOrderByCheckInDesc(
            String localId
    );

    List<Visita> findByLocalId(
        String localId
);
}