
package com.maia.backend.viagem;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/viagens")
public class ViagemController {

    private final ViagemRepository viagemRepository;

    public ViagemController(
            ViagemRepository viagemRepository
    ) {
        this.viagemRepository = viagemRepository;
    }

    private boolean proprioUsuario(
            Long usuarioId,
            Authentication authentication
    ) {
        return usuarioId != null
                && authentication != null
                && authentication.isAuthenticated()
                && authentication.getPrincipal() instanceof Long
                && usuarioId.equals(authentication.getPrincipal());
    }

    private ResponseEntity<String> acessoNegado() {
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body("Acesso não autorizado a esta viagem.");
    }

    // Cria uma nova viagem.
    @PostMapping
    public ResponseEntity<?> criarViagem(
            @RequestBody Viagem viagem,
            Authentication authentication
    ) {
        if (!proprioUsuario(
                viagem.getUsuarioId(),
                authentication
        )) {
            return acessoNegado();
        }

        if (viagem.getDestino() == null
                || viagem.getDestino().isBlank()) {
            return ResponseEntity.badRequest()
                    .body("Destino não informado.");
        }

        if (viagem.getDataInicio() == null
                || viagem.getDataFim() == null) {
            return ResponseEntity.badRequest()
                    .body("As datas da viagem são obrigatórias.");
        }

        if (viagem.getDataFim()
                .isBefore(viagem.getDataInicio())) {
            return ResponseEntity.badRequest()
                    .body("A data final não pode ser anterior à data inicial.");
        }

        viagem.setId(null);
        viagem.setCancelada(false);
        viagem.setFinalizadaManualmente(false);

        Viagem viagemSalva = viagemRepository.save(viagem);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(viagemSalva);
    }

    // Lista todas as viagens da usuária.
    @GetMapping
    public ResponseEntity<?> listarViagens(
            @RequestParam Long usuarioId,
            Authentication authentication
    ) {
        if (!proprioUsuario(usuarioId, authentication)) {
            return acessoNegado();
        }

        List<Viagem> viagens = viagemRepository
                .findByUsuarioIdOrderByDataInicioDesc(usuarioId);

        return ResponseEntity.ok(viagens);
    }

    // Busca uma viagem pelo ID.
    @GetMapping("/{id}")
    public ResponseEntity<?> buscarPorId(
            @PathVariable Long id,
            Authentication authentication
    ) {
        Optional<Viagem> encontrada =
                viagemRepository.findById(id);

        if (encontrada.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Viagem não encontrada.");
        }

        Viagem viagem = encontrada.get();

        if (!proprioUsuario(
                viagem.getUsuarioId(),
                authentication
        )) {
            return acessoNegado();
        }

        return ResponseEntity.ok(viagem);
    }

    // Busca a viagem que está acontecendo neste momento.
    @GetMapping("/ativa")
    public ResponseEntity<?> buscarViagemAtiva(
            @RequestParam Long usuarioId,
            Authentication authentication
    ) {
        if (!proprioUsuario(usuarioId, authentication)) {
            return acessoNegado();
        }

        LocalDate hoje = LocalDate.now();

        Optional<Viagem> viagemAtiva = viagemRepository
                .findFirstByUsuarioIdAndCanceladaFalseAndDataInicioLessThanEqualAndDataFimGreaterThanEqualOrderByDataInicioDesc(
                        usuarioId,
                        hoje,
                        hoje
                );

        if (viagemAtiva.isEmpty()
                || viagemAtiva.get().isFinalizadaManualmente()) {
            return ResponseEntity.noContent().build();
        }

        return ResponseEntity.ok(viagemAtiva.get());
    }

    // Lista as próximas viagens da usuária.
    @GetMapping("/proximas")
    public ResponseEntity<?> listarProximasViagens(
            @RequestParam Long usuarioId,
            Authentication authentication
    ) {
        if (!proprioUsuario(usuarioId, authentication)) {
            return acessoNegado();
        }

        LocalDate hoje = LocalDate.now();

        List<Viagem> viagens = viagemRepository
                .findByUsuarioIdAndCanceladaFalseAndDataInicioGreaterThanEqualOrderByDataInicioAsc(
                        usuarioId,
                        hoje
                );

        return ResponseEntity.ok(viagens);
    }

    // Cancela uma viagem.
    @PostMapping("/{id}/cancelar")
    public ResponseEntity<?> cancelarViagem(
            @PathVariable Long id,
            Authentication authentication
    ) {
        Optional<Viagem> encontrada =
                viagemRepository.findById(id);

        if (encontrada.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Viagem não encontrada.");
        }

        Viagem viagem = encontrada.get();

        if (!proprioUsuario(
                viagem.getUsuarioId(),
                authentication
        )) {
            return acessoNegado();
        }

        if (viagem.isCancelada()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("Esta viagem já está cancelada.");
        }

        viagem.setCancelada(true);

        Viagem viagemSalva = viagemRepository.save(viagem);

        return ResponseEntity.ok(viagemSalva);
    }

    // Finaliza uma viagem manualmente.
    @PostMapping("/{id}/finalizar")
    public ResponseEntity<?> finalizarViagem(
            @PathVariable Long id,
            Authentication authentication
    ) {
        Optional<Viagem> encontrada =
                viagemRepository.findById(id);

        if (encontrada.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Viagem não encontrada.");
        }

        Viagem viagem = encontrada.get();

        if (!proprioUsuario(
                viagem.getUsuarioId(),
                authentication
        )) {
            return acessoNegado();
        }

        if (viagem.isCancelada()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("Não é possível finalizar uma viagem cancelada.");
        }

        if (viagem.isFinalizadaManualmente()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("Esta viagem já está finalizada.");
        }

        viagem.setFinalizadaManualmente(true);

        Viagem viagemSalva = viagemRepository.save(viagem);

        return ResponseEntity.ok(viagemSalva);
    }
}
