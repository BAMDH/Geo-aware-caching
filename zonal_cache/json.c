#include "common.h"

int parse_host_json(const char *json_str, params_t *params) {
    if (!json_str || !params) return -1;

    struct json_object *parsed_json;
    struct json_object *domain_obj;
    struct json_object *subdomain_obj;
    struct json_object *type_auth_obj; 

    // Parsear el string JSON
    parsed_json = json_tokener_parse(json_str);
    if (!parsed_json) {
        printf("Error al parsear JSON\n");
        return -2;
    }

    // Extraer "domain"
    if (json_object_object_get_ex(parsed_json, "domain", &domain_obj)) {
        strncpy(params->domain, json_object_get_string(domain_obj), MAX_HOSTNAME-1);
        params->domain[MAX_HOSTNAME-1] = '\0';
    } else {
        printf("No se encontró 'domain' en JSON\n");
        params->domain[0] = '\0';
    }

    // Extraer "subdomain"
    if (json_object_object_get_ex(parsed_json, "subdomain", &subdomain_obj)) {
        strncpy(params->subdomain, json_object_get_string(subdomain_obj), MAX_HOSTNAME-1);
        params->subdomain[MAX_HOSTNAME-1] = '\0';
    } else {
        printf("No se encontró 'subdomain' en JSON\n");
        params->subdomain[0] = '\0';
    }

    // Extraer "type_auth"
    if (json_object_object_get_ex(parsed_json, "type_auth", &type_auth_obj)) {
        strncpy(params->type_auth, json_object_get_string(type_auth_obj), sizeof(params->type_auth)-1);
        params->type_auth[sizeof(params->type_auth)-1] = '\0';
    } else {
        printf("No se encontró 'type_auth' en JSON\n");
        params->type_auth[0] = '\0';
    }

    // Liberar objeto JSON
    json_object_put(parsed_json);

    return 0;
}
