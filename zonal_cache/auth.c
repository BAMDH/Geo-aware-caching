#include "common.h"
#include "auth.h"

// Extrae el session_id del header Authorization: Bearer <session_id> o 
// el api key del header 
int extract_key_session(const char *buf, size_t len, const char* type, char *out, 
                            size_t out_size) {

    const char *prefix;

    if(strcmp(type, "x-api-key") == 0){
        prefix = "x-api-key:";
    }
    else {
        prefix = "Authorization: Bearer ";
    }

    size_t prefix_len = strlen(prefix);

    for (size_t i = 0; i + prefix_len < len; i++) {
        int match = 1;
        for (size_t j = 0; j < prefix_len; j++) {
            if (tolower((unsigned char)buf[i+j]) != tolower((unsigned char)prefix[j])) {
                match = 0;
                break;
            }
        }

        if (match) {
            size_t pos = i + prefix_len;
            while (pos < len && buf[pos] == ' ') pos++;  // saltar espacios

            size_t k = 0;
            while (pos + k < len && buf[pos + k] != '\r' && buf[pos + k] != '\n' && k < out_size - 1) {
                out[k] = buf[pos + k];
                k++;
            }
            out[k] = '\0';

            printf("[extract_key_session] %s extraído: '%s'\n", type, out);
            fflush(stdout);
            return 1;  // éxito
        }
    }

    printf("[extract_key_session] No se encontró la cabecera %s\n", type);
    fflush(stdout);
    return -1; // no encontrado
}


