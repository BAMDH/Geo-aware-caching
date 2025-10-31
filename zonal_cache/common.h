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
#include <json-c/json.h>

#define PORT 8080       // Puerto de prueba (evita 53)
#define BUFFER_SIZE 512 
#define API_KEY_SIZE 64
#define SESSION_ID_SIZE 64
#define HOST_API "api-node-sv"
#define PORT_API "3000"
#define MAX_HOSTNAME 256
#define TYPE_AUTH 50

extern const char* cache_api_key;  

// --- Struct para el threat que maneja el cliente ---

typedef struct {
    int client_fd;
    struct sockaddr_in client_addr;
    char buffer[BUFFER_SIZE];   // tamaño suficiente para request
    size_t len;          // bytes leídos
} thread_arg_t;


// --- Struct para los parametros que se envian a la api ---
typedef struct {
    char domain[MAX_HOSTNAME];    // <-- espacio suficiente para guardar el host
    char subdomain[MAX_HOSTNAME];    // <-- espacio suficiente para guardar el host
    char type_auth[TYPE_AUTH];
    char api_key[API_KEY_SIZE];
    char session_id[SESSION_ID_SIZE];
} params_t;

#endif
