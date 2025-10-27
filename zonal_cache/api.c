#include "api.h"

/////////////////////////// Comunicarse con el API //////////////////////////////////

// --- Callback para recibir respuesta ---
size_t write_callback(char *ptr, size_t size, size_t nmemb, void *userdata) {
    strncat((char*)userdata, ptr, size * nmemb);
    return size * nmemb;
}

// --- Función para enviar solicitud a la API con método GET o POST ---
// Retorna Unknown si la respuesta HTTP es 404
char* call_api(params_t *params, const char* endpoint) {
    CURL *curl = curl_easy_init();
    if (!curl) return NULL;

    char url[1024];
    char body[2048] = ""; // para POST
   
    // Se llama al metodo GET tipo de autenticacion del dominio
    if (strcasecmp(endpoint, "domain/type_auth") == 0) {
        snprintf(url, sizeof(url), "http://%s:%s/domain/type_auth?domain=%s",
                HOST_API, PORT_API, params->domain);
        printf("\nSe envia a la API el url: %s", url);

        curl_easy_setopt(curl, CURLOPT_URL, url);
        curl_easy_setopt(curl, CURLOPT_HTTPGET, 1L);
    } 

    // Se llama al metodo GET tipo de autenticacion del dominio
    else if (strcasecmp(endpoint, "domain/validate/key_session") == 0) {

        // Caso para enviar api key
        if (params->session_id != NULL)
            snprintf(url, sizeof(url), "http://%s:%s/domain/validate/key_session?domain=%s?subdomain=%s?session_id=%s",
                    HOST_API, PORT_API, params->domain, params->subdomain, params->session_id);

        // Caso para enviar session id
        else
            snprintf(url, sizeof(url), "http://%s:%s/domain/validate/key_session?domain=%s?subdomain=%s?api_key=%s",
                    HOST_API, PORT_API, params->domain, params->subdomain, params->api_key);

        printf("\nSe envia a la API el url: %s", url);

        curl_easy_setopt(curl, CURLOPT_URL, url);
        curl_easy_setopt(curl, CURLOPT_HTTPGET, 1L);
    }

    // Se llama al metodo GET IP del dominio
    if (strcasecmp(endpoint, "domain/ip") == 0) {
        snprintf(url, sizeof(url), "http://%s:%s/domain/ip?domain=%s?subdomain=%s",
                HOST_API, PORT_API, params->domain, params->subdomain);
        printf("\nSe envia a la API el url: %s", url);

        curl_easy_setopt(curl, CURLOPT_URL, url);
        curl_easy_setopt(curl, CURLOPT_HTTPGET, 1L);
    } 


    else {
        curl_easy_cleanup(curl);
        return NULL;
    }

    // Buffer para recibir la respuesta
    char* response = malloc(8192);
    if (!response) {
        curl_easy_cleanup(curl);
        return NULL;
    }
    response[0] = '\0';

    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_callback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, response);
    curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 0L);

    CURLcode res = curl_easy_perform(curl);
    if (res != CURLE_OK) {
        free(response);
        curl_easy_cleanup(curl);
        return NULL;
    }

    long http_code = 0;
    curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &http_code);
    curl_easy_cleanup(curl);

    if (http_code == 404) {
        free(response);
        return NULL;
    }

    return response;
}