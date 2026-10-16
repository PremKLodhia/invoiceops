package com.invoiceops.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI invoiceOpsOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("InvoiceOps API")
                        .description("REST API for InvoiceOps local-first invoice operations platform")
                        .version("v0.0.1")
                        .contact(new Contact()
                                .name("InvoiceOps Engineering")
                                .email("dev@invoiceops.local"))
                        .license(new License()
                                .name("Proprietary")
                                .url("https://invoiceops.local/license")));
    }
}
