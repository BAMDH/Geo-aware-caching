#ifndef SERVER_H
#define SERVER_H
#include "common.h"


//////////////////////////// Comunicarse con el cliente /////////////////////////////////

// Función para decodificar Base64 usando OpenSSL
unsigned char* base64_decode(const char* input, size_t* out_len);

// Función para manejar HTTP request y extraer API key o Basic Auth
char* extract_api_key(const char *buf, size_t len, char* type);

unsigned char* extract_basic_auth(const char *buf, size_t len);

// --- Función que maneja el cliente, es utilizada por cada thread ---
void* handle_client(void* arg);

#endif