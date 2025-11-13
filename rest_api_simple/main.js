const express = require('express');
const app = express();

// Tomar el puerto desde la variable de entorno PORT, o usar 3050 por defecto
const port = process.env.PORT || 3050;

// Middleware para leer JSON
app.use(express.json());

// Datos simulados (en memoria)
let nombres = [
  { id: 1, nombre: "Kendall" },
  { id: 2, nombre: "Joselyn" },
];

// GET - Obtener todos los nombres
app.get('/get_all', (req, res) => {
  res.json(nombres);
});

// POST - Agregar un nuevo nombre
app.post('/add_element', (req, res) => {
  const nuevo = {
    id: nombres.length ? nombres[nombres.length - 1].id + 1 : 1,
    nombre: req.body.nombre,
  };
  nombres.push(nuevo);
  res.status(201).json(nuevo);
});

// PUT - Actualizar un nombre existente
app.put('/update_element/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = nombres.findIndex(n => n.id === id);
  if (index === -1) {
    return res.status(404).json({ message: 'Nombre no encontrado' });
  }
  nombres[index].nombre = req.body.nombre;
  res.json(nombres[index]);
});

// DELETE - Eliminar un nombre
app.delete('/delete_element/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = nombres.findIndex(n => n.id === id);
  if (index === -1) {
    return res.status(404).json({ message: 'Nombre no encontrado' });
  }
  const eliminado = nombres.splice(index, 1);
  res.json(eliminado[0]);
});

// Servidor escuchando
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
