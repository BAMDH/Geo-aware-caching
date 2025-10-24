#include "dns_manager.h"
#include "base_64.h"
#include "api.h"

//////////////////////////////// Leer Paquete DNS /////////////////////////////////////

// --- Extrae el host DNS (QNAME) desde el buffer ---
int extract_host(const unsigned char *buffer, ssize_t len, char *out) {
        
    if(len < 12) return -1; // paquete demasiado corto (header incompleto)
    
    const unsigned char *ptr = buffer + 12; // inicio de QNAME segun el protocolo RFC1035
    const unsigned char *end = buffer + len; // Fin de QNAME
    size_t pos = 0;

    while(ptr < end) {

        unsigned int label_len = *ptr;

        //Label_len indica la cantidad de bytes antes del siguiente .
        // Ejemplo: 3www6prueba3com
        // Label: 3, 6, 3

        if(label_len == 0) { // fin del QNAME
            if(pos > 0) out[pos-1] = '\0'; // quitar el último punto
            else out[0] = '\0';
            return 0;
        }

        ptr++; // mover al primer caracter del label

        // ptr apunta a los caracteres: www, prueba, com

        if(ptr + label_len > end){
            return -2; // paquete truncado
        }
        if(pos + label_len + 1 >= MAX_HOSTNAME){
            return -3; // buffer de salida pequeño
        }

        // copiar el label
        for(unsigned int i = 0; i < label_len; i++) {
            out[pos] = (char)(*ptr);
            pos++;
            ptr++;
        }

        out[pos] = '.'; // separar labels
        pos++;
    }

    return -4; // formato inválido
}

// Función para construir el paquete dns de respuesta
unsigned char* build_dns_reply_buffer(unsigned char *query, size_t query_len,
                                      unsigned char *response, size_t response_len,
                                      size_t *out_len)
{
    // Calcular longitud total
    size_t total_len = query_len + response_len;
    
    // Reservar memoria dinámica
    unsigned char *buffer = malloc(total_len);
    if (!buffer) return NULL;

    // Copiar header
    memcpy(buffer, query, 12);

    // Modificar flags: QR=1 (respuesta)
    buffer[2] |= 0x80; // QR=1
    buffer[3] &= 0x0F; // RCODE=0

    // Ajustar counts: ANCOUNT=1, NSCOUNT=0, ARCOUNT=0
    buffer[6] = 0x00;
    buffer[7] = 0x01;
    buffer[8] = buffer[9] = buffer[10] = buffer[11] = 0x00;

    // Copiar pregunta
    size_t question_len = query_len - 12;
    memcpy(buffer + 12, query + 12, question_len);

    // Copiar respuesta
    memcpy(buffer + 12 + question_len, response, response_len);

    if (out_len) *out_len = total_len;
    return buffer;
}

//////////////////////////////// Handle Paquetes /////////////////////////////////////

// --- Función que maneja los paquetes no standar (QR != 0 ó OPCODE != 0) ---
dns_response_t handle_non_query_standar(unsigned char dns_packet[BUFFER_SIZE], ssize_t len_dns){

    // Codificar en Base64
    char *dns_base64 = base64_encode(dns_packet, len_dns);

    params_t params;
    params.dns_encoded = strdup(dns_base64);

    printf("El parametro de api es en dns resolver %s", params.dns_encoded);
    fflush(stdout);
  
    char endpoint[] = "api/dns_resolver"; // Endpoint a consultar

    char* response_api = call_api(&params, endpoint, "POST");

    free(params.dns_encoded);

    printf("El response de api es en dns resolver %s", response_api);
    fflush(stdout);

    char* response = NULL;

    dns_response_t dns_response = { .buffer = NULL, .length = 0 }; 

    size_t len_response;

    // Hubo un error al llamar la API
    if (response_api == NULL) {
        printf("Hubo un error\n");
        
    } 
    
    // API con error 404
    else if(strcmp(response_api, "Unknown") == 0){

        free(response_api);
        printf("No hay registro\n");
        
    }
    
    // API retornó correctamente
    else {
        // Se decodifica
        response = base64_decode(response_api, &len_response);  
        free(response_api);
        dns_response.buffer = response;
        dns_response.length = len_response;

    }

    free(dns_base64);
   
    return dns_response;

}

// --- Función que maneja los paquetes standar (QR = 0 y OPCODE = 0) ---
dns_response_t handle_query_standar(unsigned char dns_packet[BUFFER_SIZE], ssize_t len_dns, char* ip_source){

    char hostname[MAX_HOSTNAME];
    
    extract_host(dns_packet, len_dns, hostname);

    params_t params;
    params.hostname = strdup(hostname);  // copia segura en heap
    params.ip_source = strdup(ip_source); // copia segura si es necesario

    printf("\nEl hostname es %s", hostname);  

    char endpoint[] = "api/exists"; // Endpoint a consultar

    char* response_api = call_api(&params, endpoint, "GET");

    printf("El response de api desde exists es %s", response_api);
    fflush(stdout);

    free(params.hostname);
    free(params.ip_source);

    char* response = NULL;

    dns_response_t dns_response = { .buffer = NULL, .length = 0 }; // al declarar

    size_t len_response = 0;

    // Hubo un error en la consulta
    if (response_api == NULL) {
        printf("Hubo un error\n");
        return dns_response;
    }
    // La API no encontró el host
    else if(strcmp(response_api, "Unknown") == 0){
        printf("La API no lo encontro\n");
        dns_response = handle_non_query_standar(dns_packet, len_dns);
        
    }
    // La API encontró el host satisfactoriamente
    else{
        response = base64_decode(response_api, &len_response);

        printf("El response de api desde exists es %s", response);
        fflush(stdout);

        dns_response.buffer = build_dns_reply_buffer(dns_packet, len_dns, response, len_response,
             &dns_response.length);

        printf("Response DNS (hex): ");
        for (size_t i = 0; i < dns_response.length; i++) {
            printf("%02X ", dns_response.buffer[i]);
        }
        printf("\n");
        fflush(stdout);
                
    }
   
    // Liberar memoria

    free(response_api);
  
    return dns_response;

}

