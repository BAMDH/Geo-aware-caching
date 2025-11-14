# Endpoints API Node JS

## Zonal Cache

En todas las solicitudes se envia en el header el cache-api-key: %s

1. domain/type_auth?domain=%s

Method: GET

Parameters:
- domain: Dominio en firebase (amazon.com)

Returns: Retorna un json en este formato

    {
    "domain": "example.com",
    "subdomain": "api",
    "type_auth": "x-api-key" ó  "session_id"
    }


2. domain/validate/api_key?domain=%s&subdomain=%s? / domain/validate/session_id/?domain=%s&subdomain=%s

Method: GET

Parameters: 
- Recibe uno de los 2 parametros en el header
    - client-session-id: El session key enviado por el usuario
    - client-api-key: El api_key enviado por el usuario
- domain
- subdomain

Returns: Retorna True o False, dependiendo de si el session key o el api key son validos

3. domain/ip?domain=%s?subdomain=%s

Method: GET

Parameters:
- domain: Dominio en firebase (amazon.com)
- subdomain: El subdominio del dominio (www, api) -> (www.amazon.com, api.amazon.com)

Returns: Retorna la ip del subdominio (292.329.268.25)
