#include "common.h"
#include "server.h"

///////////////////////////////// Main ////////////////////////////////////////////

int main() {
    int sockfd;
    struct sockaddr_in server_addr, client_addr;
    socklen_t client_len = sizeof(client_addr);

    // Crear socket TCP
    if ((sockfd = socket(AF_INET, SOCK_STREAM, 0)) < 0) {
        perror("Error al crear socket");
        exit(EXIT_FAILURE);
    }

    // Permitir reusar la dirección
    int opt = 1;
    setsockopt(sockfd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

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

    if (listen(sockfd, 5) < 0) {
        perror("Error listen");
        close(sockfd);
        exit(EXIT_FAILURE);
    }

    printf("Servidor TCP escuchando en el puerto %d...\n", PORT);

    while (1) {
        int client_fd = accept(sockfd, (struct sockaddr*)&client_addr, &client_len);
        if (client_fd < 0) {
            perror("Error accept");
            continue;
        }

        thread_arg_t *targ = malloc(sizeof(thread_arg_t));
        targ->client_fd = client_fd;
        targ->client_addr = client_addr;

        pthread_t tid;
        pthread_create(&tid, NULL, handle_client, targ);
        pthread_detach(tid);
    }

    close(sockfd);
    return 0;
}