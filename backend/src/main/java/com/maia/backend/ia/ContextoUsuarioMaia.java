package com.maia.backend.ia;

import java.util.List;

import com.maia.backend.viagem.Viagem;

public record ContextoUsuarioMaia(
        String nome,
        String telefone,
        String contatoEmergenciaNome,
        String contatoEmergenciaTelefone,
        String contatoEmergenciaRelacao,
        List<Viagem> viagens
) {

    public ContextoUsuarioMaia {

        viagens =
                viagens == null
                        ? List.of()
                        : List.copyOf(
                                viagens
                        );
    }
}