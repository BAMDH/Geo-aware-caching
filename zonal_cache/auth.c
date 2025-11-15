#include "common.h"
#include "auth.h"

// Extrae el session_id del header Authorization: Bearer <session_id> o 
// el api key del header 
int extract_key_session(const char *buf, size_t len, const char* type, char *out, size_t out_size) {

    printf("\n========== BUFFER RECIBIDO (%zu bytes) ==========\n", len);

    for (size_t i = 0; i < len; i++) {
        unsigned char c = buf[i];

        if (c == '\r') printf("[\\r]");
        else if (c == '\n') printf("[\\n]\n");
        else if (c >= 32 && c <= 126) printf("%c", c);  // imprimible
        else printf("[0x%02X]", c);                    // no imprimible
    }

    printf("\n========== FIN DEL BUFFER ==========\n\n");

    const char *prefix = NULL;

    if (strcmp(type, "api-key") == 0) {
        prefix = "api-key:";
    } else if (strcmp(type, "userpass") == 0) {
        prefix = "Cookie:";
    } else {
        printf("[extract_key_session] Tipo no soportado: %s\n", type);
        return -1;
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
            while (pos < len && (buf[pos] == ' ' || buf[pos] == '\t')) pos++;  // saltar espacios

            size_t k = 0;

            // Caso cookie: buscar "session_id=" dentro del valor
            if (strcmp(type, "session_id") == 0) {
                const char *cookie_start = strstr(buf + pos, "session_id=");
                if (!cookie_start) {
                    printf("[extract_key_session] No se encontró session_id en la cookie\n");
                    return -1;
                }
                cookie_start += strlen("session_id=");
                while (cookie_start[k] != ';' && cookie_start[k] != '\r' && cookie_start[k] != '\n' && k < out_size - 1) {
                    out[k] = cookie_start[k];
                    k++;
                }
            } else { // x-api-key
                while (pos + k < len && buf[pos + k] != '\r' && buf[pos + k] != '\n' && k < out_size - 1) {
                    out[k] = buf[pos + k];
                    k++;
                }
            }

            out[k] = '\0';
            printf("[extract_key_session] %s extraído: '%s'\n", type, out);
            fflush(stdout);
            return 1;
        }
    }

    printf("[extract_key_session] No se encontró la cabecera %s\n", type);
    fflush(stdout);
    return -1;
}
