package com.maia.backend.viagem;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ViagemRepository
        extends JpaRepository<Viagem, Long> {

    List<Viagem>
            findByUsuarioIdOrderByDataInicioDesc(
                    Long usuarioId
            );

    Optional<Viagem>
            findFirstByUsuarioIdAndCanceladaFalseAndDataInicioLessThanEqualAndDataFimGreaterThanEqualOrderByDataInicioDesc(
                    Long usuarioId,
                    LocalDate dataInicio,
                    LocalDate dataFim
            );

    List<Viagem>
            findByUsuarioIdAndCanceladaFalseAndDataInicioGreaterThanEqualOrderByDataInicioAsc(
                    Long usuarioId,
                    LocalDate dataInicio
            );

            List<Viagem>
                findByUsuarioIdAndCanceladaFalseAndAvaliadaFalseOrderByDataFimDesc(
                        Long usuarioId
                );

}