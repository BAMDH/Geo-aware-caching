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

    // --- Agregar header con API key ---
    struct curl_slist *headers = NULL;
    char auth_header[128];
    
    snprintf(auth_header, sizeof(auth_header), "cache-api-key: %s", cache_api_key);
    headers = curl_slist_append(headers, auth_header);

    if (strcasecmp(endpoint, "cache/register") == 0) {

        headers = curl_slist_append(headers, "Content-Type: application/json");

        snprintf(url, sizeof(url), "http://%s:%s/cache/register", HOST_API, PORT_API);

        // Construir JSON con los datos del cache
        char post_fields[1024];
        snprintf(post_fields, sizeof(post_fields),
            "{"
                "\"cache_name\": \"%s\", "
                "\"country\": \"%s\", "
                "\"ip\": \"%s\", "
                "\"latitude\": %.6f, "
                "\"longitude\": %.6f"
            "}",
            params->cache.cache_name,
            params->cache.country,
            params->cache.ip,
            params->cache.latitude,
            params->cache.longitude
        );

        printf("\n[DEBUG] JSON enviado a la API:\n%s\n", post_fields);
        fflush(stdout);

        curl_easy_setopt(curl, CURLOPT_URL, url);           
        curl_easy_setopt(curl, CURLOPT_POST, 1L);            
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, post_fields);
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    }

    else if (strcasecmp(endpoint, "domain/config") == 0) {
        snprintf(url, sizeof(url), "http://%s:%s/domain/config?domain=%s",
                HOST_API, PORT_API, params->domain);
        printf("\nSe envia a la API el url: %s", url);

        curl_easy_setopt(curl, CURLOPT_URL, url);
        curl_easy_setopt(curl, CURLOPT_HTTPGET, 1L);
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);

    } 

    // Se llama al metodo GET tipo de autenticacion del dominio
    else if (strcasecmp(endpoint, "domain/type_auth") == 0) {
        snprintf(url, sizeof(url), "http://%s:%s/domain/type_auth?domain=%s",
                HOST_API, PORT_API, params->domain);
        printf("\nSe envia a la API el url: %s", url);

        curl_easy_setopt(curl, CURLOPT_URL, url);
        curl_easy_setopt(curl, CURLOPT_HTTPGET, 1L);
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);

    } 

    // Se llama al metodo GET tipo de autenticacion del dominio
    else if (strcasecmp(endpoint, "domain/validate/key_session") == 0) {

        char auth_client_header[128];

        printf("El params session id es  %s\n", params->session_id);
        fflush(stdout);

        // Caso para enviar api key
        if (params->session_id[0] != '\0'){
            snprintf(url, sizeof(url), "http://%s:%s/domain/validate/session_id?domain=%s&subdomain=%s",
                    HOST_API, PORT_API, params->domain, params->subdomain);
            
            snprintf(auth_client_header, sizeof(auth_client_header), 
                        "client-session-id: %s", params->session_id);
            headers = curl_slist_append(headers, auth_client_header);
        }

        // Caso para enviar session id
        else{

            snprintf(url, sizeof(url), "http://%s:%s/domain/validate/api_key?domain=%s&subdomain=%s",
                    HOST_API, PORT_API, params->domain, params->subdomain);
            snprintf(auth_client_header, sizeof(auth_client_header), 
                        "client-api-key: %s", params->api_key);
            headers = curl_slist_append(headers, auth_client_header);

            printf("El url a llamar es %s\n", url);
            fflush(stdout);

            printf("El param api key es %s\n", params->api_key);
            fflush(stdout);

        }

        printf("\nSe envia a la API el url: %s", url);

        curl_easy_setopt(curl, CURLOPT_URL, url);
        curl_easy_setopt(curl, CURLOPT_HTTPGET, 1L);
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);

    }

    // Se llama al metodo GET IP del dominio
    else if (strcasecmp(endpoint, "domain/ip") == 0) {
        snprintf(url, sizeof(url), "http://%s:%s/domain/ip?domain=%s&subdomain=%s",
                HOST_API, PORT_API, params->domain, params->subdomain);
        printf("\nSe envia a la API el url: %s", url);

        curl_easy_setopt(curl, CURLOPT_URL, url);
        curl_easy_setopt(curl, CURLOPT_HTTPGET, 1L);
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    } 


    else {
        curl_easy_cleanup(curl);
        return NULL;
    }

    // Buffer para recibir la respuesta
    char* response = malloc(8192);
    if (!response) {
        curl_slist_free_all(headers);
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
    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);

    if (http_code == 404) {
        free(response);
        return NULL;
    }

    return response;
}