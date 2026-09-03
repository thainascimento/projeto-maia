package com.maia.backend.viagem;

import java.util.List;

import org.springframework.stereotype.Service;

@Service
public class ViagemService {

    private final ViagemRepository viagemRepository;

    public ViagemService(
            ViagemRepository viagemRepository
    ) {
        this.viagemRepository = viagemRepository;
    }

    public Viagem criarViagem(
            Viagem viagem
    ) {

        if (viagem.getUsuarioId() == null) {
            throw new IllegalArgumentException(
                    "Usuária não informada."
            );
        }

        if (
                viagem.getDestino() == null ||
                viagem.getDestino().isBlank()
        ) {
            throw new IllegalArgumentException(
                    "O destino é obrigatório."
            );
        }

        if (viagem.getDataInicio() == null) {
            throw new IllegalArgumentException(
                    "A data de início é obrigatória."
            );
        }

        if (viagem.getDataFim() == null) {
            throw new IllegalArgumentException(
                    "A data de fim é obrigatória."
            );
        }

        if (
                viagem.getDataFim()
                        .isBefore(
                                viagem.getDataInicio()
                        )
        ) {
            throw new IllegalArgumentException(
                    "A data de fim não pode ser anterior à data de início."
            );
        }

        viagem.setId(null);
        viagem.setCancelada(false);

        return viagemRepository.save(
                viagem
        );
    }

    public List<Viagem> listarPorUsuario(
            Long usuarioId
    ) {

        return viagemRepository
                .findByUsuarioIdOrderByDataInicioDesc(
                        usuarioId
                );
    }
}