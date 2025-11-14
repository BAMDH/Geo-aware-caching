#include "cache.h"

//convierte mb y kb a bytes
long convertir_a_bytes(const char *size) {
    if (!size) return -1;

    char unidad[3] = {0};
    double valor = 0;

    // Obtener terminacion
    int ter = sscanf(size, "%lf%2s", &valor, unidad);
    if (ter < 1) return -1; 

    // trabajar con minusculas
    for (int i = 0; unidad[i]; i++) unidad[i] = tolower(unidad[i]);

    // Conversion
    if (strcmp(unidad, "b") == 0 || unidad[0] == '\0')
        return (long)valor;
    else if (strcmp(unidad, "kb") == 0)
        return (long)(valor * 1024);
    else if (strcmp(unidad, "mb") == 0)
        return (long)(valor * 1024 * 1024);
    else
        return -1; 
}

// Crea la configuracion inicial del dominio
bool set_config(const char *dominio, const char *size,  const char *type, const char *file_type) {
    char path[512];

    // Crear ruta de carpeta igual al dominio
    snprintf(path, sizeof(path), "%s", dominio);
#ifdef _WIN32
    _mkdir(path);
#else
        mkdir(path, 0755);
#endif
    cJSON *root = cJSON_CreateObject();
    if (!root) return false;

    cJSON_AddNumberToObject(root, "total_size", convertir_a_bytes(size));
    cJSON_AddNumberToObject(root, "used", 0);  
    cJSON_AddStringToObject(root, "type", type); 
    cJSON *files = cJSON_CreateArray();     
    cJSON_AddItemToObject(root, "files", files);

    char *json_str = cJSON_Print(root);
    if (!json_str) {
        cJSON_Delete(root);
        return false;
    }

    // guardar en disco
    char archivo[1024];
    snprintf(archivo, sizeof(archivo), "%s/config.json", path);

    FILE *fp = fopen(archivo, "w");
    if (!fp) {
        perror("Error al crear archivo JSON");
        free(json_str);
        cJSON_Delete(root);
        return false;
    }

    fprintf(fp, "%s\n", json_str);
    fclose(fp);

    // Liberar memoria
    free(json_str);
    cJSON_Delete(root);

    return true;
}

// Obtiene el json de configuracion
cJSON *get_config_json(const char *dominio) {
    char path[512];
    snprintf(path, sizeof(path), "%s/config.json", dominio);

    FILE *fp = fopen(path, "rb");
    if (!fp) {
        perror("Error al abrir config.json");
        return NULL;
    }

    fseek(fp, 0, SEEK_END);
    long size = ftell(fp);
    rewind(fp);

    char *data = (char *)malloc(size + 1);
    if (!data) {
        fclose(fp);
        return NULL;
    }

    fread(data, 1, size, fp);
    data[size] = '\0';
    fclose(fp);

    cJSON *root = cJSON_Parse(data);
    free(data);

    if (!root) {
        printf("Error al parsear JSON: %s\n", cJSON_GetErrorPtr());
        return NULL;
    }

    return root;
}

//guarda cambios en la configuracion
void save_config_json(const char *dominio, cJSON *root) {
    char path[512];
    snprintf(path, sizeof(path), "%s/config.json", dominio);

    FILE *fp = fopen(path, "w");
    if (!fp) {
        perror("Error al guardar JSON");
        return;
    }

    char *string = cJSON_Print(root);
    fputs(string, fp);
    fclose(fp);
    free(string);
}

// Confirma que haya suficiente espacio
bool is_enough_space(const char *dominio, long file_size) {
    cJSON *root = get_config_json(dominio);
    cJSON *aux_total_size = cJSON_GetObjectItem(root, "total_size");
    cJSON *aux_used = cJSON_GetObjectItem(root, "used");
    long total_size = aux_total_size->valuedouble;
    long used = aux_used->valuedouble;
    bool valor= false;
    if(used+file_size<=total_size){
        valor = true;
    }
    cJSON_Delete(root);

    return valor;
}

