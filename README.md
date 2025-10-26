# Endpoints API Node JS

## Zonal Cache

1. domain/type_auth?domain=%s

Method: GET

Parameters:
- domain: Dominio en firebase (amazon.com)

Returns: Retorna el tipo de autenticacion del dominio en firebase (api-key ó user-password)

2. domain/validate/key_session?session_id=%s / domain/validate/key_session?api_key=%s

Method: GET

Parameters: Recibe uno de los 2 parametros
- key_session: El session key enviado por el usuario
- api_key: El api_key enviado por el usuario

Returns: Retorna True o False, dependiendo de si el session key o el api key son validos

3. domain/ip/?domain=%s?subdomain=%s

Method: GET

Parameters:
- domain: Dominio en firebase (amazon.com)
- subdomain: El subdominio del dominio (www, api) -> (www.amazon.com, api.amazon.com)

Returns: Retorna la ip del subdominio (292.329.268.25)
