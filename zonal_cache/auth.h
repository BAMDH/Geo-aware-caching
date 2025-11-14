#ifndef AUTH_H
#define AUTH_H
#include "common.h"

// --- Función para extraer la api key y session id del header ---
int extract_key_session(const char *buf, size_t len, const char* type, char *out, 
                            size_t out_size);


#endif