// Confirma que no sea mayor al espacio asignado
bool more_than_max(const char *dominio, long file_size) {
    cJSON *root = get_config_json(dominio);
    cJSON *aux_total_size = cJSON_GetObjectItem(root, "total_size");
    long total_size = aux_total_size->valuedouble;
    bool valor= true;
    if(file_size<=total_size){
        valor = false;
    }
    cJSON_Delete(root);
    return valor;
}

// confirma que un archivo exista
bool file_exists(const char *dominio, const char *filename) {
    cJSON *root = get_config_json(dominio);
    cJSON *files = cJSON_GetObjectItem(root, "files");
    bool found = false;
    int count = cJSON_GetArraySize(files);
    for (int i = 0; i < count; i++) {
        cJSON *sub = cJSON_GetArrayItem(files, i); 
            cJSON *name= cJSON_GetArrayItem(sub, 0);
            if (strcmp(name->valuestring, filename) == 0) {
                found = true;
                break;
            }  
    }
    cJSON_Delete(root);
    return found;
}

// borra archivo en disco
bool delete_file(const char *dominio,const char *filename){
    char path[512];
    snprintf(path, sizeof(path), "%s/%s", dominio,filename);
    printf("Ruta: %s\n", path);
    if (remove(path) == 0) {
        return true;
    } else {
        perror("Error al eliminar el archivo");
        return false;
    }
}

//solo pruebas
char* leerArchivo(const char *ruta, long *tam) {
    FILE *fp = fopen(ruta, "rb");
    if (!fp) {
        perror("Error al abrir archivo origen");
        return NULL;
    }

    // Obtener tamaño del archivo
    fseek(fp, 0, SEEK_END);
    *tam = ftell(fp);
    rewind(fp);

    // Reservar memoria para el contenido
    char *buffer = malloc(*tam);
    if (!buffer) {
        perror("Error al reservar memoria");
        fclose(fp);
        return NULL;
    }

    // Leer todo el contenido
    fread(buffer, 1, *tam, fp);
    fclose(fp);

    return buffer;
}

// guarda el archivo en disco
bool save_file(const char *dominio, const char *filename, const char *contenido, long size){
    char path[512];
    snprintf(path, sizeof(path), "%s/%s", dominio,filename);
    FILE *fp = fopen(path, "wb");
    if (!fp) {
        perror("Error al crear archivo");
        return false;
    }
    fwrite(contenido, 1, size, fp);
    fclose(fp);

    cJSON *root = get_config_json(dominio);
    cJSON *files = cJSON_GetObjectItem(root, "files");
    cJSON *new_file = cJSON_CreateArray();
    cJSON_AddItemToArray(new_file, cJSON_CreateString(filename));
    cJSON_AddItemToArray(new_file, cJSON_CreateNumber(size));
    cJSON *type = cJSON_GetObjectItem(root, "type");
    char *aux =type->valuestring;
    if ((strcmp(aux, "LRU") == 0)||(strcmp(aux, "MRU") == 0)){
        time_t now = time(NULL); 
        char buffer[64];
        struct tm *t = localtime(&now);
        strftime(buffer, sizeof(buffer), "%Y-%m-%d %H:%M:%S", t);
        cJSON_AddItemToArray(new_file, cJSON_CreateString(buffer));
    }
    else if (strcmp(aux, "LFU") == 0){
        cJSON_AddItemToArray(new_file, cJSON_CreateNumber(0));
    }
    cJSON_AddItemToArray(files, new_file);
    cJSON *used = cJSON_GetObjectItem(root, "used");
    used->valuedouble = (long)used->valuedouble + size;
    save_config_json(dominio, root);
    cJSON_Delete(root);
    return true;
}

// Convierte string "YYYY-MM-DD HH:MM:SS" a time_t
time_t parse_fecha(const char *fecha) {
    struct tm t = {0};
     int year, month, day, hour, min, sec;

    if (sscanf(fecha, "%d-%d-%d %d:%d:%d",
               &year, &month, &day, &hour, &min, &sec) != 6) {
        return (time_t)-1; // parsing error
    }
    t.tm_year = year - 1900;
    t.tm_mon  = month - 1;
    t.tm_mday = day;
    t.tm_hour = hour;
    t.tm_min  = min;
    t.tm_sec  = sec;

    return mktime(&t);
}


