package com.maia.backend.avaliacaoviagem;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record AvaliacaoViagemResponse(

        Long id,

        Long viagemId,

        Long usuarioId,

        String destino,

        String cidade,

        String estado,

        String pais,

        LocalDate dataInicio,

        LocalDate dataFim,

        Integer notaGeral,

        Integer seguranca,

        Boolean viajariaSozinhaNovamente,

        Integer facilidadeLocomocao,

        String experienciaNoturna,

        Integer estruturaTuristica,

        Boolean recomendariaParaMulherSozinha,

        String melhorRegiaoHospedagem,

        String pontosPositivos,

        String pontosAtencao,

        Boolean sentiuInsegura,

        String relatoInseguranca,

        String comentario,

        LocalDateTime criadaEm

) {
}