#include "common.h"
#include "server.h"

///////////////////////////////// Main ////////////////////////////////////////////
const char *host_api;
const char *port_api;

int main() {
    int sockfd;
    struct sockaddr_in server_addr, client_addr;
    socklen_t client_len = sizeof(client_addr);
    unsigned char buffer[BUFFER_SIZE];

    //  Crear socket UDP
    if ((sockfd = socket(AF_INET, SOCK_DGRAM, 0)) < 0) {
        perror("Error al crear socket");
        exit(EXIT_FAILURE);
    }

    // Configurar dirección del servidor
    memset(&server_addr, 0, sizeof(server_addr));
    server_addr.sin_family = AF_INET;
    server_addr.sin_addr.s_addr = INADDR_ANY;
    server_addr.sin_port = htons(PORT);

    // Bind del socket
    if (bind(sockfd, (struct sockaddr*)&server_addr, sizeof(server_addr)) < 0) {
        perror("Error bind");
        close(sockfd);
        exit(EXIT_FAILURE);
    }

    host_api = getenv("HOST_API");
    port_api = getenv("PORT_API");

    printf("Servidor UDP escuchando en el puerto %d...\n", PORT);

    // Loop para recibir paquetes
    while (1) {
        ssize_t len = recvfrom(sockfd, buffer, BUFFER_SIZE, 0,
                               (struct sockaddr*)&client_addr, &client_len);
        if (len < 0) {
            perror("Error recvfrom");
            continue;
        }

        // Crear estructura para pasar al thread
        thread_arg_t *targ = malloc(sizeof(thread_arg_t));
        targ->sockfd = sockfd;
        targ->len = len;
        targ->client_addr = client_addr;
        targ->client_len = client_len;
        memcpy(targ->buffer, buffer, len);

        pthread_t tid;
        pthread_create(&tid, NULL, handle_client, targ);
        pthread_detach(tid); // liberamos recursos automáticamente al terminar

    }

    close(sockfd);

    return 0;
}
