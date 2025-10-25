#ifndef COMMON_H
#define COMMON_H

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h> 
#include <ctype.h>
#include <unistd.h>       // close
#include <arpa/inet.h>    // inet_ntop, htons, ntohs
#include <sys/socket.h>
#include <netinet/in.h>
#include <openssl/bio.h>
#include <openssl/evp.h>
#include <curl/curl.h> // Libreria para https
#include <pthread.h>

#define PORT 8080       // Puerto de prueba (evita 53)
#define BUFFER_SIZE 512  // Tamaño típico de paquete DNS
#define API_KEY_SIZE 64
#define SESSION_ID_SIZE 64
#define HOST_API "api-node-sv"
#define PORT_API "3000"

// --- Struct para el threat que maneja el cliente ---
typedef struct {
    int client_fd;
    struct sockaddr_in client_addr;
} thread_arg_t;

// --- Struct para los parametros que se envian a la api ---
typedef struct {
    char* domain;
    char* api_key;
    char* session_id;
} params_t;

#endif
