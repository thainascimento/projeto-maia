package com.maia.backend.avaliacaoviagem;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.maia.backend.viagem.StatusViagem;
import com.maia.backend.viagem.Viagem;
import com.maia.backend.viagem.ViagemRepository;

@RestController
@RequestMapping("/avaliacoes-viagens")
public class AvaliacaoViagemController {

    private final AvaliacaoViagemRepository avaliacaoViagemRepository;
    private final ViagemRepository viagemRepository;

    public AvaliacaoViagemController(
            AvaliacaoViagemRepository avaliacaoViagemRepository,
            ViagemRepository viagemRepository
    ) {
        this.avaliacaoViagemRepository = avaliacaoViagemRepository;
        this.viagemRepository = viagemRepository;
    }

    @PostMapping
    public ResponseEntity<?> criarAvaliacao(
            @RequestBody AvaliacaoViagem avaliacao
    ) {
        if (avaliacao.getViagemId() == null || avaliacao.getUsuarioId() == null) {
            return ResponseEntity.badRequest().body("Viagem e usuária são obrigatórias.");
        }

        Optional<Viagem> viagemEncontrada = viagemRepository.findById(avaliacao.getViagemId());
        if (viagemEncontrada.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Viagem não encontrada.");
        }

        Viagem viagem = viagemEncontrada.get();
        if (!viagem.getUsuarioId().equals(avaliacao.getUsuarioId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Esta viagem não pertence à usuária informada.");
        }

        if (viagem.getStatus() != StatusViagem.FINALIZADA) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("A viagem ainda não foi finalizada.");
        }

        if (avaliacaoViagemRepository.existsByViagemId(viagem.getId())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("Esta viagem já foi avaliada.");
        }

        if (avaliacao.getNotaGeral() == null || avaliacao.getNotaGeral() < 1
                || avaliacao.getNotaGeral() > 5) {
            return ResponseEntity.badRequest().body("A nota geral deve ser de 1 a 5.");
        }

        if (avaliacao.getSeguranca() == null || avaliacao.getSeguranca() < 1
                || avaliacao.getSeguranca() > 5) {
            return ResponseEntity.badRequest().body("A nota de segurança deve ser de 1 a 5.");
        }

        avaliacao.setId(null);
        AvaliacaoViagem avaliacaoSalva = avaliacaoViagemRepository.save(avaliacao);
        viagem.setAvaliada(true);
        viagemRepository.save(viagem);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(montarResposta(avaliacaoSalva, viagem));
    }

    @GetMapping("/pendentes")
    public List<Viagem> listarPendentes(@RequestParam Long usuarioId) {
        return viagemRepository
                .findByUsuarioIdAndCanceladaFalseAndAvaliadaFalseOrderByDataFimDesc(usuarioId)
                .stream()
                .filter(viagem -> viagem.getStatus() == StatusViagem.FINALIZADA)
                .toList();
    }

    @GetMapping("/minhas")
    public List<AvaliacaoViagemResponse> listarMinhasAvaliacoes(@RequestParam Long usuarioId) {
        return avaliacaoViagemRepository.findByUsuarioIdOrderByCriadaEmDesc(usuarioId)
                .stream()
                .map(avaliacao -> viagemRepository.findById(avaliacao.getViagemId())
                        .map(viagem -> montarResposta(avaliacao, viagem))
                        .orElse(null))
                .filter(resposta -> resposta != null)
                .toList();
    }

    @GetMapping("/viagem/{viagemId}")
    public ResponseEntity<?> buscarPorViagem(@PathVariable Long viagemId) {
        Optional<AvaliacaoViagem> avaliacao = avaliacaoViagemRepository.findByViagemId(viagemId);
        if (avaliacao.isEmpty()) {
            return ResponseEntity.noContent().build();
        }

        Optional<Viagem> viagem = viagemRepository.findById(viagemId);
        if (viagem.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Viagem não encontrada.");
        }

        return ResponseEntity.ok(montarResposta(avaliacao.get(), viagem.get()));
    }

    // NOVO: avaliações comunitárias pelo destino, sem filtro pelo usuário logado.
    // Exige cidade + estado + país para não misturar cidades homônimas.
    // Retorna somente os campos públicos da avaliação; não inclui usuarioId,
    // viagemId, datas da viagem nem dados da usuária.
    @GetMapping("/destino")
    public ResponseEntity<?> listarAvaliacoesDoDestino(
            @RequestParam String cidade,
            @RequestParam String estado,
            @RequestParam String pais
    ) {
        if (cidade.isBlank() || estado.isBlank() || pais.isBlank()) {
            return ResponseEntity.badRequest()
                    .body("Cidade, estado e país são obrigatórios.");
        }

        List<Map<String, Object>> resultados = avaliacaoViagemRepository
                .buscarAvaliacoesDoDestino(cidade.trim(), estado.trim(), pais.trim())
                .stream()
                .map(this::montarAvaliacaoPublica)
                .toList();

        return ResponseEntity.ok(resultados);
    }

    private Map<String, Object> montarAvaliacaoPublica(AvaliacaoViagem avaliacao) {
        Map<String, Object> resposta = new LinkedHashMap<>();
        resposta.put("id", avaliacao.getId());
        resposta.put("notaGeral", avaliacao.getNotaGeral());
        resposta.put("seguranca", avaliacao.getSeguranca());
        resposta.put("viajariaSozinhaNovamente", avaliacao.getViajariaSozinhaNovamente());
        resposta.put("facilidadeLocomocao", avaliacao.getFacilidadeLocomocao());
        resposta.put("experienciaNoturna", avaliacao.getExperienciaNoturna());
        resposta.put("estruturaTuristica", avaliacao.getEstruturaTuristica());
        resposta.put("recomendariaParaMulherSozinha", avaliacao.getRecomendariaParaMulherSozinha());
        resposta.put("melhorRegiaoHospedagem", avaliacao.getMelhorRegiaoHospedagem());
        resposta.put("pontosPositivos", avaliacao.getPontosPositivos());
        resposta.put("pontosAtencao", avaliacao.getPontosAtencao());
        resposta.put("sentiuInsegura", avaliacao.getSentiuInsegura());
        resposta.put("relatoInseguranca", avaliacao.getRelatoInseguranca());
        resposta.put("comentario", avaliacao.getComentario());
        resposta.put("criadaEm", avaliacao.getCriadaEm());
        return resposta;
    }

    private AvaliacaoViagemResponse montarResposta(
            AvaliacaoViagem avaliacao,
            Viagem viagem
    ) {
        return new AvaliacaoViagemResponse(
                avaliacao.getId(),
                avaliacao.getViagemId(),
                avaliacao.getUsuarioId(),
                viagem.getDestino(),
                viagem.getCidade(),
                viagem.getEstado(),
                viagem.getPais(),
                viagem.getDataInicio(),
                viagem.getDataFim(),
                avaliacao.getNotaGeral(),
                avaliacao.getSeguranca(),
                avaliacao.getViajariaSozinhaNovamente(),
                avaliacao.getFacilidadeLocomocao(),
                avaliacao.getExperienciaNoturna(),
                avaliacao.getEstruturaTuristica(),
                avaliacao.getRecomendariaParaMulherSozinha(),
                avaliacao.getMelhorRegiaoHospedagem(),
                avaliacao.getPontosPositivos(),
                avaliacao.getPontosAtencao(),
                avaliacao.getSentiuInsegura(),
                avaliacao.getRelatoInseguranca(),
                avaliacao.getComentario(),
                avaliacao.getCriadaEm()
        );
    }
}
