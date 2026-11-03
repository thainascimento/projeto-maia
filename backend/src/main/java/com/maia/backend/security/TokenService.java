
package com.maia.backend.security;

import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import io.jsonwebtoken.io.Decoders;

@Service
public class TokenService {

    private final SecretKey chave;
    private final long expiracaoMs;

    public TokenService(
            @Value("${maia.jwt.secret}") String segredoBase64,
            @Value("${maia.jwt.expiration-ms}") long expiracaoMs
    ) {
        byte[] bytes = Decoders.BASE64.decode(segredoBase64);

        this.chave = Keys.hmacShaKeyFor(bytes);
        this.expiracaoMs = expiracaoMs;
    }

    public String gerarToken(Long usuarioId) {

        Date agora = new Date();

        Date expiracao = new Date(
                agora.getTime() + expiracaoMs
        );

        return Jwts.builder()
                .subject(usuarioId.toString())
                .issuedAt(agora)
                .expiration(expiracao)
                .signWith(chave)
                .compact();
    }

    public Long validarToken(String token) {

        Claims claims = Jwts.parser()
                .verifyWith(chave)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        return Long.valueOf(claims.getSubject());
    }
}
