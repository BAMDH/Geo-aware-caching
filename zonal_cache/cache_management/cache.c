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

// Crea la configuracion inicial del dominio
bool set_subconfig(const char *dominio, const char *subdominio, const char *size,  const char *type, char **file_types, int ftsize,const char *ip) {
    size_t len_total = strlen(dominio) + strlen(subdominio) + 2;
    char *path = malloc(len_total);

    snprintf(path, len_total, "%s.%s", subdominio,dominio);
    mkdir(path, 0755);

    cJSON *root = cJSON_CreateObject();
   
    //config anterior
    
    cJSON *prev_root = get_config_json(path);
    cJSON *prev_files = NULL;
    int prev_used = 0;
    const char *prev_type_str = NULL;
    bool same_type = false;
    if (prev_root) {
        cJSON *used_item = cJSON_GetObjectItem(prev_root, "used");
        prev_used = used_item->valueint;
        prev_files = cJSON_GetObjectItem(prev_root, "files");
        cJSON *prev_type = cJSON_GetObjectItem(prev_root, "type");
        prev_type_str = prev_type->valuestring;
         if (strcmp(prev_type_str, type) == 0) {
            same_type = true;
        }
    }
   


    cJSON_AddNumberToObject(root, "total_size", convertir_a_bytes(size));
    cJSON_AddStringToObject(root, "type", type);
    cJSON_AddStringToObject(root, "ip", ip);  
    cJSON *ftarray = cJSON_CreateArray();
    for (int i = 0; i < ftsize; i++) {
        cJSON_AddItemToArray(ftarray, cJSON_CreateString(file_types[i]));
    }
    cJSON_AddItemToObject(root, "file_types", ftarray);
    if (same_type) {
            cJSON_AddNumberToObject(root, "used", prev_used);
            cJSON_AddItemToObject(root, "files", cJSON_Duplicate(prev_files, 1));
    } 
    else {
            cJSON_AddNumberToObject(root, "used", 0);
            cJSON_AddItemToObject(root, "files", cJSON_CreateArray());
        }

    save_config_json(path, root);
    

    // Liberar memoria

    cJSON_Delete(root);
    free(path);
    return true;
}

//recibe todos los subdominios
bool set_config(const char *json_str) {
    cJSON *root = cJSON_Parse(json_str);
    cJSON *domain = cJSON_GetObjectItem(root, "domain");
    cJSON *urls = cJSON_GetObjectItem(root, "urls");
    int url_count = cJSON_GetArraySize(urls);
    for (int i = 0; i < url_count; i++) {

        cJSON *urlObj = cJSON_GetArrayItem(urls, i);
        cJSON *cacheSize = cJSON_GetObjectItem(urlObj, "cacheSize");
        cJSON *fileTypes = cJSON_GetObjectItem(urlObj, "fileTypes");
        cJSON *ip = cJSON_GetObjectItem(urlObj, "ip");
        cJSON *replacementPolicy = cJSON_GetObjectItem(urlObj, "replacementPolicy");
        cJSON *url = cJSON_GetObjectItem(urlObj, "url");

        int size = cJSON_GetArraySize(fileTypes);
        char **fileTypesArray = malloc(sizeof(char*) * size);
        for (int i = 0; i < size; i++) {
            cJSON *ft = cJSON_GetArrayItem(fileTypes, i);
            if (cJSON_IsString(ft)) {
                fileTypesArray[i] = strdup(ft->valuestring);
            }
        }
        set_subconfig(domain->valuestring,url->valuestring,cacheSize->valuestring,replacementPolicy->valuestring,fileTypesArray,size,ip->valuestring);
        for (int i = 0; i < size; i++) free(fileTypesArray[i]);
        free(fileTypesArray);
    }
    cJSON_Delete(root);
    return true;
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
    cJSON *type = cJSON_GetObjectItem(root, "type");
    char *aux =type->valuestring;
    for (int i = 0; i < count; i++) {
        cJSON *sub = cJSON_GetArrayItem(files, i); 
            cJSON *name= cJSON_GetArrayItem(sub, 0);
            if (strcmp(name->valuestring, filename) == 0) {
                found = true;
                if ((strcmp(aux, "LRU") == 0)||(strcmp(aux, "MRU") == 0)){
                    time_t now = time(NULL); 
                    char buffer[64];
                    struct tm *t = localtime(&now);
                    strftime(buffer, sizeof(buffer), "%Y-%m-%d %H:%M:%S", t);
                    cJSON_ReplaceItemInArray(sub, 2, cJSON_CreateString(buffer));
                }
                else if (strcmp(aux, "LFU") == 0){
                    cJSON *aux2= cJSON_GetArrayItem(sub, 2);
                    cJSON_ReplaceItemInArray(sub, 2,  cJSON_CreateNumber(aux2->valueint+1));
                }
                break;
            }  
    }
    save_config_json(dominio, root);
    cJSON_Delete(root);
    return found;
}

