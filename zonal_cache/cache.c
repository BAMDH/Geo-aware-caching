#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <stdbool.h>
#include <ctype.h>
#include <time.h>
#include "cJSON.h"
#ifdef _WIN32
#include <direct.h>  // Windows
#else
#include <sys/stat.h> // Linux/Unix
#include <sys/types.h>
#endif

long size(){
    FILE *fp;
    long sz;

    // Abre el archivo en modo lectura binaria
    fp = fopen("Yui.jpg", "rb");  
    if (fp == NULL) {
        perror("Error al abrir el archivo");
        return 1;
    }


    fseek(fp, 0L, SEEK_END);
    sz = ftell(fp);
    printf("Tamaño del archivo: %ld bytes\n", sz);
    rewind(fp);
    fclose(fp);

    return 0;
}

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
bool set_config(const char *dominio, const char *size,  const char *type) {
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

int main() {
    srand(time(NULL));
    char dominio[100] = "www.hola.com";;

    //set_config(dominio,"120mb");
    //bool valor = is_enough_space(dominio,10);
    //bool valor = file_exists(dominio,"yui3.jpg");
    //bool valor = delete_file(dominio,"yui3.jpg");
    long tam;
    char *nombre ="Prueba3.jpg";
    char *contenido = leerArchivo(nombre, &tam);
   
    printf("Tamaño del archivo leído: %ld bytes\n", tam);
    //bool valor = true;
    bool valor = add_file(dominio,nombre,contenido,tam);
    if (valor) {
        printf("si\n");
    } else{
        printf("no\n");
    }
    free(contenido);

 //cJSON_DeleteItemFromArray(files, i);
//              return true; // encontrado y eliminado

}