// escoge uno random
cJSON* get_random(cJSON *files, int total_files,  int *index) {
    *index = rand() % total_files;  
    return cJSON_GetArrayItem(files, *index);
}

// escoge el primero en haber entrado
cJSON* FIFO(cJSON *files, int *index) {
    *index = 0;
    return cJSON_GetArrayItem(files, *index);
}

// escoge el que no ha sido usado por mayor tiempo
cJSON* LRU(cJSON *files, int total_files, int *index) {
    time_t oldest = (time_t)-1;
    *index = -1;
    for (int i = 0; i < total_files; i++) {
        cJSON *file = cJSON_GetArrayItem(files, i);
        cJSON *fechaItem = cJSON_GetArrayItem(file, 2);
        time_t timestamp = parse_fecha(fechaItem->valuestring);
        if (*index == -1 || timestamp < oldest) {
            oldest = timestamp;
            *index = i;
        }
    }
    return cJSON_GetArrayItem(files, *index);
}

// escoge el que menas veces haya sido usado, el primer 0 que encuentre sera devuelto siempre
cJSON* LFU(cJSON *files, int total_files, int *index) {
    int menor;
    *index = -1;
    for (int i = 0; i < total_files; i++) {
        cJSON *file = cJSON_GetArrayItem(files, i);
        cJSON *file_use = cJSON_GetArrayItem(file, 2);
        int usos = (int)file_use->valuedouble;
        
        if (*index == -1 || usos < menor) {
            menor = usos;
            *index = i;
            if (menor == 0){
                break;
            }
        }
    }
    return cJSON_GetArrayItem(files, *index);
}


// escoge el que usado mas recientemente
cJSON* MRU(cJSON *files, int total_files, int *index) {
    time_t newer = (time_t)-1;
    *index = -1;
    for (int i = 0; i < total_files; i++) {
        cJSON *file = cJSON_GetArrayItem(files, i);
        cJSON *fechaItem = cJSON_GetArrayItem(file, 2);
        time_t timestamp = parse_fecha(fechaItem->valuestring);
        if (*index == -1 || timestamp > newer) {
            newer = timestamp;
            *index = i;
        }
    }
    return cJSON_GetArrayItem(files, *index);
}

//elimina un archivo
void remove_file(const char *dominio){
    cJSON *root = get_config_json(dominio);
    cJSON *files = cJSON_GetObjectItem(root, "files");
    int total_files = cJSON_GetArraySize(files);
    int index;
    cJSON *file;
    char *tipo;
    cJSON *type = cJSON_GetObjectItem(root, "type");
    char *aux =type->valuestring;
    if (strcmp(aux, "LRU") == 0){
        file = LRU(files, total_files, &index);
        tipo = "LRU";
    } else if (strcmp(aux, "MRU") == 0){
        file = MRU(files, total_files, &index);
        tipo = "MRU";
    }
    else if (strcmp(aux, "LFU") == 0){
        file = LFU(files, total_files, &index);
        tipo = "LFU";
    }
    else if (strcmp(aux, "FIFO") == 0){
       file = FIFO(files, &index);
       tipo = "FIFO";
    }else{
        file = get_random(files, total_files, &index);
        tipo = "Random";
    }
   

    const char *filename = cJSON_GetArrayItem(file, 0)->valuestring;
    long size = (long)cJSON_GetArrayItem(file, 1)->valuedouble;
    
    delete_file(dominio,filename);
    printf("Eliminando archivo %s: %s peso %ld \n",tipo, filename, size);
    cJSON *used = cJSON_GetObjectItem(root, "used");
    used->valuedouble = (long)used->valuedouble - (long)size;
    cJSON_DeleteItemFromArray(files, index);
    save_config_json(dominio, root);
    cJSON_Delete(root);
    
}

// agrega un archivo que no esta en cache
bool add_file(const char *dominio, const char *filename, const char *contenido, long size){
    if (more_than_max(dominio,size)){
        return false;
    }
    while (!is_enough_space(dominio,size)){
        remove_file(dominio);
    }
    save_file(dominio,filename,contenido,size);
    return true;

}





