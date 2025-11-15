#include "server.h"
#include "api.h"
#include "auth.h"
#include "json.h"
#include "cache_management/cache.h"

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

    thread_arg_t *targ = (thread_arg_t*) arg;
    int fd = targ->client_fd;

    char buffer[BUFFER_SIZE];
    ssize_t total = 0;

    // Leer hasta recibir \r\n\r\n (fin de headers)
    while (1) {
        ssize_t n = recv(fd, buffer + total, sizeof(buffer) - total - 1, 0);
        if (n <= 0) break;

        total += n;
        buffer[total] = '\0';

        // Si ya llegó el final del header
        if (strstr(buffer, "\r\n\r\n")) {
            break;
        }
    }

    // Guardar el request completo en targ
    targ->len = total;
    memcpy(targ->buffer, buffer, total);
    targ->buffer[total] = '\0';

    char client_ip[INET_ADDRSTRLEN];
    inet_ntop(AF_INET, &targ->client_addr.sin_addr, client_ip, sizeof(client_ip));

    int key_session = 0;

    char* response_api = NULL;
    char* ip_service;

    char response[2048];

    params_t params = {0};

    extract_host(targ->buffer, targ->len, params.domain);

    printf("El domain obtenido es de %s\n", params.domain);
    fflush(stdout);

    response_api = call_api(&params, "domain/type_auth"); 

    printf("El response de api es %s\n", response_api);
    fflush(stdout);
    
    parse_host_json(response_api, &params); 

    printf("El domain %s, subdomain %s y auth %s obtenido\n", params.domain, params.subdomain, params.type_auth);
    fflush(stdout);
    
    // endpoint recibe domain 
    response_api = call_api(&params, "domain/config"); 
    
    // funcion de brandon, enviar config de la api 
    //set_config(response_api);

    //strncpy(params.type_auth, "session_id", TYPE_AUTH - 1);
    //params.type_auth[TYPE_AUTH - 1] = '\0';

    if (params.type_auth[0] == '\0') {

        snprintf(response, sizeof(response),
            "HTTP/1.1 400 Bad Request\r\n"
            "Content-Length: %zu\r\n"
            "Content-Type: text/plain\r\n"
            "\r\n"
            "Error: Domain no encontrado\n",
            strlen("Error: Domain no encontrado\n")
        );

    } else if (strcmp(params.type_auth, "api-key") == 0) {

        key_session = extract_key_session(
            targ->buffer, targ->len, "api-key",
            params.api_key, API_KEY_SIZE
        );

        printf("La api key extraida es %s\n", params.api_key);
        fflush(stdout);

    } else {
        key_session = extract_key_session(
            targ->buffer, targ->len, "userpass",
            params.session_id, SESSION_ID_SIZE
        );

        printf("El session_id extraido es %s\n", params.session_id);
        fflush(stdout);
    }

    if (key_session == -1) {

        printf("Se va a redirigir a vercel\n");
        fflush(stdout);

        if (strcmp(params.type_auth, "api-key") == 0) {

            snprintf(response, sizeof(response),
                "HTTP/1.1 401 Unauthorized\r\n"
                "Content-Length: %zu\r\n"
                "Content-Type: text/plain\r\n"
                "\r\n"
                "Error: no se envió autenticación\n",
                strlen("Error: no se envió autenticación\n")
            );

        } else {

            char url_with_params[512]; // buffer separado

            snprintf(url_with_params, sizeof(url_with_params),
                    "%s?domain=%s&subdomain=%s",
                    url_login_vercel, params.domain, params.subdomain);

            snprintf(response, sizeof(response),
                "HTTP/1.1 302 Found\r\n"
                "Location: %s\r\n"
                "Content-Length: 0\r\n"
                "Connection: close\r\n"
                "\r\n",
                url_with_params
            );
        }

    } else if (key_session == 1) {

        response_api = call_api(&params, "domain/validate/key_session");

        if (response_api != NULL) {

            if (strstr(response_api, "true")){

                ip_service = call_api(&params, "domain/ip");

                printf("El ip del dominio es %s\n", ip_service);
                fflush(stdout);

                // Aquí se llama al servicio, web o api

                // PARTE DE BRANDON

                snprintf(response, sizeof(response),
                "HTTP/1.1 200 FUNCIONA BIEN\r\n"
                "Content-Type: text/plain\r\n"
                "Content-Length: %zu\r\n"
                "Connection: close\r\n"
                "\r\n"
                "Mensaje: funciona\n",
                strlen("Mensaje: funciona\n")
            );

            }

            else{

                snprintf(response, sizeof(response),
                    "HTTP/1.1 302 Found\r\n"
                    "Location: %s\r\n"
                    "Content-Length: 0\r\n"
                    "Connection: close\r\n"
                    "\r\n",
                    url_login_vercel
                );
            }


        } else {

            snprintf(response, sizeof(response),
                "HTTP/1.1 401 Unauthorized\r\n"
                "Content-Type: text/plain\r\n"
                "Content-Length: %zu\r\n"
                "Connection: close\r\n"
                "\r\n"
                "Error: autenticacion invalida\n",
                strlen("Error: autenticacion invalida\n")
            );
        }
    }

    // Enviar respuesta
    write(fd, response, strlen(response));

    close(fd);
    free(targ);
    return NULL;
}
