package com.maia.backend.usuario;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
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
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping
    public ResponseEntity<?> cadastrar(@RequestBody Usuario usuario) {

        if (usuarioRepository.existsByEmail(usuario.getEmail())) {
            return ResponseEntity
                    .status(HttpStatus.CONFLICT)
                    .body("Já existe uma usuária cadastrada com este e-mail.");
        }

        usuario.setSenha(
                passwordEncoder.encode(usuario.getSenha())
        );

        Usuario usuarioSalvo = usuarioRepository.save(usuario);

        Map<String, Object> resposta = new HashMap<>();
        resposta.put("id", usuarioSalvo.getId());
        resposta.put("nome", usuarioSalvo.getNome());
        resposta.put("email", usuarioSalvo.getEmail());

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(resposta);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @RequestBody LoginRequest loginRequest
    ) {

        Optional<Usuario> usuarioEncontrado =
                usuarioRepository.findByEmail(
                        loginRequest.getEmail()
                );

        if (usuarioEncontrado.isEmpty()) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body("E-mail ou senha inválidos.");
        }

        Usuario usuario = usuarioEncontrado.get();

        boolean senhaCorreta = passwordEncoder.matches(
                loginRequest.getSenha(),
                usuario.getSenha()
        );

        if (!senhaCorreta) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body("E-mail ou senha inválidos.");
        }

        Map<String, Object> resposta = new HashMap<>();
        resposta.put("id", usuario.getId());
        resposta.put("nome", usuario.getNome());
        resposta.put("email", usuario.getEmail());

        return ResponseEntity.ok(resposta);
    }
}