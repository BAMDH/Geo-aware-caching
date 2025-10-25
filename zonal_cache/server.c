#include "server.h"
#include "auth.h"

//////////////////////////// Comunicarse con el cliente /////////////////////////////////

// --- Función que maneja el cliente, es utilizada por cada thread ---
void* handle_client(void* arg) {
    thread_arg_t *targ = (thread_arg_t*)arg;
    char client_ip[INET_ADDRSTRLEN];
    inet_ntop(AF_INET, &targ->client_addr.sin_addr, client_ip, sizeof(client_ip));

    printf("Cliente conectado: %s:%d\n", client_ip, ntohs(targ->client_addr.sin_port));
    fflush(stdout);

    char buffer[BUFFER_SIZE];
    ssize_t bytes_read = read(targ->client_fd, buffer, sizeof(buffer)-1);

    char *api_key;
    unsigned char* basic_auth;

    if (bytes_read > 0) {
        printf("Recibidos %zd bytes\n", bytes_read);
        fflush(stdout);

        api_key = extract_key_session(buffer, bytes_read, "api-key");

        if (api_key == NULL){
            basic_auth = extract_key_session(buffer, bytes_read, "session-id");

            printf("El session_id extraido es %s\n", basic_auth);
            fflush(stdout);
        }

        else{  
            printf("La api key extraida es %s\n", api_key);
            fflush(stdout);
        }

        // Respuesta HTTP simple
        const char *response = "HTTP/1.1 200 OK\r\nContent-Length: 12\r\n\r\nHello World\n";
        write(targ->client_fd, response, strlen(response));
    }

    if (basic_auth != NULL)
        free(basic_auth);

    else
        free(api_key);

    close(targ->client_fd);
    free(targ);
    pthread_exit(NULL);
}