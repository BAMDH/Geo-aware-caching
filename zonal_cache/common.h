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
#include <sys/ioctl.h>
#include <net/if.h>

#define BUFFER_SIZE 512 
#define API_KEY_SIZE 64
#define SESSION_ID_SIZE 64
#define MAX_HOSTNAME 256
#define TYPE_AUTH 50
#define REPLACE_POLICY_SIZE 50
#define FILE_TYPE_SIZE 50


extern const char* cache_api_key;

extern const char* url_login_vercel;

extern const char* PORT;

extern const char* HOST_API; //"api-node-sv"

extern const char* PORT_API; // "3000"

// --- Struct para el threat que maneja el cliente ---

typedef struct {
    int client_fd;
    struct sockaddr_in client_addr;
    char buffer[BUFFER_SIZE];   // tamaño suficiente para request
    size_t len;          // bytes leídos
} thread_arg_t;

// Definir struct para config del cache
typedef struct {
    char cache_name[64];
    char country[64];
    char ip[20];
    double latitude;
    double longitude;
} cache_config;

// --- Struct para los parametros que se envian a la api ---
typedef struct {
    char domain[MAX_HOSTNAME];    // <-- espacio suficiente para guardar el host
    char subdomain[MAX_HOSTNAME];    // <-- espacio suficiente para guardar el host
    char type_auth[TYPE_AUTH];
    char api_key[API_KEY_SIZE];
    char session_id[SESSION_ID_SIZE];
    cache_config cache;
} params_t;

  // funcion de brandon, enviar domain, tamaño, tipo politica de reemplazo, tipo de archivo
// --- Struct para la config del domain ---
typedef struct {
    char domain[MAX_HOSTNAME];    
    int size;    
    char replacement_policy[REPLACE_POLICY_SIZE];
    char file_type[FILE_TYPE_SIZE];
} config_domain;

#endif
