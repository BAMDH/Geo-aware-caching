import socket
from dnslib import DNSRecord, QTYPE

server = ("127.0.0.1", 53)


def build_estandar(domain: str):
    query = b'\xaa\xaa'      # ID
    query += b'\x01\x00'     # Flags: QR=0, OPCODE=0 → consulta estándar
    query += b'\x00\x01'     # Preguntas: 1
    query += b'\x00\x00'     # Respuestas: 0
    query += b'\x00\x00'     # Authority RR: 0
    query += b'\x00\x00'     # Additional RR: 0

    for part in domain.split('.'):
        query += bytes([len(part)]) + part.encode()
    query += b'\x00'         # fin del nombre
    query += b'\x00\x01'     # Tipo A
    query += b'\x00\x01'     # Clase IN

    return query

def parse_response(data):
    # Header de 12 bytes
    offset = 12

    # Saltar la pregunta (nombre codificado)
    while data[offset] != 0:
        offset += data[offset] + 1
    offset += 5  # null byte + tipo(2) + clase(2)

    # Ahora estamos al inicio de la sección de respuestas
    # Saltar nombre de la respuesta (puede ser puntero)
    if data[offset] & 0xC0 == 0xC0:  # puntero
        offset += 2
    else:
        while data[offset] != 0:
            offset += data[offset] + 1
        offset += 1

    # Tipo(2) + Clase(2) + TTL(4)
    offset += 8
    # RDLENGTH (2 bytes)
    rdlength = int.from_bytes(data[offset:offset+2], "big")
    offset += 2

    # RDATA
    rdata = data[offset:offset+rdlength]
    ip = ".".join(str(b) for b in rdata)
    return ip


sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.settimeout(2)


def build_no_estandar(domain: str):
    query = b'\xaa\xaa'      # ID arbitraria
    query += b'\x09\x00'     # Flags: QR=0 (consulta), OPCODE=1 (inverse)
    query += b'\x00\x01'     # QDCOUNT: 1 pregunta
    query += b'\x00\x00'     # ANCOUNT: 0 respuestas
    query += b'\x00\x00'     # NSCOUNT: 0
    query += b'\x00\x00'     # ARCOUNT: 0

    # Codificar el nombre del dominio
    for part in domain.split('.'):
        query += bytes([len(part)]) + part.encode()
    query += b'\x00'         # fin del nombre
    query += b'\x00\x01'     # QTYPE = A
    query += b'\x00\x01'     # QCLASS = IN

    return query

domain = "www.youtube.com"
query = build_no_estandar(domain)
sock.sendto(query, server)

try:
    respuesta_bytes, _ = sock.recvfrom(512)
    # --------- Parsear DNS para mostrar IP ---------
    dns_resp = DNSRecord.parse(respuesta_bytes)
    print(dns_resp)
    for rr in dns_resp.rr:
        print(rr.rname, rr.rtype, rr.rdata)
except socket.timeout:
    print("⏳ No hubo respuesta (timeout)")

sock.close()
