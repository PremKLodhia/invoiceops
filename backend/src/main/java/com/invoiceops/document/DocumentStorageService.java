package com.invoiceops.document;

import com.invoiceops.config.AppProperties;
import com.invoiceops.config.ResourceNotFoundException;
import jakarta.annotation.PostConstruct;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class DocumentStorageService {

    private final Path storageDirectory;
    private final long maxFileSizeBytes;

    public DocumentStorageService(AppProperties appProperties) {
        this.storageDirectory = Paths.get(appProperties.getUploadDir()).toAbsolutePath().normalize();
        this.maxFileSizeBytes = (long) appProperties.getMaxUploadSizeMb() * 1024 * 1024;
    }

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(storageDirectory);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to initialize document upload directory: " + storageDirectory, e);
        }
    }

    public StoredDocument storeDocument(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Cannot store an empty or null file");
        }

        if (file.getSize() > maxFileSizeBytes) {
            throw new MaxUploadSizeExceededException(maxFileSizeBytes);
        }

        byte[] headerBytes = new byte[8];
        try (InputStream is = file.getInputStream()) {
            int read = is.read(headerBytes);
            if (read < 3) {
                throw new IllegalArgumentException("Invalid file: file too small or unreadable");
            }
        } catch (IOException e) {
            throw new IllegalArgumentException("Failed to read file contents", e);
        }

        String detectedContentType = validateMagicBytes(headerBytes);

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isBlank()) {
            originalFilename = "document";
        }

        // Clean filename to prevent path traversal
        String cleanOriginalName = Paths.get(originalFilename).getFileName().toString();
        String extension = getFileExtension(cleanOriginalName);
        String storedFilename = UUID.randomUUID() + (extension.isEmpty() ? "" : "." + extension);

        Path targetPath = resolvePathSecurely(storedFilename);

        String fileHash;
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            try (InputStream is = file.getInputStream()) {
                byte[] buffer = new byte[8192];
                int bytesRead;
                while ((bytesRead = is.read(buffer)) != -1) {
                    digest.update(buffer, 0, bytesRead);
                }
            }
            fileHash = HexFormat.of().formatHex(digest.digest());

            // Save file to disk
            try (InputStream is = file.getInputStream()) {
                Files.copy(is, targetPath, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (NoSuchAlgorithmException | IOException e) {
            throw new IllegalStateException("Failed to compute hash or save uploaded document", e);
        }

        return new StoredDocument(
                cleanOriginalName,
                storedFilename,
                fileHash,
                file.getSize(),
                detectedContentType
        );
    }

    public Resource loadDocument(String storedFilename) {
        Path filePath = resolvePathSecurely(storedFilename);
        if (!Files.exists(filePath) || !Files.isReadable(filePath)) {
            throw new ResourceNotFoundException("Document", "filename", storedFilename);
        }
        try {
            return new UrlResource(filePath.toUri());
        } catch (MalformedURLException e) {
            throw new ResourceNotFoundException("Document", "filename", storedFilename);
        }
    }

    public byte[] loadDocumentBytes(String storedFilename) {
        Path filePath = resolvePathSecurely(storedFilename);
        if (!Files.exists(filePath)) {
            throw new ResourceNotFoundException("Document", "filename", storedFilename);
        }
        try {
            return Files.readAllBytes(filePath);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to read stored document file: " + storedFilename, e);
        }
    }

    public void deleteDocument(String storedFilename) {
        if (storedFilename == null || storedFilename.isBlank()) {
            return;
        }
        Path filePath = resolvePathSecurely(storedFilename);
        try {
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            // Log and ignore deletion failure
        }
    }

    private Path resolvePathSecurely(String filename) {
        if (filename == null || filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
            throw new SecurityException("Potential path traversal attempt detected in filename: " + filename);
        }
        Path resolved = storageDirectory.resolve(filename).normalize();
        if (!resolved.startsWith(storageDirectory)) {
            throw new SecurityException("Path traversal attempt detected: " + filename);
        }
        return resolved;
    }

    private String validateMagicBytes(byte[] header) {
        // PDF: %PDF- (0x25 0x50 0x44 0x46 0x2D)
        if (header.length >= 5 &&
                header[0] == 0x25 && header[1] == 0x50 &&
                header[2] == 0x44 && header[3] == 0x46 && header[4] == 0x2D) {
            return "application/pdf";
        }

        // PNG: \x89PNG (0x89 0x50 0x4E 0x47)
        if (header.length >= 4 &&
                (header[0] & 0xFF) == 0x89 && header[1] == 0x50 &&
                header[2] == 0x4E && header[3] == 0x47) {
            return "image/png";
        }

        // JPEG: 0xFF 0xD8 0xFF
        if (header.length >= 3 &&
                (header[0] & 0xFF) == 0xFF && (header[1] & 0xFF) == 0xD8 && (header[2] & 0xFF) == 0xFF) {
            return "image/jpeg";
        }

        throw new IllegalArgumentException("Unsupported file format. Only PDF, PNG, and JPEG documents are permitted.");
    }

    private String getFileExtension(String filename) {
        int dotIndex = filename.lastIndexOf('.');
        return (dotIndex > 0 && dotIndex < filename.length() - 1) ? filename.substring(dotIndex + 1).toLowerCase() : "";
    }
}
