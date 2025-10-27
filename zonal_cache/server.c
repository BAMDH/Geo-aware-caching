#include "server.h"
#include "api.h"
#include "auth.h"
#include "json.h"

//////////////////////////// Comunicarse con el cliente /////////////////////////////////



int extract_host(const char *buffer, ssize_t len, char *out) {
   
    fwrite(buffer, 1, len, stdout);
    const char *host_start = strstr(buffer, "Host:");
    if (!host_start) {
        return -1;
    }
  
    host_start += 5; // saltar "Host:"
    while (*host_start == ' ' || *host_start == '\t') {
        host_start++;
    }

    const char *host_end = host_start;
    while (host_end < buffer + len && *host_end != '\r' && *host_end != '\n') host_end++;

    size_t host_len = host_end - host_start;

    if (host_len >= MAX_HOSTNAME) host_len = MAX_HOSTNAME - 1;

    memcpy(out, host_start, host_len);
    out[host_len] = '\0';
   
    // limpiar espacios/tabs finales
    while (host_len > 0 && (out[host_len-1] == ' ' || out[host_len-1] == '\t')) {
        out[host_len-1] = '\0';
        host_len--;
    }

    return 0;
}


// --- Función que maneja el cliente, es utilizada por cada thread ---
void* handle_client(void* arg) {
    thread_arg_t *targ = (thread_arg_t*)arg;
    char client_ip[INET_ADDRSTRLEN];
    inet_ntop(AF_INET, &targ->client_addr.sin_addr, client_ip, sizeof(client_ip));

    printf("Cliente conectado: %s:%d\n", client_ip, ntohs(targ->client_addr.sin_port));
    fflush(stdout);

    int key_session = 0;

    char* response_api = NULL;

    char* ip_service;

    const char *response;

    params_t params = {0};  // inicializa todo a cero, los arrays quedan con '\0'

    printf("Entra al server\n");
    fflush(stdout);

    printf("El buffer es  %s\n", targ->buffer);
    fflush(stdout);

    extract_host(targ->buffer, targ->len, params.domain);

    printf("El domain obtenido es de %s\n", params.domain);
    fflush(stdout);

    //response_api = call_api(params, "domain/type_auth");

    parse_host_json(response_api, &params);

    strcpy(params.type_auth,"x-api-key");

    if(params.type_auth[0] == '\0'){

        // Respuesta HTTP simple
        response = 
        "HTTP/1.1 400 Bad Request\r\n"
        "Content-Length: 23\r\n"
        "Content-Type: text/plain\r\n"
        "\r\n"
        "Error: host no encontrado\n";

    }

    else if(strcmp(params.type_auth, "x-api-key") == 0){
        key_session = extract_key_session(targ->buffer, targ->len, "x-api-key", params.api_key, 
            API_KEY_SIZE);
        printf("La api key extraida es %s\n", params.api_key);
        fflush(stdout);
        
    }

    else {
        key_session = extract_key_session(targ->buffer, targ->len, "session_id", params.session_id, 
            SESSION_ID_SIZE);
        printf("El session_id extraido es %s\n", params.session_id);
        fflush(stdout);
    }

    if(key_session == -1){

        // Respuesta HTTP simple
        response =  
        "HTTP/1.1 401 Unauthorized\r\n"
        "Content-Length: 38\r\n"
        "Content-Type: text/plain\r\n"
        "\r\n"
        "Error: no se envió autenticación\n";
    }

    else if(key_session == 1){

        //response_api = call_api(&params, "domain/validate/key_session");

        if(response_api != NULL){

            ip_service = call_api(&params, "domain/ip");
            // Realizar solicitud al servicio requerido
        }

        else{

            // Respuesta HTTP simple
            response = 
            "HTTP/1.1 401 Unauthorized\r\n"
            "Content-Length: 38\r\n"
            "Content-Type: text/plain\r\n"
            "\r\n"
            "Error: autenticacion invalida\n";
        }

    }

    // Respuesta HTTP simple
    
    write(targ->client_fd, response, strlen(response));

    close(targ->client_fd);
    free(targ);
    pthread_exit(NULL);
}