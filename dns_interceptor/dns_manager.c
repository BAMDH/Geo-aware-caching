#include "dns_manager.h"
#include "api.h"

//////////////////////////////// Funciones DNS /////////////////////////////////////

// Función para construir el paquete DNS de respuesta a partir de un query y una IP
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <arpa/inet.h> // inet_pton

unsigned char* build_dns(unsigned char *query, size_t query_len,
                         const char *ip_str, size_t *out_len)
{
    if (!query || !ip_str) {
        printf("[ERROR] Parámetros inválidos en build_dns()\n");
        return NULL;
    }

    printf("[INFO] Construyendo respuesta DNS para IP: %s\n", ip_str);
    printf("[DEBUG] Longitud del query: %zu bytes\n", query_len);

    // Longitud base
    size_t question_len = query_len - 12;
    size_t answer_len = 16; // 12 bytes + 4 de IP
    size_t total_len = 12 + question_len + answer_len;

    printf("[DEBUG] Longitud pregunta: %zu bytes\n", question_len);
    printf("[DEBUG] Longitud respuesta: %zu bytes\n", answer_len);
    printf("[DEBUG] Longitud total: %zu bytes\n", total_len);

    unsigned char *buffer = malloc(total_len);
    if (!buffer) {
        printf("[ERROR] Fallo al asignar memoria\n");
        return NULL;
    }

    // --- Header ---
    memcpy(buffer, query, 12);
    printf("[DEBUG] Copiado header original (12 bytes)\n");

    // Modificar flags: QR=1 (respuesta)
    buffer[2] |= 0x80; // QR=1
    buffer[3] &= 0x0F; // RCODE=0
    printf("[DEBUG] Flags modificadas: QR=1, RCODE=0\n");

    // Ajustar counts: ANCOUNT=1, NSCOUNT=0, ARCOUNT=0
    buffer[6] = 0x00; buffer[7] = 0x01;
    buffer[8] = buffer[9] = buffer[10] = buffer[11] = 0x00;
    printf("[DEBUG] ANCOUNT=1, NSCOUNT=0, ARCOUNT=0\n");

    // --- Pregunta ---
    memcpy(buffer + 12, query + 12, question_len);
    printf("[DEBUG] Copiada sección de pregunta (%zu bytes)\n", question_len);

    // --- Respuesta ---
    unsigned char *ans_ptr = buffer + 12 + question_len;
    printf("[DEBUG] Offset de respuesta: %ld\n", ans_ptr - buffer);

    // Nombre (puntero)
    ans_ptr[0] = 0xC0;
    ans_ptr[1] = 0x0C;

    // Tipo A (0x0001)
    ans_ptr[2] = 0x00;
    ans_ptr[3] = 0x01;

    // Clase IN (0x0001)
    ans_ptr[4] = 0x00;
    ans_ptr[5] = 0x01;

    // TTL (300 seg)
    ans_ptr[6] = 0x00;
    ans_ptr[7] = 0x00;
    ans_ptr[8] = 0x01;
    ans_ptr[9] = 0x2C;

    // RDLENGTH = 4 bytes
    ans_ptr[10] = 0x00;
    ans_ptr[11] = 0x04;

    // RDATA = dirección IP
    struct in_addr ip;
    if (inet_pton(AF_INET, ip_str, &ip) != 1) {
        printf("[ERROR] IP inválida: %s\n", ip_str);
        free(buffer);
        return NULL;
    }
    memcpy(ans_ptr + 12, &ip.s_addr, 4);

    unsigned char *ip_bytes = (unsigned char *)&ip.s_addr;
    printf("[DEBUG] IP codificada: %u.%u.%u.%u\n",
           ip_bytes[0], ip_bytes[1], ip_bytes[2], ip_bytes[3]);

    if (out_len) *out_len = total_len;

    printf("[INFO] Respuesta DNS construida exitosamente (%zu bytes)\n", total_len);
    printf("------------------------------------------------------------\n");

    return buffer;
}

//////////////////////////////// Handle Paquetes /////////////////////////////////////

// --- Función que maneja los paquetes standar (QR = 0 y OPCODE = 0) ---
dns_response_t handle_dns(unsigned char dns_packet[BUFFER_SIZE], ssize_t len_dns, char* ip_source){

    params_t params;
    params.ip_source = strdup(ip_source); // copia segura si es necesario

    char endpoint[] = "ip_cache"; // Endpoint a consultar

    //char* response_api = call_api(&params, endpoint, "GET");

    char *response_api = "89.233.29.12";

    printf("El response de api es %s", response_api);
    fflush(stdout);

    free(params.ip_source);

    dns_response_t dns_response = { .buffer = NULL, .length = 0 }; // al declarar

    size_t len_response = 0;

    // Hubo un error en la consulta
    if (response_api == NULL) {
        printf("Hubo un error\n");
        return dns_response;
    }
    // La API encontró el host satisfactoriamente
    else{
        dns_response.buffer = build_dns(dns_packet, len_dns, response_api, 
            &dns_response.length);

        printf("Response DNS (hex): ");
        for (size_t i = 0; i < dns_response.length; i++) {
            printf("%02X ", dns_response.buffer[i]);
            fflush(stdout);
        }
    
    }
   
    // Liberar memoria

    //free(response_api);
  
    return dns_response;

}

