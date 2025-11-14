#ifndef CACHE_H
#define CACHE_H

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <ctype.h>
#include <sys/stat.h>
#include <time.h>
#include "cJSON.h"
#include <curl/curl.h>

#define MAX_DOMINIO 256
#define MAX_FILENAME 256

typedef struct {
    char dominio[MAX_DOMINIO];
    char filename[MAX_FILENAME];
    char *contenido;
    long size;
} ArchivoInfo;

// --- Conversiones ---
long convertir_a_bytes(const char *size);

// --- Configuración de cache ---
bool set_config(const char *dominio, const char *size, const char *type, const char *file_type);
cJSON *get_config_json(const char *dominio);
void save_config_json(const char *dominio, cJSON *root);
bool is_enough_space(const char *dominio, long file_size);
bool more_than_max(const char *dominio, long file_size);

// --- Operaciones sobre archivos ---
bool file_exists(const char *dominio, const char *filename);
bool delete_file(const char *dominio, const char *filename);
bool save_file(const char *dominio, const char *filename, const char *contenido, long size);
char *get_file_content(const char *dominio, const char *filename);
char *get_file(const char *dominio, const char *url);

// --- Funciones de cache ---
bool add_file(const char *dominio, const char *filename, const char *contenido, long size);
void remove_file(const char *dominio);

// --- Funciones de selección ---
cJSON* get_random(cJSON *files, int total_files, int *index);
cJSON* FIFO(cJSON *files, int *index);
cJSON* LRU(cJSON *files, int total_files, int *index);
cJSON* LFU(cJSON *files, int total_files, int *index);
cJSON* MRU(cJSON *files, int total_files, int *index);

// --- Descarga de archivos ---
ArchivoInfo *get_file_from_url(const char *dominio, const char *url);

// --- Utilidades ---
time_t parse_fecha(const char *fecha);
char* leerArchivo(const char *ruta, long *tam);

#endif // CACHE_H
