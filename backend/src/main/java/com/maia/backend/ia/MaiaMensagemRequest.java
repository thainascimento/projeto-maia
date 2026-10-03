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

        /*
         * Escopo semântico dos resultados anteriores interpretado pela IA.
         */
        String escopoResultadosInterpretado,

        /*
         * Lista real da página de locais atualmente exibida.
         * É devolvida pelo backend e reenviada pelo app nos follow-ups.
         */
        List<LocalResponse> locaisAnteriores,

        /*
         * Índice humano (1, 2, 3...) do local que está em foco na conversa.
         */
        Integer indiceLocalEmFoco,

        /*
         * Conjunto completo de locais da última busca do ROLÊ!,
         * já deduplicados e ranqueados pelo backend.
         *
         * É mantido para permitir paginação sem consultar
         * a Geoapify novamente.
         */
        List<LocalResponse> todosLocaisAnteriores,

        /*
         * Página atualmente exibida no ROLÊ!.
         *
         * 0 = primeira página
         * 1 = segunda página
         * 2 = terceira página
         * ...
         */
        Integer paginaLocaisAtual

) {
}
