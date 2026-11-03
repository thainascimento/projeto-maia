
package com.maia.backend.usuario;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FotoPerfilService {

    private final Path diretorio;

    public FotoPerfilService(
            @Value("${maia.upload.dir}") String pasta
    ) throws IOException {
        this.diretorio = Paths.get(pasta)
                .toAbsolutePath()
                .normalize();

        Files.createDirectories(this.diretorio);
    }

    public String salvar(Long usuarioId, MultipartFile arquivo)
            throws IOException {

        if (arquivo == null || arquivo.isEmpty()) {
            throw new IllegalArgumentException("Selecione uma imagem.");
        }

        if (arquivo.getSize() > 5 * 1024 * 1024) {
            throw new IllegalArgumentException("A imagem deve ter até 5 MB.");
        }

        String tipo = arquivo.getContentType();

        String extensao;

        if ("image/jpeg".equals(tipo)) {
            extensao = ".jpg";
        } else if ("image/png".equals(tipo)) {
            extensao = ".png";
        } else if ("image/webp".equals(tipo)) {
            extensao = ".webp";
        } else {
            throw new IllegalArgumentException(
                    "Formato inválido. Use JPG, PNG ou WebP."
            );
        }

        String nomeArquivo = usuarioId + "-"
                + UUID.randomUUID() + extensao;

        Path destino = diretorio.resolve(nomeArquivo);

        try (var entrada = arquivo.getInputStream()) {
            Files.copy(
                    entrada,
                    destino,
                    StandardCopyOption.REPLACE_EXISTING
            );
        }

        return nomeArquivo;
    }

    public Path localizar(String nomeArquivo) {
        Path arquivo = diretorio.resolve(nomeArquivo).normalize();

        if (!arquivo.getParent().equals(diretorio)) {
            throw new IllegalArgumentException("Arquivo inválido.");
        }

        return arquivo;
    }
}
