#ifndef AUTH_H
#define AUTH_H
#include "common.h"

// --- Función para decodificar Base64 usando OpenSSL ---
unsigned char* base64_decode(const char* input, size_t* out_len);

// --- Función para extraer la api key y session id del header ---
char* extract_key_session(const char *buf, size_t len, char* type);


#endif