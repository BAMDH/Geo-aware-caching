#include "common.h"
#include "server.h"

///////////////////////////////// Main ////////////////////////////////////////////

const char* cache_api_key;

int main() {
    int sockfd;
    struct sockaddr_in server_addr, client_addr;
    socklen_t client_len = sizeof(client_addr);

    // Crear socket TCP
    if ((sockfd = socket(AF_INET, SOCK_STREAM, 0)) < 0) {
        perror("Error al crear socket");
        exit(EXIT_FAILURE);
    }

    // Configurar dirección del servidor
    memset(&server_addr, 0, sizeof(server_addr));
    server_addr.sin_family = AF_INET;
    server_addr.sin_addr.s_addr = INADDR_ANY;
    server_addr.sin_port = htons(PORT);

    if (bind(sockfd, (struct sockaddr*)&server_addr, sizeof(server_addr)) < 0) {
        perror("Error bind");
        close(sockfd);
        exit(EXIT_FAILURE);
    }

    if (listen(sockfd, 10) < 0) {
        perror("Error listen");
        close(sockfd);
        exit(EXIT_FAILURE);
    }

    cache_api_key = getenv("SERVICE_API_KEY");

    printf("Servidor TCP escuchando en el puerto %d...\n", PORT);
    fflush(stdout);

    printf("Servidor TCP escuchando en el puerto %d...\n", PORT);
    fflush(stdout);

    printf("LA API KEY OBTENIDA DESDE MAIN ES DE %s", cache_api_key);
    fflush(stdout);

    while (1) {
        int client_fd = accept(sockfd, (struct sockaddr*)&client_addr, &client_len);
        if (client_fd < 0) {
            perror("Error accept");
            fflush(stdout);
            continue;
        }

        char buffer[BUFFER_SIZE];
        ssize_t bytes_read = recv(client_fd, buffer, sizeof(buffer), 0);
        if (bytes_read <= 0) {
            close(client_fd);
            continue;
        }

        thread_arg_t *targ = malloc(sizeof(thread_arg_t));
        targ->client_fd = client_fd;
        targ->client_addr = client_addr;
        targ->len = bytes_read;
        memcpy(targ->buffer, buffer, bytes_read);
        
        pthread_t tid;
        pthread_create(&tid, NULL, handle_client, targ);
        pthread_detach(tid);
    }

    close(sockfd);
    return 0;
}