// confirma si el archivo es compatible
bool compatibility(const char *dominio, const char *filename) {
    cJSON *root = get_config_json(dominio);
    cJSON *file_types = cJSON_GetObjectItem(root, "file_types");
    bool found = false;
    const char *extension = strrchr(filename, '.');
    char suposicion[6];
    //si no tiene extension se supone que es html
    if (!extension || *(extension+1) == '\0') {
        strcpy(suposicion, "html");
        extension = suposicion;
    } else {
        extension++; 
    }
    int count = cJSON_GetArraySize(file_types);
    for (int i = 0; i < count; i++) {
        cJSON *ft = cJSON_GetArrayItem(file_types, i);
        if (cJSON_IsString(ft) && strcmp(ft->valuestring, extension) == 0) {
            found = true;
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

//obtiene el archivo del enlace
ArchivoInfo *get_file_from_url(const char *filename, const char *filepath, const char *ip,const char *domain,const char *subdomain) {
    CURL *curl;
    CURLcode res;

    ArchivoInfo *info = calloc(1, sizeof(ArchivoInfo));
    if (!info) return NULL;
    strncpy(info->filename, filename, sizeof(info->filename) - 1);

    info->contenido = NULL;
    info->size = 0;

    curl = curl_easy_init();
    if(!curl) return NULL;
    if (strncmp(ip, "10.1.1", 6) == 0 ) {

        char url3[256];
        snprintf(url3, sizeof(url3), "http://%s:80",ip);
        

        curl_easy_setopt(curl, CURLOPT_URL, url3);
    } else {
        char url2[256];
        snprintf(url2, sizeof(url2), "https://%s.%s%s",subdomain, domain,filepath);
        printf("URL construida: %s\n", url2);

        curl_easy_setopt(curl, CURLOPT_URL, url2);
    }

    curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 1L);
    curl_easy_setopt(curl, CURLOPT_SSL_VERIFYHOST, 2L);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_callback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, (void *)info);
    curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);
    curl_easy_setopt(curl, CURLOPT_USERAGENT, "libcurl-agent/1.0");


    res = curl_easy_perform(curl);
    if(res != CURLE_OK) {
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

//devuelve ip
char *get_ip(const char *dominio) {
    cJSON *root = get_config_json(dominio);
    if (!root) return NULL;

    cJSON *ip_field = cJSON_GetObjectItem(root, "ip");
    char *ip_copy = NULL;
    ip_copy = strdup(ip_field->valuestring); 


    cJSON_Delete(root);

    return ip_copy;  // ← devuelve la IP o NULL
}


//devuelve el archivo pedido
char *get_file(const char * dominio,const char * subdominio,const char *url){
    srand(time(NULL));
    size_t len_total = strlen(dominio) + strlen(subdominio) + 2;
    char *path = malloc(len_total);
    snprintf(path, len_total, "%s.%s", subdominio,dominio);
    const char *ip = get_ip(path);
    char *content ="";
    const char *filename = strrchr(url, '/');
    filename++;
    if ((strcmp(filename, dominio) == 0)||(strcmp(filename, path) == 0)||strcmp(filename, "") == 0){
        filename = "index.html";
    }
    bool comp = compatibility(path, filename);
    if (!comp || !file_exists(path,filename)){
        ArchivoInfo *info = get_file_from_url(filename, url,ip,dominio,subdominio);
        if(comp){
            add_file(path, info->filename, info->contenido, info->size); 
        } else{
            content = malloc(info->size + 1);
            memcpy(content, info->contenido, info->size);
            content[info->size] = '\0';
    
        }
        
        free(info->contenido);
        free(info); 
    }
    if(comp){
        content = get_file_content(path,filename);
    }
    //content =base64_encode((const unsigned char *)content, strlen(content)):
    free(path);
    return content;
}