#ifndef SERVER_H
#define SERVER_H
#include "common.h"


//////////////////////////// Comunicarse con el cliente /////////////////////////////////

// --- Función que envía la respuesta al cliente ---
void send_response(int sockfd,
                   unsigned char *buffer, ssize_t len,
                   struct sockaddr_in *client_addr, socklen_t client_len) ;

// --- Función que maneja el cliente, es utilizada por cada thread ---
void* handle_client(void* arg);

#endif