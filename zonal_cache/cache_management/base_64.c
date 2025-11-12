#include "base_64.h"

////////////////////////////////// BASE 64 ////////////////////////////////////////////

// --- Función para codificar en Base64 usando OpenSSL ---
char* base64_encode(const unsigned char* input, size_t length) {
    BIO *b64 = BIO_new(BIO_f_base64());
    BIO *bmem = BIO_new(BIO_s_mem());

    BIO_set_flags(b64, BIO_FLAGS_BASE64_NO_NL); // Sin saltos de línea
    b64 = BIO_push(b64, bmem);

    BIO_write(b64, input, length);
    BIO_flush(b64);

    // Obtener puntero a los datos y su tamaño
    char *data_ptr;
    long data_len = BIO_get_mem_data(bmem, &data_ptr);

    // Copiar a buffer nuevo con '\0'
    char *buff = (char*)malloc(data_len + 1);
    memcpy(buff, data_ptr, data_len);
    buff[data_len] = '\0';

    BIO_free_all(b64);
    return buff;
}

// --- Función para decodificar Base64 usando OpenSSL ---
unsigned char* base64_decode(const char* input, size_t* out_len) {
    BIO *b64 = BIO_new(BIO_f_base64());
    BIO *bmem = BIO_new_mem_buf(input, -1); // leer de string null-terminated
    bmem = BIO_push(b64, bmem);

    BIO_set_flags(bmem, BIO_FLAGS_BASE64_NO_NL); // ignorar saltos de línea

    // Reservar buffer lo suficientemente grande
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
    return buffer; // puntero a los bytes decodificados
}