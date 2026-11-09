package com.maia.backend.ia;

import java.util.List;
import com.maia.backend.local.LocalResponse;

public record MaiaMensagemRequest(
        Long usuarioId,
        String mensagem,
        List<MaiaMensagemHistorico> historico,
        Double latitudeAtual,
        Double longitudeAtual,
        String intencaoInterpretada,
        String referenciaGeograficaInterpretada,
        String categoriaLocalInterpretada,
        Boolean precisaGpsInterpretada,
        String referenciaConversacionalInterpretada,
        String criterioInterpretado,
        Integer indiceLocalInterpretado,
        String escopoResultadosInterpretado,
        List<LocalResponse> locaisAnteriores,
        Integer indiceLocalEmFoco,
        List<LocalResponse> todosLocaisAnteriores,
        Integer paginaLocaisAtual
) {}
