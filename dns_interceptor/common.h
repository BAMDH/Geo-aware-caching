#ifndef COMMON_H
#define COMMON_H

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>       // close
#include <arpa/inet.h>    // inet_ntop, htons, ntohs
#include <sys/socket.h>
#include <netinet/in.h>
#include <openssl/bio.h>
#include <openssl/evp.h>
#include <curl/curl.h> // Libreria para https
#include <pthread.h>

#define PORT 53       // Puerto de prueba (evita 53)
#define BUFFER_SIZE 512  // Tamaño típico de paquete DNS

extern const char *host_api;
extern const char *port_api;

// --- Struct para el threat que maneja el cliente ---
typedef struct {
    int sockfd;
    unsigned char buffer[BUFFER_SIZE];
    ssize_t len;
    struct sockaddr_in client_addr;
    socklen_t client_len;
} thread_arg_t;

// --- Struct para los parametros que se envian a la api ---
typedef struct {
    char* ip_source;
} params_t;

typedef struct {
    unsigned char *buffer;
    size_t length;
} dns_response_t;

#endif