// escribe el struct info
static size_t write_callback(void *contents, size_t size, size_t nmemb, void *userp) {
    size_t total_size = size * nmemb;
    ArchivoInfo *info = (ArchivoInfo *)userp;

    char *ptr = realloc(info->contenido, info->size + total_size + 1);
    if (!ptr) {
        fprintf(stderr, "Error: sin memoria al descargar.\n");
        return 0;
    }

    info->contenido = ptr;
    memcpy(&(info->contenido[info->size]), contents, total_size);
    info->size += total_size;
    info->contenido[info->size] = '\0';

    return total_size;
}


ArchivoInfo *get_file_from_url(const char *dominio, const char *url) {
    CURL *curl;
    CURLcode res;

    ArchivoInfo *info = calloc(1, sizeof(ArchivoInfo));
    if (!info) return NULL;

    strncpy(info->dominio, dominio, sizeof(info->dominio) - 1);
    const char *filename = strrchr(url, '/');
    if (filename) filename++;
    printf("URL: %-30s → filename: %s\n", url, filename);
    if (strcmp(filename, dominio) == 0)
        filename = "index.html";
    printf("URL: %-30s → filename: %s\n", url, filename);
    strncpy(info->filename, filename, sizeof(info->filename) - 1);

    info->contenido = NULL;
    info->size = 0;

    curl = curl_easy_init();
    if (!curl) {
        fprintf(stderr, "Error inicializando libcurl.\n");
        free(info);
        return NULL;
    }

    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_callback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, (void *)info);
    curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L); 
    curl_easy_setopt(curl, CURLOPT_USERAGENT, "libcurl-agent/1.0");

    res = curl_easy_perform(curl);
    if (res != CURLE_OK) {
        fprintf(stderr, "Error al descargar: %s\n", curl_easy_strerror(res));
        curl_easy_cleanup(curl);
        free(info->contenido);
        free(info);
        return NULL;
    }

    curl_easy_cleanup(curl);
    return info;
}

//obtiene el contenido
char *get_file_content(const char *dominio, const char *filename) {
    char path[512];
    snprintf(path, sizeof(path), "%s/%s", dominio, filename); 

    FILE *fp = fopen(path, "rb");
    if (!fp) {
        perror("Error al abrir archivo");
        return NULL;
    }
    fseek(fp, 0, SEEK_END);
    long size = ftell(fp);
    rewind(fp);
    char *buffer = malloc(size);
    if (!buffer) {
        perror("Error al reservar memoria");
        fclose(fp);
        return NULL;
    }

    size_t leidos = fread(buffer, 1, size, fp);
    fclose(fp);

    if (leidos != size) {
        fprintf(stderr, "Advertencia: tamaño leído (%zu) != esperado (%ld)\n", leidos, size);
    }

    return buffer;
}


