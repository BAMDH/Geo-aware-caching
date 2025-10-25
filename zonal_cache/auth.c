#include "common.h"
#include "auth.h"

// --- Función para decodificar Base64 usando OpenSSL ---
unsigned char* base64_decode(const char* input, size_t* out_len) {
    BIO *b64 = BIO_new(BIO_f_base64());
    BIO *bmem = BIO_new_mem_buf(input, -1);
    bmem = BIO_push(b64, bmem);

    BIO_set_flags(bmem, BIO_FLAGS_BASE64_NO_NL);

    int input_len = strlen(input);
    unsigned char *buffer = (unsigned char*)malloc(input_len); 
    if (!buffer) {
        BIO_free_all(bmem);
        return NULL;
    }

    int decoded_len = BIO_read(bmem, buffer, input_len);
    if (decoded_len < 0) {
        free(buffer);
        BIO_free_all(bmem);
        return NULL;
    }

    *out_len = decoded_len;
    BIO_free_all(bmem);
    return buffer;
}

// Extrae el session_id del header Authorization: Bearer <session_id> o 
// el api key del header 
char* extract_key_session(const char *buf, size_t len, char* type) {

    const char *prefix;
    size_t size_var;

    if(strcmp(type, "api-key")){
        prefix = "x-api-key:";
        size_var = API_KEY_SIZE;
    }
    else{
        prefix = "Authorization: Bearer ";
        size_var = SESSION_ID_SIZE;
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

            // copiar session_id hasta fin de línea o tamaño máximo
            char *key_session = malloc(size_var);
            if (!key_session) return NULL;

            size_t k = 0;
            while (pos + k < len && buf[pos + k] != '\r' && buf[pos + k] != '\n' && k < size_var - 1) {
                key_session[k] = buf[pos + k];
                k++;
            }
            key_session[k] = '\0';

            printf("Session ID o api key extraído: %s\n", key_session);
            fflush(stdout);
            return key_session;
        }
    }

    printf("No se encontró cabecera Authorization: Session\n");
    fflush(stdout);
    return NULL;
}
