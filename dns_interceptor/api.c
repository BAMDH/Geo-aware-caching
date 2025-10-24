#include "api.h"

/////////////////////////// Comunicarse con el API //////////////////////////////////

// --- Callback para recibir respuesta ---
size_t write_callback(char *ptr, size_t size, size_t nmemb, void *userdata) {
    strncat((char*)userdata, ptr, size * nmemb);
    return size * nmemb;
}

// --- Función para enviar solicitud a la API con método GET o POST ---
// Retorna Unknown si la respuesta HTTP es 404
char* call_api(params_t *params, const char* endpoint, const char* method) {
    CURL *curl = curl_easy_init();
    if (!curl) return NULL;

    char url[512];
    char body[2048] = ""; // para POST
    char host[] = "dns-api-sv"; // host.docker.internal
    char port[] = "5000";

    if (strcasecmp(method, "POST") == 0) {
        snprintf(body, sizeof(body),
            "{ \"dns_encoded\": \"%s\" }",
            params->dns_encoded);
        printf("El body a enviar es %s", body);
        
    }

    if (strcasecmp(method, "GET") == 0) {
        snprintf(url, sizeof(url), "http://%s:%s/%s/%s/%s",
                 host, port, endpoint, params->hostname, params->ip_source);
        printf("\nSe envia a la API el url: %s", url);
    
        curl_easy_setopt(curl, CURLOPT_URL, url);
        curl_easy_setopt(curl, CURLOPT_HTTPGET, 1L);
    } 
    else if (strcasecmp(method, "POST") == 0) {
        snprintf(url, sizeof(url), "http://%s:%s/%s", host, port, endpoint);
        curl_easy_setopt(curl, CURLOPT_URL, url);
        curl_easy_setopt(curl, CURLOPT_POST, 1L);
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, body);
        curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, (long)strlen(body));

        struct curl_slist *headers = NULL;
        headers = curl_slist_append(headers, "Content-Type: application/json");
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
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
        return strdup("Unknown");
    }

    return response;
}