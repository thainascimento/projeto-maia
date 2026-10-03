package com.maia.backend.ia;

import java.util.List;

import com.maia.backend.local.LocalResponse;

public record MaiaMensagemResponse(

        String resposta,

        List<LocalResponse> locaisContexto,

        Integer indiceLocalEmFoco

) {

    /*
     * Mantém compatibilidade com os pontos antigos do IAController
     * que ainda retornam somente uma mensagem.
     */
    public MaiaMensagemResponse(
            String resposta
    ) {
        this(
                resposta,
                List.of(),
                null
        );
    }
}