//devuelve el archivo pedido
char *get_file(const char * dominio,const char *url){
     
    const char *filename = strrchr(url, '/');
    if (filename) filename++;
       printf("URL: %-30s → filename: %s\n", url, filename);
    if (strcmp(filename, dominio) == 0)
        filename = "index.html";
       printf("URL: %-30s → filename: %s\n", url, filename);
    if (!file_exists(dominio,filename)){
        ArchivoInfo *info = get_file_from_url(dominio, url);
        if (!info) {
            fprintf(stderr, "Error: no se pudo obtener el archivo desde la URL.\n");
            return NULL;
        }
        bool done = add_file(dominio, info->filename, info->contenido, info->size); 
        if (!done){
            return NULL;
        } 
        free(info->contenido);
        free(info); 
    }

    char *content = get_file_content(dominio,filename);
    content =base64_encode((const unsigned char *)content, strlen(content));
    return content;
}
/*


#define PORT 8080
#define BUFFER_SIZE 1024

int main() {
    int sockfd;
    struct sockaddr_in server_addr, client_addr;
    char buffer[BUFFER_SIZE];
    socklen_t addr_len = sizeof(client_addr);

    // Crear socket UDP
    if ((sockfd = socket(AF_INET, SOCK_DGRAM, 0)) < 0) {
        perror("Error creando socket");
        exit(EXIT_FAILURE);
    }

    server_addr.sin_family = AF_INET;
    server_addr.sin_addr.s_addr = INADDR_ANY;
    server_addr.sin_port = htons(PORT);

    if (bind(sockfd, (const struct sockaddr *)&server_addr, sizeof(server_addr)) < 0) {
        perror("Error en bind");
        close(sockfd);
        exit(EXIT_FAILURE);
    }

    printf("Servidor UDP escuchando en puerto %d...\n", PORT);

    while (1) {
        memset(buffer, 0, BUFFER_SIZE);
        recvfrom(sockfd, buffer, BUFFER_SIZE, 0,
                 (struct sockaddr *)&client_addr, &addr_len);

        // buffer contiene "dominio url"
        char dominio[256], url[512];
        if (sscanf(buffer, "%255s %511s", dominio, url) != 2) {
            const char *err = "Formato incorrecto. Use: <dominio> <url>";
            sendto(sockfd, err, strlen(err), 0,
                   (struct sockaddr *)&client_addr, addr_len);
            continue;
        }

        printf("Dominio: %s\n", dominio);
        printf("URL: %s\n", url);

        // 🔹 Llamar a tu función
        char *contenido = get_file(dominio, url);

        if (contenido == NULL) {
            const char *err = "Error: no se pudo obtener el archivo.";
            sendto(sockfd, err, strlen(err), 0,
                   (struct sockaddr *)&client_addr, addr_len);
        } else {
            // 🔹 Enviar el contenido real
            sendto(sockfd, contenido, strlen(contenido), 0,
                   (struct sockaddr *)&client_addr, addr_len);
            free(contenido); // si get_file malloc() el buffer
        }
    }

    close(sockfd);
    return 0;
}


/*
int main() {
    srand(time(NULL));
    //char dominio[] = "www.vndb.org";
    //const char *url2= "https://www.vndb.org"; 
    // crear config si no existe
    // set_config(dominio, "120mb", "LRU");
    int sockfd;
    struct sockaddr_in server_addr, client_addr;
    char buffer[1024];
    socklen_t addr_len = sizeof(client_addr);

    // Crear socket UDP
    sockfd = socket(AF_INET, SOCK_DGRAM, 0);
    if (sockfd < 0) {
        perror("Error creando socket");
        exit(EXIT_FAILURE);
    }

    server_addr.sin_family = AF_INET;
    server_addr.sin_addr.s_addr = INADDR_ANY;
    server_addr.sin_port = htons(9090);

    // Enlazar el socket
    if (bind(sockfd, (struct sockaddr *)&server_addr, sizeof(server_addr)) < 0) {
        perror("Error en bind");
        close(sockfd);
        exit(EXIT_FAILURE);
    }

    printf("Servidor UDP escuchando en puerto 9090...\n");

    while (1) {
        ssize_t len = recvfrom(sockfd, buffer, sizeof(buffer) - 1, 0,
                               (struct sockaddr *)&client_addr, &addr_len);
        if (len < 0) {
            perror("Error en recvfrom");
            continue;
        }

        buffer[len] = '\0';
        printf("Recibido: %s\n", buffer);

        const char *filename = get_filename_from_url(buffer);
        printf("→ Filename: %s\n", filename);

        sendto(sockfd, filename, strlen(filename), 0,
               (struct sockaddr *)&client_addr, addr_len);
    }

    close(sockfd);
    return 0;
   
    
    const char *file=get_file(dominio,url2);
    if (!file) {
        printf("No se pudo leer el archivo.\n");
        return 1;
    }else {
        printf("Archivo encontrado o descargado.\n");
    }
    
    return 0;


    //set_config(dominio,"120mb","LRU");
    //bool valor = is_enough_space(dominio,10);
    //bool valor = file_exists(dominio,"yui3.jpg");
    //bool valor = delete_file(dominio,"yui3.jpg");
   // long tam;
   // char *nombre ="Prueba3.jpg";
   // char *contenido = leerArchivo(nombre, &tam);
   
    //printf("Tamaño del archivo leído: %ld bytes\n", tam);
    //bool valor = true;
    //bool valor = add_file(dominio,nombre,contenido,tam);
    //if (valor) {
    //    printf("si\n");
    //} else{
    //    printf("no\n");
    //}
    //free(contenido);

 //cJSON_DeleteItemFromArray(files, i);
//              return true; // encontrado y eliminado

}*/
