#ifndef DNS_MANAGER_H
#define DNS_MANAGER_H
#include "common.h"


//////////////////////////////// Leer Paquete DNS /////////////////////////////////////

// --- Extrae el host DNS (QNAME) desde el buffer ---
int extract_host(const unsigned char *buffer, ssize_t len, char *out);

//////////////////////////////// Handle Paquetes /////////////////////////////////////

// --- Función que maneja los paquetes no standar (QR != 0 ó OPCODE != 0) ---
dns_response_t handle_non_query_standar(unsigned char dns_packet[BUFFER_SIZE], ssize_t len_dns);

// --- Función que maneja los paquetes standar (QR = 0 y OPCODE = 0) ---
dns_response_t handle_query_standar(unsigned char dns_packet[BUFFER_SIZE], ssize_t len_dns, char* ip_source);

unsigned char* build_dns_reply_buffer(unsigned char *query, size_t query_len,
                                      unsigned char *response, size_t response_len,
                                      size_t *out_len);
#endif