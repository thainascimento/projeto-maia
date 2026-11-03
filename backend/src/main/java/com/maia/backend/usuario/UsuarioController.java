package com.maia.backend.usuario;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.RestController;
import com.maia.backend.security.TokenService;

@RestController
@RequestMapping("/usuarios")
public class UsuarioController {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final FotoPerfilService fotoPerfilService;
    private final TokenService tokenService;

    public UsuarioController(
            UsuarioRepository usuarioRepository,
            PasswordEncoder passwordEncoder,
            FotoPerfilService fotoPerfilService,
            TokenService tokenService
    ) {
        this.usuarioRepository =
                usuarioRepository;

        this.passwordEncoder =
                passwordEncoder;

        this.fotoPerfilService =
                fotoPerfilService;

        this.tokenService =
                tokenService;
}

    @PostMapping
    public ResponseEntity<?> cadastrar(
            @RequestBody Usuario usuario
    ) {

        String emailNormalizado =
                usuario
                        .getEmail()
                        .trim()
                        .toLowerCase();

        usuario.setEmail(
                emailNormalizado
        );

        if (
                usuarioRepository
                        .existsByEmail(
                                emailNormalizado
                        )
        ) {
            return ResponseEntity
                    .status(
                            HttpStatus.CONFLICT
                    )
                    .body(
                            "Já existe uma usuária cadastrada com este e-mail."
                    );
        }

        usuario.setNome(
                usuario
                        .getNome()
                        .trim()
        );

        usuario.setSenha(
                passwordEncoder.encode(
                        usuario.getSenha()
                )
        );

        Usuario usuarioSalvo =
                usuarioRepository.save(
                        usuario
                );

        return ResponseEntity
                .status(
                        HttpStatus.CREATED
                )
                .body(
                        criarRespostaUsuario(
                                usuarioSalvo
                        )
                );
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @RequestBody LoginRequest loginRequest
    ) {

        String emailNormalizado =
                loginRequest
                        .getEmail()
                        .trim()
                        .toLowerCase();

        Optional<Usuario> usuarioEncontrado =
                usuarioRepository.findByEmail(
                        emailNormalizado
                );

        if (
                usuarioEncontrado.isEmpty()
        ) {
            return ResponseEntity
                    .status(
                            HttpStatus.UNAUTHORIZED
                    )
                    .body(
                            "E-mail ou senha inválidos."
                    );
        }

        Usuario usuario =
                usuarioEncontrado.get();

        boolean senhaCorreta =
                passwordEncoder.matches(
                        loginRequest.getSenha(),
                        usuario.getSenha()
                );

        if (!senhaCorreta) {
            return ResponseEntity
                    .status(
                            HttpStatus.UNAUTHORIZED
                    )
                    .body(
                            "E-mail ou senha inválidos."
                    );
        }

        String token = tokenService.gerarToken(usuario.getId());

        Map<String, Object> resposta = new HashMap<>();
        resposta.put("token", token);
        resposta.put("usuario", criarRespostaUsuario(usuario));

        return ResponseEntity.ok(resposta);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> buscarUsuario(
            @PathVariable Long id,
            Authentication authentication
    ) {
        if (!proprioUsuario(id, authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Acesso não autorizado a esta conta.");
        }


        Optional<Usuario> usuarioEncontrado =
                usuarioRepository.findById(
                        id
                );

        if (
                usuarioEncontrado.isEmpty()
        ) {
            return ResponseEntity
                    .status(
                            HttpStatus.NOT_FOUND
                    )
                    .body(
                            "Usuária não encontrada."
                    );
        }

        return ResponseEntity.ok(
                criarRespostaUsuario(
                        usuarioEncontrado.get()
                )
        );
    }

    @PutMapping("/{id}/perfil")
    public ResponseEntity<?> atualizarPerfil(
            @PathVariable Long id,
            @RequestBody AtualizarPerfilRequest request,
            Authentication authentication
    ) {
        if (!proprioUsuario(id, authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Acesso não autorizado a esta conta.");
        }


        Optional<Usuario> usuarioEncontrado =
                usuarioRepository.findById(
                        id
                );

        if (
                usuarioEncontrado.isEmpty()
        ) {
            return ResponseEntity
                    .status(
                            HttpStatus.NOT_FOUND
                    )
                    .body(
                            "Usuária não encontrada."
                    );
        }

        if (
                request.getNome() == null ||
                request
                        .getNome()
                        .trim()
                        .isEmpty()
        ) {
            return ResponseEntity
                    .badRequest()
                    .body(
                            "O nome é obrigatório."
                    );
        }

        if (
                request.getContatoEmergenciaNome() ==
                        null ||
                request
                        .getContatoEmergenciaNome()
                        .trim()
                        .isEmpty()
        ) {
            return ResponseEntity
                    .badRequest()
                    .body(
                            "O nome do contato de emergência é obrigatório."
                    );
        }

        if (
                request.getContatoEmergenciaTelefone() ==
                        null ||
                request
                        .getContatoEmergenciaTelefone()
                        .trim()
                        .isEmpty()
        ) {
            return ResponseEntity
                    .badRequest()
                    .body(
                            "O telefone do contato de emergência é obrigatório."
                    );
        }

        Usuario usuario =
                usuarioEncontrado.get();

        // O e-mail so muda quando um novo endereco e enviado.
        if (request.getEmail() != null) {
            String novoEmail = request.getEmail().trim().toLowerCase(Locale.ROOT);
            if (novoEmail.isBlank() || novoEmail.length() > 254 ||
                    !novoEmail.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
                return ResponseEntity.badRequest().body("Informe um e-mail valido.");
            }
            if (!novoEmail.equalsIgnoreCase(usuario.getEmail())) {
                if (request.getSenhaAtual() == null || request.getSenhaAtual().isBlank() ||
                        !passwordEncoder.matches(request.getSenhaAtual(), usuario.getSenha())) {
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Senha atual incorreta ou nao informada.");
                }
                if (usuarioRepository.existsByEmail(novoEmail)) {
                    return ResponseEntity.status(HttpStatus.CONFLICT).body("Este e-mail ja esta em uso.");
                }
                usuario.setEmail(novoEmail);
            }
        }

        usuario.setNome(
                request
                        .getNome()
                        .trim()
        );

        usuario.setTelefone(
                limparTextoOpcional(
                        request.getTelefone()
                )
        );

        usuario.setContatoEmergenciaNome(
                request
                        .getContatoEmergenciaNome()
                        .trim()
        );

        usuario.setContatoEmergenciaTelefone(
                request
                        .getContatoEmergenciaTelefone()
                        .trim()
        );

        usuario.setContatoEmergenciaRelacao(
                limparTextoOpcional(
                        request
                                .getContatoEmergenciaRelacao()
                )
        );

        Usuario usuarioAtualizado;
        try {
            usuarioAtualizado = usuarioRepository.saveAndFlush(usuario);
        } catch (DataIntegrityViolationException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("Nao foi possivel salvar: e-mail ja cadastrado ou dados em conflito.");
        }

        return ResponseEntity.ok(
                criarRespostaUsuario(
                        usuarioAtualizado
                )
        );
    }


    @PostMapping(value = "/{id}/foto", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> enviarFoto(
            @PathVariable Long id,
            @RequestParam("arquivo") MultipartFile arquivo,
            Authentication authentication
    ) {
        if (!proprioUsuario(id, authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Você não pode alterar a foto de outra usuária.");
        }

        Optional<Usuario> encontrada = usuarioRepository.findById(id);
        if (encontrada.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Usuária não encontrada.");
        }

        try {
            String nomeArquivo = fotoPerfilService.salvar(id, arquivo);
            Usuario usuario = encontrada.get();
            usuario.setFotoUri(nomeArquivo);
            usuarioRepository.saveAndFlush(usuario);
            return ResponseEntity.ok(criarRespostaUsuario(usuario));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Não foi possível salvar a foto.");
        }
    }

    @GetMapping("/{id}/foto")
    public ResponseEntity<?> obterFoto(
            @PathVariable Long id,
            Authentication authentication
    ) {
        if (!proprioUsuario(id, authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Você não pode acessar a foto de outra usuária.");
        }

        Optional<Usuario> encontrada = usuarioRepository.findById(id);
        if (encontrada.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Usuária não encontrada.");
        }

        String nomeArquivo = encontrada.get().getFotoUri();
        if (nomeArquivo == null || nomeArquivo.isBlank()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Foto não cadastrada.");
        }

        try {
            Path caminho = fotoPerfilService.localizar(nomeArquivo);
            if (!Files.isRegularFile(caminho) || !Files.isReadable(caminho)) {
                return ResponseEntity.notFound().build();
            }
            String tipo = Files.probeContentType(caminho);
            if (tipo == null || !tipo.startsWith("image/")) {
                return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).build();
            }
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(tipo))
                    .header(HttpHeaders.CACHE_CONTROL, "no-store")
                    .body(new FileSystemResource(caminho));
        } catch (IOException | IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Não foi possível recuperar a foto.");
        }
    }

    private boolean proprioUsuario(Long id, Authentication authentication) {
        return authentication != null
                && authentication.isAuthenticated()
                && authentication.getPrincipal() instanceof Long
                && id.equals(authentication.getPrincipal());
    }

    private Map<String, Object> criarRespostaUsuario(
            Usuario usuario
    ) {

        Map<String, Object> resposta =
                new HashMap<>();

        resposta.put(
                "id",
                usuario.getId()
        );

        resposta.put(
                "nome",
                usuario.getNome()
        );

        resposta.put(
                "email",
                usuario.getEmail()
        );

        resposta.put(
                "telefone",
                usuario.getTelefone()
        );

        resposta.put(
                "contatoEmergenciaNome",
                usuario.getContatoEmergenciaNome()
        );

        resposta.put(
                "contatoEmergenciaTelefone",
                usuario.getContatoEmergenciaTelefone()
        );

        resposta.put(
                "contatoEmergenciaRelacao",
                usuario.getContatoEmergenciaRelacao()
        );

        resposta.put(
                "fotoUri",
                usuario.getFotoUri()
        );

        boolean perfilCompleto =
                usuario.getContatoEmergenciaNome() !=
                        null &&
                !usuario
                        .getContatoEmergenciaNome()
                        .isBlank() &&
                usuario
                        .getContatoEmergenciaTelefone() !=
                        null &&
                !usuario
                        .getContatoEmergenciaTelefone()
                        .isBlank();

        resposta.put(
                "perfilCompleto",
                perfilCompleto
        );

        return resposta;
    }

    private String limparTextoOpcional(
            String valor
    ) {

        if (
                valor == null ||
                valor.trim().isEmpty()
        ) {
            return null;
        }

        return valor.trim();
    }
}