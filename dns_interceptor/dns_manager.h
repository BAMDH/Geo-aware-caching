#ifndef DNS_MANAGER_H
#define DNS_MANAGER_H
#include "common.h"

//////////////////////////////// Handle Paquetes /////////////////////////////////////

// --- Función que maneja los paquetes standar (QR = 0 y OPCODE = 0) ---
dns_response_t handle_dns(unsigned char dns_packet[BUFFER_SIZE], ssize_t len_dns, 
                                        char* ip_source);

unsigned char* build_dns(unsigned char *query, size_t query_len,
                                      const char *ip_str, size_t *out_len);
#endif