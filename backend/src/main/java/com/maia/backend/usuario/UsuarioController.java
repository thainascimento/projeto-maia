package com.maia.backend.usuario;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/usuarios")
public class UsuarioController {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public UsuarioController(
            UsuarioRepository usuarioRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.usuarioRepository =
                usuarioRepository;

        this.passwordEncoder =
                passwordEncoder;
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

        return ResponseEntity.ok(
                criarRespostaUsuario(
                        usuario
                )
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> buscarUsuario(
            @PathVariable Long id
    ) {

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
            @RequestBody AtualizarPerfilRequest request
    ) {

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

        Usuario usuarioAtualizado =
                usuarioRepository.save(
                        usuario
                );

        return ResponseEntity.ok(
                criarRespostaUsuario(
                        usuarioAtualizado
                )
        );
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