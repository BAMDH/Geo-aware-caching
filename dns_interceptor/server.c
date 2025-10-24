#include "server.h"
#include "dns_manager.h"

//////////////////////////// Comunicarse con el cliente /////////////////////////////////

// --- Función que envía la respuesta al cliente ---
void send_response(int sockfd,
                   unsigned char *buffer, ssize_t len,
                   struct sockaddr_in *client_addr, socklen_t client_len) {

    // Se envia la respuesta al cliente
    ssize_t sent = sendto(sockfd, buffer, len, 0,
                          (struct sockaddr*)client_addr, client_len);
    if (sent < 0) {
        perror("Error al enviar respuesta");
    } else {
        printf("Respuesta enviada (%zd bytes)\n", sent);
        fflush(stdout);
    }
}

// --- Función que maneja el cliente, es utilizada por cada thread ---
void* handle_client(void* arg) {
    thread_arg_t *targ = (thread_arg_t*)arg;

    char client_ip[INET_ADDRSTRLEN];
    inet_ntop(AF_INET, &targ->client_addr.sin_addr, client_ip, sizeof(client_ip));
    printf("Paquete recibido de %s:%d, tamaño = %zd bytes\n",
            client_ip, ntohs(targ->client_addr.sin_port), targ->len);
    fflush(stdout);

    // Leer QR y OPCODE desde buffer[2]
    unsigned int number = targ->buffer[2];
    unsigned int qr = (number << 24) >> 31;         
    unsigned int opcode = (number << 25) >> 28;    

    // char para obtener la respuesta
    dns_response_t response;

    if(qr == 0 && opcode == 0) {
        // Si el paquete es estandar
        // Se le envia el paquete dns y el largo del paquete
        response = handle_query_standar(targ->buffer, targ->len, client_ip);
    }
    else{
        // El paquete no es estandar
        // Se le envia el paquete dns y el largo del paquete
        response = handle_non_query_standar(targ->buffer, targ->len);
    }

    // Se envia la respuesta
    send_response(targ->sockfd, response.buffer, response.length,
                  &targ->client_addr, targ->client_len);

    free(targ); // liberar memoria del argumento

    if(response.buffer != NULL){

        free(response.buffer); // liberar memoria de la respuesta
    }
    
    return NULL;
}
