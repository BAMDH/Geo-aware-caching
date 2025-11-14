#include "common.h"
#include "api.h"
#include "server.h"

///////////////////////////////// Main ////////////////////////////////////////////

const char* cache_api_key;

const char* url_login_vercel;

const char* PORT;

const char* HOST_API; //"api-node-sv"

const char* PORT_API; // "3000"

// ================== Asignar pais, latitude y longitude =====================
void get_config(cache_config *config) {

    // Valor por defecto
    cache_config unknown = {"Desconocido", "", 0.0, 0.0};

    // Obtener nombre del pod desde variable de entorno
    char *pod_name = getenv("POD_NAME");
    int pod_index = -1;

    if (!pod_name) {
        // fallback
        strncpy(config->country, unknown.country, sizeof(config->country)-1);
        config->country[sizeof(config->country)-1] = '\0';
        config->latitude = unknown.latitude;
        config->longitude = unknown.longitude;
        strncpy(config->ip, unknown.ip, sizeof(config->ip)-1);
        config->ip[sizeof(config->ip)-1] = '\0';
        return;
    }

    // Extraer índice del pod (asumiendo formato health-checker-<n>)
    if (sscanf(pod_name, "zonal-cache-%d", &pod_index) != 1) {
        pod_index = 0; // fallback
    }

    // Lista de países con latitud y longitud
    cache_config paises[] = {
        {"Costa Rica", "", 10.0, -84.0},
        {"México", "", 23.6345, -102.5528},
        {"Colombia", "", 4.5709, -74.2973},
        {"Argentina", "", -38.4161, -63.6167}
    };

    int num_paises = sizeof(paises) / sizeof(paises[0]);

    // Seleccionar país basado en el índice del pod
    cache_config selected_country = paises[pod_index % num_paises];

    // Asignar al struct de salida
    strncpy(config->cache_name, pod_name, sizeof(config->cache_name)-1);
    config->cache_name[sizeof(config->cache_name)-1] = '\0';
    strncpy(config->country, selected_country.country, sizeof(config->country)-1);
    config->country[sizeof(config->country)-1] = '\0';
    config->latitude = selected_country.latitude;
    config->longitude = selected_country.longitude;

}

// ================== Get IP =====================


// Función que retorna la ip del pod
char* get_pod_ip() {

    int fd;
    struct ifreq ifr;
    static char ip[INET_ADDRSTRLEN];

    fd = socket(AF_INET, SOCK_DGRAM, 0);
    ifr.ifr_addr.sa_family = AF_INET;

    // Normalmente eth0 es la interfaz del pod
    strncpy(ifr.ifr_name, "eth0", IFNAMSIZ-1);
    ioctl(fd, SIOCGIFADDR, &ifr);
    close(fd);

    strcpy(ip, inet_ntoa(((struct sockaddr_in *)&ifr.ifr_addr)->sin_addr));
    return ip;
}

// ================== Registrarse y obtener registros ==================


// Función que registra la cache en firebase
void register_cache() {

    cache_config cache_cnf = {0};

    get_config(&cache_cnf);

    strncpy(cache_cnf.ip, get_pod_ip(), sizeof(cache_cnf.ip)-1);
    cache_cnf.ip[sizeof(cache_cnf.ip)-1] = '\0';

    params_t params = {0};
    params.cache = cache_cnf;

    char* response_api = call_api(&params, "cache/register");

    while (response_api == NULL) {
        sleep(2);
        response_api = call_api(&params, "cache/register");
    }
}

int main() {
    int sockfd;
    struct sockaddr_in server_addr, client_addr;
    socklen_t client_len = sizeof(client_addr);

    cache_api_key = getenv("SERVICE_API_KEY");
    url_login_vercel = getenv("URL_LOGIN_VERCEL");
    PORT = getenv("PORT");
    HOST_API = getenv("HOST_API");
    PORT_API = getenv("PORT_API");

    // Crear socket TCP
    if ((sockfd = socket(AF_INET, SOCK_STREAM, 0)) < 0) {
        perror("Error al crear socket");
        exit(EXIT_FAILURE);
    }

    // Configurar dirección del servidor
    memset(&server_addr, 0, sizeof(server_addr));
    server_addr.sin_family = AF_INET;
    server_addr.sin_addr.s_addr = INADDR_ANY;
    server_addr.sin_port = htons(atoi(PORT));

    if (bind(sockfd, (struct sockaddr*)&server_addr, sizeof(server_addr)) < 0) {
        perror("Error bind");
        close(sockfd);
        exit(EXIT_FAILURE);
    }

    if (listen(sockfd, 10) < 0) {
        perror("Error listen");
        close(sockfd);
        exit(EXIT_FAILURE);
    }

    
    //register_cache();

    printf("Servidor TCP escuchando en el puerto %d...\n", atoi(PORT));
    fflush(stdout);

    while (1) {
        int client_fd = accept(sockfd, (struct sockaddr*)&client_addr, &client_len);
        if (client_fd < 0) {
            perror("Error accept");
            continue;
        }

        // Crear estructura por conexión
        thread_arg_t *targ = malloc(sizeof(thread_arg_t));
        targ->client_fd = client_fd;
        targ->client_addr = client_addr;

        pthread_t tid;
        pthread_create(&tid, NULL, handle_client, targ);
        pthread_detach(tid);
    }


    close(sockfd);
    return 0;
}
