#ifndef BASE_64_H
#define BASE_64_H
#include "../common.h"

////////////////////////////////// BASE 64 ////////////////////////////////////////////

// --- Función para codificar en Base64 usando OpenSSL ---
char* base64_encode(const unsigned char* input, size_t length);

// --- Función para decodificar Base64 usando OpenSSL ---
unsigned char* base64_decode(const char* input, size_t* out_len);

#endif