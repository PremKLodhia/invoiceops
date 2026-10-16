package com.invoiceops.extraction;

import net.sourceforge.tess4j.ITesseract;
import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.TesseractException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;

@Component
public class TesseractOcrExtractor {

    private static final Logger log = LoggerFactory.getLogger(TesseractOcrExtractor.class);

    public String extractTextFromImage(byte[] imageBytes) {
        if (imageBytes == null || imageBytes.length == 0) {
            return "";
        }

        try {
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(imageBytes));
            if (image == null) {
                log.warn("Failed to decode image bytes for OCR");
                return "";
            }

            ITesseract tesseract = new Tesseract();
            // Let Tess4J use standard tessdata if present in environment, or fallback safely
            String tessDataPrefix = System.getenv("TESSDATA_PREFIX");
            if (tessDataPrefix != null && !tessDataPrefix.isBlank()) {
                tesseract.setDatapath(tessDataPrefix);
            }

            return tesseract.doOCR(image);
        } catch (UnsatisfiedLinkError | NoClassDefFoundError e) {
            log.warn("Tesseract OCR native libraries not installed or linked: {}. OCR processing skipped.", e.getMessage());
            return "";
        } catch (TesseractException | IOException | RuntimeException e) {
            log.warn("Tesseract OCR execution error: {}", e.getMessage());
            return "";
        }
    }
}
