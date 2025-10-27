#ifndef API_H
#define API_H
#include "common.h"

/////////////////////////// Comunicarse con el API //////////////////////////////////

// --- Callback para recibir respuesta ---
size_t write_callback(char *ptr, size_t size, size_t nmemb, void *userdata);

// --- Función para enviar solicitud a la API ---
// Retorna Unknown si la respuesta HTTP es 404
char* call_api(params_t *params, const char* endpoint);

#endif