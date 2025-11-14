# Sistema Caché con Geolocalización

Este proyecto implementa un ecosistema completo compuesto por múltiples servicios distribuidos, cuyo objetivo es interceptar tráfico DNS, redirigirlo hacia caches zonales optimizadas por geolocalización, exponer APIs auxiliares y proporcionar una interfaz gráfica para la gestión de dominios, caché y autenticación.

# Componentes del Proyecto

La solución se organiza en los siguientes componentes principales:

## DNS Interceptor

El DNS Interceptor es una aplicación escrita en C que actúa como intermediario entre los clientes que realizan consultas DNS y las caches zonales distribuidas.  
Su función es interceptar solicitudes DNS hacia dominios específicos y decidir cuál cache zonal debe atender la petición.

## Funciones principales

- Interceptación de paquetes DNS.
- Se consulta a la API la IP de la caché más cercana, enviándole la IP del usuario.
- La API verifica en Firebase la ubicación del usuario y compara con la ubicación de las cachés.
- La API retorna la IP de la caché correspondiente.
- Se crea el paquete DNS con la respuesta obtenida desde la API.
- Se envía la respuesta al cliente.

## Zonal Cache

La Zonal Cache es un servicio implementado en C, encargado de almacenar en disco los recursos cacheados para cada dominio, según las configuraciones definidas en Firebase.  
Este componente es fundamental para mejorar la latencia, disponibilidad y eficiencia mediante políticas avanzadas de reemplazo de contenido.

## Funcionalidades principales

### 1. Autenticación con la API

La caché debe enviar una API Key al comunicarse con la API, para asegurar la seguridad en la comunicación.


### 2. Recepción y análisis de la solicitud

- Recibe la petición del cliente.
- Identifica el dominio consultado.
- Solicita a la API el tipo de autenticación requerido para ese dominio o URL.


### 3. Validación de autenticación del usuario

#### Autenticación mediante API Key

- Las peticiones pueden estar protegidas mediante el header:  
  x-api-key: <key>
- Si la API Key es inválida o ausente, el acceso se deniega.

#### Autenticación mediante usuario / password

Si el dominio requiere autenticación por credenciales:

- La caché verifica si la petición incluye un session_id.
- Si el session_id es inválido o no existe, el usuario es redirigido al formulario de login en Vercel.
- La caché valida credenciales y sesiones comunicándose directamente con la UI.
- Toda petición subsecuente debe incluir un session_id válido.

### 4. Consulta del archivo en cache

Una vez autenticado el usuario, la Zonal Cache verifica si el archivo solicitado está en el disco.

Cada archivo respeta:

- Su TTL correspondiente.
- La política de reemplazo definida para el dominio.
- Si el archivo existe y no ha expirado, se retorna al cliente.


### 5. Consulta al servicio de origen

Si el recurso no está en cache o ha expirado:

- La caché solicita a la API la IP del dominio de origen.
- Realiza la solicitud al servicio correspondiente.

La respuesta:

- Se envía al usuario.
- Se almacena en disco según las reglas configuradas (TTL y política de reemplazo).


## Algoritmos de reemplazo soportados

La Zonal Cache soporta los siguientes algoritmos, configurables desde Firebase por dominio:

- LRU (Least Recently Used)
- LFU (Least Frequently Used)
- FIFO (First-In First-Out)
- MRU (Most Recently Used)
- Random

## REST API Simple

API para gestionar una lista de nombres en memoria, utilizando los métodos HTTP principales.

### Endpoints

- GET /get_all  
  Retorna todos los nombres.

- POST /add_element  
  Agrega un nombre nuevo.  
  Cuerpo: { "nombre": "<nombre>" }

- PUT /update_element/:id
  Actualiza el nombre con el id especificado.  
  Cuerpo: { "nombre": "<nuevo_nombre>" }

- DELETE /delete_element/:id
  Elimina el nombre con el id dado.

La API usa Express y mantiene los datos en una lista en memoria.

## Apache Server

Componente servidor Apache que sirve una página HTML básica.  
Esta página funciona como prueba del proyecto, mostrando "Hello World from Apache".

## REST API Node.js

API en Node.js encargada de la comunicación con Firebase / Firestore para la UI y las caches zonales.

### Funciones principales

Proveer endpoints para crear, modificar, eliminar o consultar configuraciones relacionadas con:

- Dominios
- URLs
- Políticas de cache
- Tamaños máximos de cache
- TTL por tipo de archivo
- Autenticación

### Seguridad

Autenticación mediante API Keys. Cada cliente que realice llamadas a la API debe proporcionar su API Key válida para acceder a los endpoints.

## UI (Frontend)

La UI es una aplicación web desarrollada con:

- React
- Vite
- TailwindCSS
- Asistencia de IA generativa

Esta interfaz permite administrar dominios, URLs, políticas de cache y autenticación para las caches zonales.

---

## Funciones principales

### 1. Registro de usuario
- Crear cuentas nuevas.  
- Validación de dominio mediante registro TXT.

### 2. Administración de dominios
- Crear y eliminar dominios.  
- Verificación mediante registro TXT.  
- Gestión de metadatos asociados a cada dominio.

### 3. Administración de URLs
Para cada dominio registrado, permite:

- Crear, borrar y modificar URLs.  
- Soporte para wildcards.  
- Configuración por URL:
  - Tamaño máximo de cache.
  - Tipos de archivos permitidos (png, html, css, js, etc.).
  - TTL por tipo de archivo.
  - Política de reemplazo (LRU, LFU, FIFO, MRU, Random).

### 4. Mecanismos de autenticación
- API Key:
  - Crear y eliminar API Keys.  
- Usuario / Password:
  - Crear, modificar y eliminar usuarios.  
  - Asignar permisos a recursos cache.

### 5. Formulario de autenticación
- Utilizado por las caches zonales para validar usuarios y contraseñas.

### 6. Cerrar sesión
- Manejo de sesiones persistentes.  
- Destrucción del token o sesión activa.


# Pruebas Funcionales

## DNS Interceptor

Para verificar el correcto funcionamiento del DNS Interceptor, se utilizó `nslookup` como cliente de prueba.

En Firebase se encuentran registradas dos cachés zonales, ubicadas en Costa Rica y Brasil, como se muestra en las siguientes imágenes:

<div style="text-align: center;">
    <img src="images/cache_1.png" alt="Cache_1" width="65%">
</div>

<div style="text-align: center;">
    <img src="images/cache_2.png" alt="Cache_2" width="65%">
</div>

A continuación, se muestra la ubicación de la IP del usuario, que corresponde a Costa Rica:

<div style="text-align: center;">
    <img src="images/user_ip.png" alt="user_ip" width="65%">
</div>

En la siguiente imagen se observa cómo se realiza la consulta desde el usuario y el DNS Interceptor retorna la IP `10.1.3.207`, correspondiente a la caché zonal más cercana en Costa Rica, funcionando correctamente:

<div style="text-align: center;">
    <img src="images/nslookup.png" alt="nslookup" width="65%">
</div>


## Zonal Cache




# Conclusiones

# Recomendaciones


